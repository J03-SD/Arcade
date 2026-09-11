import { getAudioContext, getMasterGain } from "./audio";
import { loadProgress } from "./progress";

/** Always plays first each session. */
const THEME_OPENER = "/audio/8-bit-era.mp3";

const THEME_TRACKS = [
  THEME_OPENER,
  "/audio/best-game-console.mp3",
  "/audio/fun-with-8-bit.mp3",
  "/audio/love-8-bit-console.mp3",
  "/audio/arcade-beat.mp3",
  "/audio/game-8-bit-on.mp3",
] as const;

const THEME_VOLUME = 0.066;
const INTRO_VOLUME = 0.2;
const CROSSFADE_SEC = 10;
/** Drop samples quieter than this when trimming decoded buffers. */
const SILENCE_THRESHOLD = 0.012;

type Voice = {
  source: AudioBufferSourceNode;
  gain: GainNode;
  src: string;
  /** AudioContext time when this buffer began (offset 0 of the voice). */
  startedAt: number;
  /** Seconds into the buffer where playback began. */
  offset: number;
  duration: number;
};

let musicBus: GainNode | null = null;
let bedGain: GainNode | null = null;
let armed = false;
let startedOnce = false;
let watching = false;
let crossfading = false;
let current: Voice | null = null;
let currentSrc = THEME_OPENER;
let bag: string[] = [];
let targetVolume = THEME_VOLUME;
let switchTimer = 0;
let volumeFadeTimer = 0;
let pauseOffset: number | null = null;
const buffers = new Map<string, AudioBuffer>();
const loading = new Map<string, Promise<AudioBuffer>>();

function muted() {
  return loadProgress().muted;
}

function hidden() {
  return typeof document !== "undefined" && document.hidden;
}

function absoluteSrc(src: string) {
  if (typeof window === "undefined") return src;
  return new URL(src, window.location.origin).href;
}

function ensureGraph() {
  const ctx = getAudioContext();
  const master = getMasterGain();
  if (!ctx || !master) return null;
  if (!musicBus || !bedGain) {
    musicBus = ctx.createGain();
    bedGain = ctx.createGain();
    bedGain.gain.value = 0;
    musicBus.connect(bedGain);
    bedGain.connect(master);
  }
  return ctx;
}

async function resumeContext() {
  const ctx = ensureGraph();
  if (!ctx) return null;
  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      /* gesture may still be required */
    }
  }
  return ctx;
}

function refillBag(exclude: string) {
  const pool = THEME_TRACKS.filter((src) => src !== exclude);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = pool[i]!;
    pool[i] = pool[j]!;
    pool[j] = a;
  }
  bag = pool;
}

function peekNextTrack() {
  if (bag.length === 0) refillBag(currentSrc);
  return bag[0] ?? THEME_OPENER;
}

function takeNextTrack() {
  if (bag.length === 0) refillBag(currentSrc);
  return bag.shift() ?? THEME_OPENER;
}

/** Strip leading/trailing near-silence from a decoded buffer. */
function trimSilence(buffer: AudioBuffer): AudioBuffer {
  const ctx = ensureGraph();
  if (!ctx) return buffer;

  const channels = buffer.numberOfChannels;
  const len = buffer.length;
  let start = 0;
  findStart: for (; start < len; start++) {
    for (let c = 0; c < channels; c++) {
      if (Math.abs(buffer.getChannelData(c)[start]!) >= SILENCE_THRESHOLD) break findStart;
    }
  }

  let end = len - 1;
  findEnd: for (; end > start; end--) {
    for (let c = 0; c < channels; c++) {
      if (Math.abs(buffer.getChannelData(c)[end]!) >= SILENCE_THRESHOLD) break findEnd;
    }
  }
  end += 1;

  // Keep a tiny pad so loops don't click, but never leave multi-second tails.
  const pad = Math.min(Math.floor(buffer.sampleRate * 0.02), Math.floor((end - start) / 4));
  start = Math.max(0, start - pad);
  end = Math.min(len, end + pad);

  if (start <= 0 && end >= len) return buffer;
  const outLen = Math.max(1, end - start);
  const out = ctx.createBuffer(channels, outLen, buffer.sampleRate);
  for (let c = 0; c < channels; c++) {
    out.copyToChannel(buffer.getChannelData(c).subarray(start, end), c);
  }
  return out;
}

