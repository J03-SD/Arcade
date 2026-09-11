export function haptic(ms: number | number[] = 12) {
  if (typeof navigator === "undefined" || !navigator.vibrate) return;
  try {
    navigator.vibrate(ms);
  } catch {
    /* ignore */
  }
}

export const haptics = {
  tap: () => haptic(10),
  match: () => haptic(18),
  miss: () => haptic([8, 24, 8]),
  combo: () => haptic([12, 18, 22]),
  win: () => haptic([16, 30, 16, 40, 24]),
};
