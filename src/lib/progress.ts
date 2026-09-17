import type { GameMode } from "./modes";

const KEY = "sd-games-progress-v1";

export type DayRecord = {
  dayIndex: number;
  mode: GameMode;
  score: number;
  timeMs: number;
  stars?: number;
};

export type Progress = {
  streak: number;
  bestStreak: number;
  lastDailyDay: number | null;
  muted: boolean;
  /** 0–1 mix for arcade theme. */
  musicVolume: number;
  /** 0–1 mix for UI and game SFX. */
  sfxVolume: number;
  dragonFinds: number;
  records: DayRecord[];
};

const empty = (): Progress => ({
  streak: 0,
  bestStreak: 0,
  lastDailyDay: null,
  muted: false,
  musicVolume: 1,
  sfxVolume: 1,
  dragonFinds: 0,
  records: [],
});

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.min(1, Math.max(0, value));
}

export function loadProgress(): Progress {
  if (typeof window === "undefined") return empty();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as Partial<Progress>;
    return {
      ...empty(),
      ...parsed,
      musicVolume: clamp01(parsed.musicVolume ?? 1),
      sfxVolume: clamp01(parsed.sfxVolume ?? 1),
    };
  } catch {
    return empty();
  }
}

export function saveProgress(next: Progress) {
  localStorage.setItem(KEY, JSON.stringify(next));
}

export function recordDaily(progress: Progress, record: DayRecord): Progress {
  const already = progress.records.some(
    (item) => item.dayIndex === record.dayIndex && item.mode === record.mode,
  );
  if (already) {
    return {
      ...progress,
      records: progress.records.map((item) =>
        item.dayIndex === record.dayIndex && item.mode === record.mode ? record : item,
      ),
    };
  }

  let streak = progress.streak;
  if (progress.lastDailyDay === null) streak = 1;
  else if (record.dayIndex === progress.lastDailyDay + 1) streak += 1;
  else if (record.dayIndex !== progress.lastDailyDay) streak = 1;

  return {
    ...progress,
    streak,
    bestStreak: Math.max(progress.bestStreak, streak),
    lastDailyDay: record.dayIndex,
    records: [...progress.records, record].slice(-120),
  };
}

export function foundDragon(progress: Progress): Progress {
  return { ...progress, dragonFinds: progress.dragonFinds + 1 };
}

export function setMuted(progress: Progress, muted: boolean): Progress {
  const next = { ...progress, muted };
  saveProgress(next);
  return next;
}

export function toggleMuted(): Progress {
  const progress = loadProgress();
  return setMuted(progress, !progress.muted);
}

export function setAudioLevels(patch: { musicVolume?: number; sfxVolume?: number }): Progress {
  const progress = loadProgress();
  const next = {
    ...progress,
    musicVolume: patch.musicVolume != null ? clamp01(patch.musicVolume) : progress.musicVolume,
    sfxVolume: patch.sfxVolume != null ? clamp01(patch.sfxVolume) : progress.sfxVolume,
  };
  saveProgress(next);
  return next;
}