async function getBuffer(src: string): Promise<AudioBuffer> {
  const hit = buffers.get(src);
  if (hit) return hit;

  const inflight = loading.get(src);
  if (inflight) return inflight;

  const task = (async () => {
    const ctx = await resumeContext();
    if (!ctx) throw new Error("No AudioContext");
    const res = await fetch(absoluteSrc(src));
    if (!res.ok) throw new Error(`Failed to fetch ${src}`);
    const raw = await res.arrayBuffer();
    const decoded = await ctx.decodeAudioData(raw.slice(0));
    const trimmed = trimSilence(decoded);
    buffers.set(src, trimmed);
    loading.delete(src);
    return trimmed;
  })().catch((err) => {
    loading.delete(src);
    throw err;
  });

  loading.set(src, task);
  return task;
}

function clearSwitchTimer() {
  if (switchTimer) {
    window.clearTimeout(switchTimer);
    switchTimer = 0;
  }
}

function clearVolumeFade() {
  if (volumeFadeTimer) {
    window.clearTimeout(volumeFadeTimer);
    volumeFadeTimer = 0;
  }
}

function stopVoice(voice: Voice | null, when = 0) {
  if (!voice) return;
  try {
    if (when > 0) voice.source.stop(when);
    else voice.source.stop();
  } catch {
    /* already stopped */
  }
}

function playedSeconds(voice: Voice, now: number) {
  return Math.min(voice.duration, Math.max(0, voice.offset + (now - voice.startedAt)));
}

function scheduleCrossfade() {
  clearSwitchTimer();
  const ctx = ensureGraph();
  if (!ctx || !current || !armed || muted() || hidden()) return;

  const elapsed = playedSeconds(current, ctx.currentTime);
  const remaining = Math.max(0, current.duration - elapsed);
  const wait = Math.max(0.05, remaining - CROSSFADE_SEC);

  switchTimer = window.setTimeout(() => {
    void crossfadeToNext();
  }, wait * 1000);

  // Warm the following track early
  void getBuffer(peekNextTrack()).catch(() => {});
}

function playFromBuffer(src: string, buffer: AudioBuffer, offset = 0, fadeInSec = 0) {
  const ctx = ensureGraph();
  if (!ctx || !musicBus || !bedGain) return false;

  const safeOffset = Math.min(Math.max(0, offset), Math.max(0, buffer.duration - 0.05));
  const gain = ctx.createGain();
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(gain);
  gain.connect(musicBus);

  const now = ctx.currentTime;
  if (fadeInSec > 0) {
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(1, now + fadeInSec);
  } else {
    gain.gain.setValueAtTime(1, now);
  }

  source.start(now, safeOffset);
  current = {
    source,
    gain,
    src,
    startedAt: now,
    offset: safeOffset,
    duration: buffer.duration,
  };
  currentSrc = src;

  source.onended = () => {
    if (current?.source !== source) return;
    if (crossfading) return;
    void crossfadeToNext();
  };

  scheduleCrossfade();
  void getBuffer(peekNextTrack()).catch(() => {});
  return true;
}

async function startVoice(src: string, offset = 0, fadeInSec = 0) {
  await resumeContext();
  const buffer = await getBuffer(src);
  playFromBuffer(src, buffer, offset, fadeInSec);
}

async function crossfadeToNext() {
  if (crossfading || !armed || muted() || hidden()) return;
  const ctx = await resumeContext();
  if (!ctx || !musicBus) return;

  crossfading = true;
  clearSwitchTimer();

  const nextSrc = takeNextTrack();
  let buffer: AudioBuffer;
  try {
    buffer = await getBuffer(nextSrc);
  } catch {
    crossfading = false;
    // Retry shortly so we never stay dead silent after a load blip
    switchTimer = window.setTimeout(() => {
      void crossfadeToNext();
    }, 500);
    return;
  }

  const prev = current;
  const now = ctx.currentTime;
  const remaining = prev ? Math.max(0.05, prev.duration - playedSeconds(prev, now)) : CROSSFADE_SEC;
  const fade = Math.min(CROSSFADE_SEC, remaining);

  const gain = ctx.createGain();
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(gain);
  gain.connect(musicBus);

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(1, now + fade);

  if (prev) {
    try {
      prev.gain.gain.cancelScheduledValues(now);
      prev.gain.gain.setValueAtTime(prev.gain.gain.value, now);
      prev.gain.gain.linearRampToValueAtTime(0, now + fade);
    } catch {
      /* ignore */
    }
    stopVoice(prev, now + fade + 0.02);
  }

  source.start(now);
  current = {
    source,
    gain,
    src: nextSrc,
    startedAt: now,
    offset: 0,
    duration: buffer.duration,
  };
  currentSrc = nextSrc;
  crossfading = false;

  source.onended = () => {
    if (current?.source !== source) return;
    if (crossfading) return;
    void crossfadeToNext();
  };

  scheduleCrossfade();
  void getBuffer(peekNextTrack()).catch(() => {});
}

