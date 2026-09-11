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
  dragonFinds: number;
  records: DayRecord[];
};

const empty = (): Progress => ({
  streak: 0,
  bestStreak: 0,
  lastDailyDay: null,
  muted: false,
  dragonFinds: 0,
  records: [],
});

export function loadProgress(): Progress {
  if (typeof window === "undefined") return empty();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    return { ...empty(), ...JSON.parse(raw) } as Progress;
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
