import { loadProgress } from "./progress";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let sfxBus: GainNode | null = null;
let unlocked = false;

/** Overall ceiling into the speakers. */
const MASTER_GAIN = 0.48;
/** SFX sit a touch above the bed so taps cut through. Music uses the shared master bus. */
const SFX_BUS_GAIN = 1;

function context() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    master = ctx.createGain();
    sfxBus = ctx.createGain();
    sfxBus.connect(master);
    master.connect(ctx.destination);
  }
  if (master) master.gain.value = MASTER_GAIN;
  if (sfxBus) sfxBus.gain.value = SFX_BUS_GAIN;
  return ctx;
}

function bus() {
  context();
  return sfxBus;
}

/** Shared graph for theme music (sits under SFX on master). */
export function getAudioContext() {
  return context();
}

export function getMasterGain() {
  context();
  return master;
}

export function isMuted() {
  return loadProgress().muted;
}

export async function unlockAudio() {
  unlocked = true;
  const audio = context();
  if (!audio) return;
  if (audio.state === "suspended") await audio.resume();
}

function tone(
  freq: number,
  duration: number,
  type: OscillatorType = "sine",
  gain = 0.5,
  when = 0,
) {
  const audio = context();
  const out = bus();
  if (!audio || !out || isMuted() || !unlocked) return;
  const t = audio.currentTime + when;
  const osc = audio.createOscillator();
  const vol = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  vol.gain.setValueAtTime(0.0001, t);
  vol.gain.exponentialRampToValueAtTime(Math.max(gain, 0.0001), t + 0.012);
  vol.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(vol);
  vol.connect(out);
  osc.start(t);
  osc.stop(t + duration + 0.02);
}

let lastFadeAt = 0;

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getNoise(audio: AudioContext, seconds = 1.4) {
  const length = Math.floor(audio.sampleRate * seconds);
  const buffer = audio.createBuffer(1, length, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - (i / length) * 0.55);
  }
  return buffer;
}

let fallLoopTimer = 0;
let fallLoopActive = false;

/** Soft pixel-crumble for the whole division phase (~PIXEL_MS). */
export function playLogoPixelateSound(durationMs = 900) {
  const audio = context();
  const out = bus();
  if (!audio || !out || isMuted() || !unlocked) return;
  const t = audio.currentTime;
  const grow = Math.max(0.35, durationMs / 1000);

  const src = audio.createBufferSource();
  src.buffer = getNoise(audio, grow + 0.12);
  const filter = audio.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.value = 1.1;
  filter.frequency.setValueAtTime(4200, t);
  filter.frequency.exponentialRampToValueAtTime(280, t + grow);
  const crackle = audio.createGain();
  crackle.gain.setValueAtTime(0.0001, t);
  crackle.gain.exponentialRampToValueAtTime(0.36, t + 0.04);
  crackle.gain.exponentialRampToValueAtTime(0.22, t + grow * 0.7);
  crackle.gain.exponentialRampToValueAtTime(0.0001, t + grow);
  src.connect(filter);
  filter.connect(crackle);
  crackle.connect(out);
  src.start(t);
  src.stop(t + grow + 0.03);

  const ticks = 10;
  for (let i = 0; i < ticks; i++) {
    const when = (grow * i) / ticks;
    tone(1180 - i * 86, 0.045, i % 2 === 0 ? "square" : "triangle", 0.26 - i * 0.012, when);
  }
}

export function playLoadCellSound(index = 0) {
  const n = Math.min(Math.max(index, 0), 8);
  const audio = context();
  const out = bus();
  if (!audio || !out || isMuted() || !unlocked) return;
  const t = audio.currentTime;

  tone(140 + n * 22, 0.07, "square", 0.34);
  tone(70 + n * 10, 0.1, "triangle", 0.28, 0.012);
  tone(520 + n * 40, 0.04, "square", 0.16, 0.008);

  const src = audio.createBufferSource();
  src.buffer = getNoise(audio, 0.08);
  const vol = audio.createGain();
  vol.gain.setValueAtTime(0.22, t);
  vol.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
  src.connect(vol);
  vol.connect(out);
  src.start(t);
  src.stop(t + 0.08);
}

export function playPixelGrowSound(durationMs = 780) {
  const audio = context();
  const out = bus();
  if (!audio || !out || isMuted() || !unlocked) return;
  const t = audio.currentTime;
  const grow = Math.max(0.4, durationMs / 1000);

  const src = audio.createBufferSource();
  src.buffer = getNoise(audio, grow + 0.15);
  const filter = audio.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.value = 0.85;
  filter.frequency.setValueAtTime(3600, t);
  filter.frequency.exponentialRampToValueAtTime(380, t + grow);
  const crackle = audio.createGain();
  crackle.gain.setValueAtTime(0.0001, t);
  crackle.gain.exponentialRampToValueAtTime(0.4, t + 0.05);
  crackle.gain.exponentialRampToValueAtTime(0.28, t + grow * 0.55);
  crackle.gain.exponentialRampToValueAtTime(0.18, t + grow * 0.88);
  crackle.gain.exponentialRampToValueAtTime(0.0001, t + grow);
  src.connect(filter);
  filter.connect(crackle);
  crackle.connect(out);
  src.start(t);
  src.stop(t + grow + 0.04);

  // Division ticks across the full grow window
  const ticks = 8;
  for (let i = 0; i < ticks; i++) {
    const when = (grow * (i + 0.35)) / ticks;
    const freq = 920 - i * 70;
    tone(freq, 0.05, i % 2 === 0 ? "square" : "triangle", 0.34 - i * 0.02, when);
  }
}

