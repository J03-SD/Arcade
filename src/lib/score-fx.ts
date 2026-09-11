import { stageSize, toStagePoint } from "./stage";

export type PlusPoint = { x: number; y: number };

export type LetterBurst = PlusPoint & {
  delta: number;
  size?: "sm" | "lg";
};

export type WordScoreOpts = {
  streak?: number;
  /** ms from previous letter → this letter (index 0 ignored). */
  stepMs?: number[];
  /** Dragged opposite the stored placement direction. */
  reverse?: boolean;
  /** Grid cells for board-relative placement (row, col). */
  cells?: [number, number][];
  boardSize?: number;
};

const LETTER_BASE = 100;
const REVERSE_MULT = 1.5;
/** Fastest useful step window (ms). */
const SPEED_BEST_MS = 70;
/** No speed bonus past this gap. */
const SPEED_NONE_MS = 420;
/** Max bonus stacked on top of the base 100. */
const SPEED_BONUS_MAX = 150;

export function prefersScoreReduce() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function clampPlusPoint(x: number, y: number): PlusPoint {
  const padX = 28;
  const padTop = 64;
  const padBottom = 128;
  const { w, h } = stageSize();
  return {
    x: Math.min(w - padX, Math.max(padX, x)),
    y: Math.min(h - padBottom, Math.max(padTop, y)),
  };
}

export function cellCentersFromRoot(root: HTMLElement, cells: [number, number][]): PlusPoint[] {
  const fallback = root.getBoundingClientRect();
  return cells.map(([r, c]) => {
    const el = root.querySelector(`[data-r="${r}"][data-c="${c}"]`);
    if (!(el instanceof HTMLElement)) {
      return toStagePoint(fallback.left + fallback.width / 2, fallback.top + fallback.height / 2);
    }
    const rect = el.getBoundingClientRect();
    return toStagePoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
  });
}

/** Offset pluses off the word so they sit beside letters, not on top of them. */
export function letterPlusOrigins(points: PlusPoint[], opts: WordScoreOpts = {}): PlusPoint[] {
  if (!points.length) return [];
  const first = points[0]!;
  const last = points[points.length - 1]!;
  const dx = last.x - first.x;
  const dy = last.y - first.y;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  const midX = points.reduce((sum, point) => sum + point.x, 0) / points.length;
  const midY = points.reduce((sum, point) => sum + point.y, 0) / points.length;
  const { w, h } = stageSize();
  const cx = w / 2;
  const cy = h / 2;
  const slack = Math.min(w, h) * 0.04;

  const leftHalf = midX < cx - slack;
  const rightHalf = midX > cx + slack;

  /** On a center line: bottom/left → right, top/right → left. */
  const linePrefersRight = midY > cy + slack || (Math.abs(midY - cy) <= slack && midX <= cx);

  const boardSize = opts.boardSize ?? 10;
  const gridCells = opts.cells;
  const midRow =
    gridCells && gridCells.length
      ? gridCells.reduce((sum, [r]) => sum + r, 0) / gridCells.length
      : null;
  const midCol =
    gridCells && gridCells.length
      ? gridCells.reduce((sum, [, c]) => sum + c, 0) / gridCells.length
      : null;

  let ox = 0;
  let oy = 0;

  if (absDy >= absDx * 1.15) {
    // Vertical word: numbers to the left/right of the column.
    if (midCol != null) {
      ox = midCol < boardSize / 2 ? 1 : -1;
    } else if (leftHalf || (!rightHalf && linePrefersRight)) {
      ox = 1;
    } else {
      ox = -1;
    }
  } else if (absDx >= absDy * 1.15) {
    // Horizontal: top half of the grid → below letters; bottom half → above.
    if (midRow != null) {
      oy = midRow < boardSize / 2 ? 1 : -1;
    } else {
      oy = midY < cy ? 1 : -1;
    }
  } else {
    // Diagonal: quadrant based — left half opens right, right half opens left.
    if (midCol != null) {
      ox = midCol < boardSize / 2 ? 1 : -1;
    } else {
      ox = midX <= cx ? 1 : -1;
    }
    // Light perpendicular nudge so floats clear the diagonal letters.
    oy = dy === 0 ? 0 : -Math.sign(dy) * 0.28;
    const len = Math.hypot(ox, oy) || 1;
    ox /= len;
    oy /= len;
  }

  const dist = 42;
  return points.map((point) => clampPlusPoint(point.x + ox * dist, point.y + oy * dist));
}

/** Extra points for a quick hop from the previous letter. */
export function speedBonus(stepMs: number) {
  if (!(stepMs >= 0)) return 0;
  if (stepMs <= SPEED_BEST_MS) return SPEED_BONUS_MAX;
  if (stepMs >= SPEED_NONE_MS) return 0;
  const t = 1 - (stepMs - SPEED_BEST_MS) / (SPEED_NONE_MS - SPEED_BEST_MS);
  return Math.round(SPEED_BONUS_MAX * t * t);
}

export function wordLetterValues(letterCount: number, opts: WordScoreOpts = {}) {
  const reverseMult = opts.reverse ? REVERSE_MULT : 1;
  const steps = opts.stepMs ?? [];
  return Array.from({ length: letterCount }, (_, i) => {
    const bonus = i === 0 ? 0 : speedBonus(steps[i] ?? SPEED_NONE_MS);
    return Math.round((LETTER_BASE + bonus) * reverseMult);
  });
}

function normalizeOpts(streakOrOpts?: number | WordScoreOpts): WordScoreOpts {
  if (typeof streakOrOpts === "number") return { streak: streakOrOpts };
  return streakOrOpts ?? {};
}

export function wordScoreBursts(
  cellCenters: PlusPoint[],
  streakOrOpts?: number | WordScoreOpts,
): LetterBurst[] {
  if (!cellCenters.length) return [];
  const opts = normalizeOpts(streakOrOpts);
  const origins = letterPlusOrigins(cellCenters, opts);
  const values = wordLetterValues(cellCenters.length, opts);
  return origins.map((point, i) => ({
    ...point,
    delta: values[i]!,
    size: "sm" as const,
  }));
}
