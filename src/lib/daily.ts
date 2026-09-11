import { LAUNCH_MODES, MODE_META, type GameMode, type LaunchMode } from "./modes";

export const EPOCH_UTC = Date.UTC(2026, 8, 10);

export function utcDayStart(date = new Date()) {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function dayIndex(date = new Date()) {
  return Math.max(0, Math.floor((utcDayStart(date) - EPOCH_UTC) / 86_400_000));
}

export function dateFromDayIndex(index: number) {
  return new Date(EPOCH_UTC + index * 86_400_000);
}

export function featuredMode(index = dayIndex()): LaunchMode {
  const wrapped = ((index % LAUNCH_MODES.length) + LAUNCH_MODES.length) % LAUNCH_MODES.length;
  return LAUNCH_MODES[wrapped]!;
}

export function dailySeed(index: number, salt = 0) {
  return ((index + 1) * 2654435761 + salt) >>> 0;
}

export function formatDayNumber(index: number) {
  return `Day #${index}`;
}

export function formatDayDate(index: number) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(dateFromDayIndex(index));
}

export function formatClock(ms: number) {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function todayMeta(index = dayIndex()) {
  const mode = featuredMode(index);
  return {
    dayIndex: index,
    mode,
    meta: MODE_META[mode],
    label: formatDayNumber(index),
  };
}

export function isFeatured(mode: GameMode, index = dayIndex()) {
  return featuredMode(index) === mode;
}