/** Cascading fall plinks — keep going until stopPixelFallSound(). */
export function playPixelFallSound() {
  stopPixelFallSound();
  const audio = context();
  if (!audio || isMuted() || !unlocked) return;
  fallLoopActive = true;
  let step = 0;

  const pulse = () => {
    if (!fallLoopActive || isMuted()) return;
    const count = 2 + (step % 3);
    for (let i = 0; i < count; i++) {
      const when = i * 0.03;
      const freq = 290 - Math.min(step, 18) * 8 - i * 18 + Math.random() * 20;
      const gain = Math.max(0.1, 0.42 - step * 0.012);
      tone(freq, 0.07, "triangle", gain, when);
    }
    step += 1;
    fallLoopTimer = window.setTimeout(pulse, 95 + Math.random() * 55);
  };
  pulse();
}

export function stopPixelFallSound() {
  fallLoopActive = false;
  if (fallLoopTimer) {
    window.clearTimeout(fallLoopTimer);
    fallLoopTimer = 0;
  }
}

/** Punchy blast for shockwave taps — scales a bit with hit count. */
export function playShockwaveSound(hits = 8) {
  const audio = context();
  const out = bus();
  if (!audio || !out || isMuted() || !unlocked) return;
  const t = audio.currentTime;
  const power = Math.min(1.4, 0.55 + hits / 40);

  tone(90, 0.12, "sine", 0.42 * power);
  tone(55, 0.16, "triangle", 0.32 * power, 0.01);
  tone(180, 0.08, "square", 0.18 * power, 0.02);

  const src = audio.createBufferSource();
  src.buffer = getNoise(audio, 0.28);
  const filter = audio.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(2400, t);
  filter.frequency.exponentialRampToValueAtTime(280, t + 0.22);
  const vol = audio.createGain();
  vol.gain.setValueAtTime(0.0001, t);
  vol.gain.exponentialRampToValueAtTime(0.34 * power, t + 0.015);
  vol.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
  src.connect(filter);
  filter.connect(vol);
  vol.connect(out);
  src.start(t);
  src.stop(t + 0.26);

  tone(720 + hits * 4, 0.06, "square", 0.22 * power, 0.04);
  tone(1080, 0.05, "triangle", 0.16 * power, 0.08);
}

export function playPageFade() {
  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  if (now - lastFadeAt < 260) return;
  lastFadeAt = now;
  if (prefersReducedMotion()) {
    tone(480, 0.1, "sine", 0.5);
    return;
  }
  // Dissolve owns the timed SFX; keep a tiny cue only if dissolve didn't start
  void unlockAudio().then(() => {
    tone(220, 0.05, "square", 0.08);
  });
}

export function speak(line: string) {
  if (typeof window === "undefined" || isMuted()) return;
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(line);
  utter.rate = 1;
  utter.pitch = 0.85;
  utter.volume = 1;
  window.speechSynthesis.speak(utter);
}

function tvOnSound() {
  const audio = context();
  const out = bus();
  if (!audio || !out || isMuted() || !unlocked) return;
  const t = audio.currentTime;

  tone(55, 0.16, "sine", 0.38);
  tone(90, 0.1, "triangle", 0.2, 0.03);

  const osc = audio.createOscillator();
  const vol = audio.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(320, t);
  osc.frequency.exponentialRampToValueAtTime(11000, t + 0.28);
  osc.frequency.exponentialRampToValueAtTime(2400, t + 0.72);
  vol.gain.setValueAtTime(0.0001, t);
  vol.gain.exponentialRampToValueAtTime(0.16, t + 0.04);
  vol.gain.exponentialRampToValueAtTime(0.1, t + 0.3);
  vol.gain.exponentialRampToValueAtTime(0.0001, t + 0.78);
  osc.connect(vol);
  vol.connect(out);
  osc.start(t);
  osc.stop(t + 0.82);

  tone(180, 0.08, "square", 0.12, 0.26);
  tone(1400, 0.05, "sine", 0.08, 0.32);
}

function playScoreSmashSound() {
  const audio = context();
  const out = bus();
  if (!audio || !out || isMuted() || !unlocked) return;
  const t = audio.currentTime;

  tone(420, 0.08, "sine", 0.16);
  tone(560, 0.1, "triangle", 0.2, 0.05);

  const hit = 0.2;
  tone(880, 0.08, "triangle", 0.4, hit);
  tone(1175, 0.12, "sine", 0.34, hit + 0.025);
  tone(1568, 0.16, "sine", 0.22, hit + 0.05);
  tone(98, 0.14, "sine", 0.28, hit + 0.01);
}