function setBedVolume(value: number, ms = 0) {
  const ctx = ensureGraph();
  if (!ctx || !bedGain) return;
  clearVolumeFade();
  const now = ctx.currentTime;
  bedGain.gain.cancelScheduledValues(now);
  if (ms <= 0) {
    bedGain.gain.setValueAtTime(value, now);
    return;
  }
  bedGain.gain.setValueAtTime(bedGain.gain.value, now);
  bedGain.gain.linearRampToValueAtTime(value, now + ms / 1000);
}

function pauseArcadeTheme() {
  clearSwitchTimer();
  clearVolumeFade();
  const ctx = ensureGraph();
  if (current && ctx) {
    pauseOffset = playedSeconds(current, ctx.currentTime);
  }
  stopVoice(current);
  current = null;
  crossfading = false;
  if (bedGain && ctx) {
    bedGain.gain.cancelScheduledValues(ctx.currentTime);
    bedGain.gain.setValueAtTime(0, ctx.currentTime);
  }
}

function watchVisibility() {
  if (watching || typeof document === "undefined") return;
  watching = true;
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      pauseArcadeTheme();
      return;
    }
    resumeArcadeTheme();
  });
  window.addEventListener("pagehide", pauseArcadeTheme);
}

export function preloadArcadeTheme() {
  if (typeof window === "undefined") return null;
  watchVisibility();
  ensureGraph();
  void getBuffer(THEME_OPENER).catch(() => {});
  for (const src of THEME_TRACKS) {
    if (src === THEME_OPENER) continue;
    void getBuffer(src).catch(() => {});
  }
  return null;
}

export function armArcadeTheme() {
  armed = true;
  void resumeContext();
}

export function startArcadeTheme() {
  if (!armed || muted() || hidden()) return;
  void (async () => {
    const ctx = await resumeContext();
    if (!ctx || !bedGain) return;

    if (!startedOnce) {
      startedOnce = true;
      currentSrc = THEME_OPENER;
      refillBag(THEME_OPENER);
      pauseOffset = null;
      await startVoice(THEME_OPENER, 0, 0);
    } else if (!current) {
      const offset = pauseOffset ?? 0;
      pauseOffset = null;
      await startVoice(currentSrc, offset, 0.05);
    }

    if (bedGain.gain.value < targetVolume * 0.5) {
      setBedVolume(targetVolume, 0);
    }
  })();
}

export function fadeArcadeThemeTo(to: number, ms = 900) {
  if (!armed || muted() || hidden()) return;
  targetVolume = to;
  void resumeContext().then(() => {
    startArcadeTheme();
    setBedVolume(to, ms);
  });
}

export function fadeArcadeThemeIn(ms = 900) {
  fadeArcadeThemeTo(THEME_VOLUME, ms);
}

export function fadeArcadeThemeToBackground(ms = 1100) {
  fadeArcadeThemeTo(THEME_VOLUME, ms);
}

export function playArcadeThemeIntro() {
  targetVolume = INTRO_VOLUME;
  const ctx = ensureGraph();
  // Same user-gesture turn — required for AudioContext to start.
  void ctx?.resume();
  if (!armed || muted() || hidden()) return;

  if (!startedOnce) {
    startedOnce = true;
    currentSrc = THEME_OPENER;
    refillBag(THEME_OPENER);
    pauseOffset = null;
    setBedVolume(INTRO_VOLUME, 0);

    const ready = buffers.get(THEME_OPENER);
    if (ready) {
      playFromBuffer(THEME_OPENER, ready, 0, 0);
    } else {
      void startVoice(THEME_OPENER, 0, 0);
    }
    return;
  }

  startArcadeTheme();
  setBedVolume(INTRO_VOLUME, 0);
}

export function resumeArcadeTheme() {
  if (!armed || muted() || hidden()) return;
  void resumeContext().then(() => {
    startArcadeTheme();
    setBedVolume(targetVolume, 120);
  });
}

export function applyThemeMute() {
  if (muted() || hidden()) {
    pauseArcadeTheme();
    return;
  }
  if (armed) {
    resumeArcadeTheme();
  }
}