export const WRONG_UNWIND_MS = 58;

export const sfx = {
  tap: () => tone(640, 0.06, "triangle", 0.55),
  score: (level = 1) => {
    const step = Math.min(level, 8);
    const base = 640 + step * 88;
    tone(base, 0.05, "square", 0.4);
    tone(base * 1.5, 0.07, "triangle", 0.46, 0.016);
    tone(base * 2, 0.1, "sine", 0.3, 0.032);
    tone(base * 1.25 + 12, 0.08, "sine", 0.18, 0.05);
  },
  boot: () => {
    tone(98, 0.2, "square", 0.28);
    tone(196, 0.16, "square", 0.22, 0.12);
    tone(294, 0.14, "square", 0.18, 0.24);
  },
  tvOn: () => tvOnSound(),
  pixelate: (durationMs = 900) => playLogoPixelateSound(durationMs),
  loadCell: (index = 0) => playLoadCellSound(index),
  ready: () => {
    tone(523, 0.1, "square", 0.32);
    tone(784, 0.18, "square", 0.24, 0.07);
  },
  select: () => tone(520, 0.07, "sine", 0.55),
  erase: () => {
    tone(420, 0.08, "sine", 0.4);
    tone(280, 0.1, "triangle", 0.32, 0.03);
  },
  pageFade: () => playPageFade(),
  match: () => {
    tone(523, 0.1, "triangle", 0.7);
    tone(659, 0.12, "sine", 0.55, 0.05);
    tone(784, 0.16, "triangle", 0.5, 0.1);
  },
  combo: (level = 1) => {
    tone(480 + level * 90, 0.08, "square", 0.4);
    tone(720 + level * 80, 0.12, "triangle", 0.55, 0.05);
  },
  miss: () => {
    tone(220, 0.12, "sawtooth", 0.4);
    tone(160, 0.14, "sine", 0.45, 0.03);
  },
  penalty: () => {
    tone(340, 0.05, "triangle", 0.28);
    tone(240, 0.07, "sine", 0.24, 0.03);
    tone(160, 0.09, "sine", 0.18, 0.06);
  },
  smash: () => playScoreSmashSound(),
  fuse: () => {
    tone(380, 0.1, "triangle", 0.55);
    tone(570, 0.12, "sine", 0.55, 0.05);
    tone(860, 0.16, "triangle", 0.45, 0.1);
  },
  pivot: () => {
    tone(300, 0.08, "sine", 0.55);
    tone(450, 0.1, "triangle", 0.5, 0.06);
    tone(680, 0.12, "sine", 0.45, 0.12);
  },
  signal: () => {
    tone(700, 0.07, "sine", 0.5);
    tone(920, 0.1, "triangle", 0.45, 0.05);
  },
  win: () => {
    tone(523, 0.12, "triangle", 0.7);
    tone(659, 0.14, "sine", 0.6, 0.08);
    tone(784, 0.16, "triangle", 0.55, 0.16);
    tone(1046, 0.22, "sine", 0.5, 0.26);
  },
  dragon: () => {
    tone(840, 0.08, "sine", 0.55);
    tone(1260, 0.14, "triangle", 0.45, 0.06);
  },
  connect: (step = 1) => {
    // Match crossword tap/select loudness (~0.55 triangle at mid register)
    const freq = 560 + Math.min(step, 12) * 52;
    tone(freq, 0.065, "triangle", 0.58);
    tone(freq * 1.5, 0.055, "sine", 0.42, 0.018);
  },
  disconnect: (step = 1) => {
    const freq = 560 + Math.min(step, 12) * 52;
    tone(freq, 0.065, "sine", 0.55);
    tone(freq * 0.72, 0.08, "triangle", 0.4, 0.02);
  },
  releaseFail: (steps = 1) => {
    const count = Math.min(Math.max(steps, 1), 10);
    for (let i = 0; i < count; i++) {
      const step = count - i;
      const freq = 560 + step * 52;
      tone(freq, 0.055, "sine", 0.5, i * 0.035);
      tone(freq * 0.7, 0.065, "triangle", 0.36, i * 0.035 + 0.015);
    }
  },
  releaseWin: (steps = 1) => {
    const count = Math.min(Math.max(steps, 1), 10);
    for (let i = 0; i < count; i++) {
      tone(520 + i * 48, 0.055, "triangle", 0.5, i * 0.028);
    }
    const t = count * 0.028;
    tone(523, 0.12, "sine", 0.7, t);
    tone(659, 0.14, "triangle", 0.6, t + 0.05);
    tone(784, 0.18, "sine", 0.55, t + 0.1);
    tone(1046, 0.22, "triangle", 0.45, t + 0.16);
  },
};

export const vo = {
  identityMatch: () => speak("Identity match."),
  weakCorrelation: () => speak("Weak correlation."),
  targetAcquired: () => speak("Target acquired."),
  signalFound: () => speak("Signal found."),
};
