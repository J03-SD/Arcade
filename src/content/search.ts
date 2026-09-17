import { dailySeed } from "@/lib/daily";
import { sample, seededRng, shuffle } from "@/lib/rng";

export type SearchPlacement = {
  word: string;
  cells: [number, number][];
};

export type SearchBoard = {
  id: string;
  title: string;
  size: number;
  letters: string[][];
  words: string[];
  placed: SearchPlacement[];
};

const SIZE = 8;
const TARGET_WORDS = 5;
const HEAT_RADIUS = 2;

/** Soft direction mix: H/V slightly preferred over diagonals. */
const DIR_WEIGHT = [1.15, 1.15, 0.9, 0.9, 1.15, 1.15, 0.9, 0.9];

const DIRS: [number, number][] = [
  [0, 1],
  [1, 0],
  [1, 1],
  [-1, 1],
  [0, -1],
  [-1, 0],
  [-1, -1],
  [1, -1],
];

/** English-ish filler so empty cells form plausible decoy fragments. */
const FILL_BAG =
  "EEEEEEEEEEEE" +
  "AAAAAAAAA" +
  "IIIIIIIII" +
  "OOOOOOOO" +
  "NNNNNN" +
  "RRRRRR" +
  "TTTTTT" +
  "LLLL" +
  "SSSS" +
  "UUU" +
  "DDD" +
  "GGG" +
  "BBCCMMPPFFHHVVWWYYKJXQZ";

const THEMES = [
  {
    id: "osint",
    title: "Open Source Intelligence",
    words: [
      "OSINT",
      "PUBLIC",
      "SOURCE",
      "VERIFY",
      "SIGNALS",
      "ANALYSIS",
      "RESEARCH",
      "ETHICAL",
      "DATA",
      "INSIGHT",
      "COLLECT",
    ],
  },
  {
    id: "identity",
    title: "Identity and Breadcrumbs",
    words: [
      "IDENTITY",
      "ALIAS",
      "USERNAME",
      "EMAIL",
      "PROFILE",
      "SIGNAL",
      "PIVOT",
      "VALIDATE",
      "TRAIL",
      "HANDLE",
    ],
  },
  {
    id: "networks",
    title: "Networks and Connections",
    words: [
      "NETWORK",
      "GRAPH",
      "LINK",
      "PATTERN",
      "ENTITY",
      "MAP",
      "CONTEXT",
      "DISCOVER",
      "CONNECT",
      "RELATE",
    ],
  },
  {
    id: "monitor",
    title: "Monitor and Respond",
    words: [
      "MONITOR",
      "ALERT",
      "KEYWORD",
      "TOPIC",
      "CHANGE",
      "THREAT",
      "CONTEXT",
      "RESPONSE",
      "TIMELY",
      "TRACK",
      "EMERGING",
    ],
  },
] as const;

type DirKind = "h" | "v" | "d";

type Candidate = {
  row: number;
  col: number;
  dr: number;
  dc: number;
  dir: number;
  cells: [number, number][];
  overlaps: number;
  newCells: number;
  score: number;
};

function emptyGrid(fill = "") {
  return Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, () => fill));
}

function emptyHeat() {
  return Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, () => 0));
}

function dirKind(dr: number, dc: number): DirKind {
  if (dr === 0) return "h";
  if (dc === 0) return "v";
  return "d";
}

function kindOfCells(cells: [number, number][]): DirKind {
  if (cells.length < 2) return "h";
  return dirKind(Math.sign(cells[1]![0] - cells[0]![0]), Math.sign(cells[1]![1] - cells[0]![1]));
}

function band(i: number) {
  const third = SIZE / 3;
  if (i < third) return 0;
  if (i < third * 2) return 1;
  return 2;
}

function regionOf(r: number, c: number) {
  return band(r) * 3 + band(c);
}

function heatBump(distance: number) {
  if (distance <= 0) return 3;
  if (distance <= 1) return 2;
  if (distance <= 2) return 1;
  return 0;
}

function applyHeat(heat: number[][], cells: [number, number][], sign: 1 | -1) {
  const bump = emptyHeat();
  for (const [cr, cc] of cells) {
    for (let dr = -HEAT_RADIUS; dr <= HEAT_RADIUS; dr++) {
      for (let dc = -HEAT_RADIUS; dc <= HEAT_RADIUS; dc++) {
        const r = cr + dr;
        const c = cc + dc;
        if (r < 0 || c < 0 || r >= SIZE || c >= SIZE) continue;
        const dist = Math.hypot(dr, dc);
        bump[r]![c] = Math.max(bump[r]![c]!, heatBump(dist));
      }
    }
  }
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (bump[r]![c]) heat[r]![c]! += sign * bump[r]![c]!;
    }
  }
}

function wordFits(
  grid: string[][],
  word: string,
  row: number,
  col: number,
  dr: number,
  dc: number,
) {
  const cells: [number, number][] = [];
  let overlaps = 0;
  for (let i = 0; i < word.length; i++) {
    const r = row + dr * i;
    const c = col + dc * i;
    if (r < 0 || c < 0 || r >= SIZE || c >= SIZE) return null;
    const here = grid[r]![c];
    if (here && here !== word[i]) return null;
    if (here) overlaps += 1;
    cells.push([r, c]);
  }
  return { cells, overlaps, newCells: word.length - overlaps };
}

function overlapBonus(overlaps: number) {
  if (overlaps === 0) return 0;
  if (overlaps === 1) return 2;
  if (overlaps === 2) return 1;
  return -(overlaps - 2) * 4;
}

function pathHeat(heat: number[][], cells: [number, number][]) {
  let nearby = 0;
  for (const [cr, cc] of cells) {
    for (let dr = -HEAT_RADIUS; dr <= HEAT_RADIUS; dr++) {
      for (let dc = -HEAT_RADIUS; dc <= HEAT_RADIUS; dc++) {
        const r = cr + dr;
        const c = cc + dc;
        if (r < 0 || c < 0 || r >= SIZE || c >= SIZE) continue;
        const dist = Math.hypot(dr, dc);
        if (dist <= HEAT_RADIUS) nearby += heat[r]![c]!;
      }
    }
  }
  return nearby / Math.max(1, cells.length);
}

function regionNeed(regionCount: number[], cells: [number, number][]) {
  const avg = regionCount.reduce((a, b) => a + b, 0) / regionCount.length;
  const seen = new Set<number>();
  let need = 0;
  for (const [r, c] of cells) {
    const id = regionOf(r, c);
    if (seen.has(id)) continue;
    seen.add(id);
    need += avg - regionCount[id]!;
  }
  return need / Math.max(1, seen.size);
}

function directionNeed(directionCount: number[], dir: number) {
  const avg = directionCount.reduce((a, b) => a + b, 0) / directionCount.length;
  return avg - directionCount[dir]!;
}

function edgePenalty(cells: [number, number][]) {
  let edge = 0;
  for (const [r, c] of cells) {
    if (r === 0 || c === 0 || r === SIZE - 1 || c === SIZE - 1) edge += 1;
  }
  return (edge / cells.length) * 1.4;
}

function kindNeedBonus(directionCount: number[], dir: number) {
  const kinds = { h: 0, v: 0, d: 0 };
  for (let i = 0; i < DIRS.length; i++) {
    const [dr, dc] = DIRS[i]!;
    kinds[dirKind(dr, dc)] += directionCount[i]!;
  }
  const kind = dirKind(DIRS[dir]![0], DIRS[dir]![1]);
  if (kinds[kind] === 0) return 2.2;
  const total = kinds.h + kinds.v + kinds.d;
  if (!total) return 0;
  return (total / 3 - kinds[kind]) * 0.8;
}

function scoreCandidate(
  candidate: Omit<Candidate, "score">,
  heat: number[][],
  directionCount: number[],
  regionCount: number[],
  rng: () => number,
) {
  const noise = rng() * 6 - 3;
  return (
    candidate.newCells * 2.0 -
    pathHeat(heat, candidate.cells) * 1.8 +
    regionNeed(regionCount, candidate.cells) * 3.0 +
    directionNeed(directionCount, candidate.dir) * 1.5 +
    kindNeedBonus(directionCount, candidate.dir) +
    overlapBonus(candidate.overlaps) -
    edgePenalty(candidate.cells) +
    (DIR_WEIGHT[candidate.dir] ?? 1) +
    noise
  );
}

function candidatesFor(
  grid: string[][],
  word: string,
  heat: number[][],
  directionCount: number[],
  regionCount: number[],
  rng: () => number,
) {
  const found: Candidate[] = [];
  for (let dir = 0; dir < DIRS.length; dir++) {
    const [dr, dc] = DIRS[dir]!;
    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        const fit = wordFits(grid, word, row, col, dr, dc);
        if (!fit) continue;
        // Soft-reject heavy crossings so clusters don't fuse into one network.
        if (fit.overlaps >= 3) continue;
        const base = {
          row,
          col,
          dr,
          dc,
          dir,
          cells: fit.cells,
          overlaps: fit.overlaps,
          newCells: fit.newCells,
        };
        found.push({
          ...base,
          score: scoreCandidate(base, heat, directionCount, regionCount, rng),
        });
      }
    }
  }
  found.sort((a, b) => b.score - a.score);
  return found;
}

function weightedPick(candidates: Candidate[], rng: () => number) {
  const topCount = Math.max(3, Math.ceil(candidates.length * 0.2));
  const pool = candidates.slice(0, topCount);
  const minScore = Math.min(...pool.map((item) => item.score));
  const weights = pool.map((item) => Math.exp((item.score - minScore) / 4));
  let total = weights.reduce((a, b) => a + b, 0);
  let roll = rng() * total;
  for (let i = 0; i < pool.length; i++) {
    roll -= weights[i]!;
    if (roll <= 0) return pool[i]!;
  }
  return pool[pool.length - 1]!;
}

function applyWord(grid: string[][], word: string, cells: [number, number][]) {
  const previous = cells.map(([r, c]) => grid[r]![c]!);
  cells.forEach(([r, c], i) => {
    grid[r]![c] = word[i]!;
  });
  return previous;
}

function undoWord(grid: string[][], cells: [number, number][], previous: string[]) {
  cells.forEach(([r, c], i) => {
    grid[r]![c] = previous[i]!;
  });
}

function bumpRegions(regionCount: number[], cells: [number, number][], sign: 1 | -1) {
  const seen = new Set<number>();
  for (const [r, c] of cells) {
    const id = regionOf(r, c);
    if (seen.has(id)) continue;
    seen.add(id);
    regionCount[id]! += sign;
  }
}

function hasEachKind(placed: SearchPlacement[]) {
  const kinds = new Set(placed.map((item) => kindOfCells(item.cells)));
  return kinds.has("h") && kinds.has("v") && kinds.has("d");
}

function coverageOk(placed: SearchPlacement[]) {
  if (placed.length < 4) return false;
  const covered = new Set<string>();
  for (const item of placed) {
    for (const [r, c] of item.cells) covered.add(`${r}:${c}`);
  }
  // Prefer boards that use a decent slice of the grid, not one clump.
  return covered.size >= Math.min(16, placed.reduce((n, item) => n + item.word.length, 0) - 4);
}

function tryOrder(candidates: Candidate[], rng: () => number, attempts: number) {
  const picks: Candidate[] = [];
  const used = new Set<string>();
  for (let i = 0; i < attempts && picks.length < Math.min(8, candidates.length); i++) {
    const choice = weightedPick(candidates, rng);
    const key = `${choice.row}:${choice.col}:${choice.dir}`;
    if (used.has(key)) continue;
    used.add(key);
    picks.push(choice);
  }
  // Fall back to a shuffled top slice if weighted picks collided.
  if (picks.length < 3) {
    return shuffle(rng, candidates.slice(0, Math.max(6, Math.ceil(candidates.length * 0.2))));
  }
  return picks;
}

function solve(
  words: string[],
  index: number,
  grid: string[][],
  heat: number[][],
  placed: SearchPlacement[],
  directionCount: number[],
  regionCount: number[],
  rng: () => number,
): boolean {
  if (index >= words.length) {
    return hasEachKind(placed) && coverageOk(placed);
  }

  const word = words[index]!;
  const candidates = candidatesFor(grid, word, heat, directionCount, regionCount, rng);
  if (!candidates.length) return false;

  const tries = tryOrder(candidates, rng, Math.min(10, candidates.length));
  for (const chosen of tries) {
    const previous = applyWord(grid, word, chosen.cells);
    placed.push({ word, cells: chosen.cells });
    directionCount[chosen.dir]! += 1;
    bumpRegions(regionCount, chosen.cells, 1);
    applyHeat(heat, chosen.cells, 1);

    if (solve(words, index + 1, grid, heat, placed, directionCount, regionCount, rng)) {
      return true;
    }

    applyHeat(heat, chosen.cells, -1);
    bumpRegions(regionCount, chosen.cells, -1);
    directionCount[chosen.dir]! -= 1;
    placed.pop();
    undoWord(grid, chosen.cells, previous);
  }

  return false;
}

function findWordOnGrid(letters: string[][], word: string) {
  const hits: [number, number][][] = [];
  for (const [dr, dc] of DIRS) {
    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        const cells: [number, number][] = [];
        let ok = true;
        for (let i = 0; i < word.length; i++) {
          const r = row + dr * i;
          const c = col + dc * i;
          if (r < 0 || c < 0 || r >= SIZE || c >= SIZE || letters[r]![c] !== word[i]) {
            ok = false;
            break;
          }
          cells.push([r, c]);
        }
        if (ok) hits.push(cells);
      }
    }
  }
  return hits;
}

function samePath(a: [number, number][], b: [number, number][]) {
  if (a.length !== b.length) return false;
  const rev = [...b].reverse();
  return (
    a.every(([r, c], i) => r === b[i]![0] && c === b[i]![1]) ||
    a.every(([r, c], i) => r === rev[i]![0] && c === rev[i]![1])
  );
}

function accidentalExtraWord(letters: string[][], placed: SearchPlacement[]) {
  for (const item of placed) {
    const hits = findWordOnGrid(letters, item.word);
    if (hits.some((path) => !samePath(path, item.cells))) return true;
  }
  return false;
}

function fillEmpty(grid: string[][], placed: SearchPlacement[], rng: () => number) {
  const locked = new Set<string>();
  for (const item of placed) {
    for (const [r, c] of item.cells) locked.add(`${r}:${c}`);
  }

  for (let attempt = 0; attempt < 24; attempt++) {
    const letters = grid.map((row) => [...row]);
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (locked.has(`${r}:${c}`)) continue;
        letters[r]![c] = FILL_BAG[Math.floor(rng() * FILL_BAG.length)]!;
      }
    }
    if (!accidentalExtraWord(letters, placed)) return letters;
  }

  // Last resort: still fill, even if a decoy slipped through.
  const letters = grid.map((row) => [...row]);
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (locked.has(`${r}:${c}`)) continue;
      letters[r]![c] = FILL_BAG[Math.floor(rng() * FILL_BAG.length)]!;
    }
  }
  return letters;
}

function buildBoard(theme: (typeof THEMES)[number], rng: () => number): SearchBoard | null {
  const pool = theme.words.filter((word) => word.length <= SIZE);
  const words = sample(rng, pool, Math.min(TARGET_WORDS, pool.length)).sort(
    (a, b) => b.length - a.length || a.localeCompare(b),
  );
  const grid = emptyGrid();
  const heat = emptyHeat();
  const placed: SearchPlacement[] = [];
  const directionCount = Array.from({ length: 8 }, () => 0);
  const regionCount = Array.from({ length: 9 }, () => 0);

  if (!solve(words, 0, grid, heat, placed, directionCount, regionCount, rng)) return null;

  return {
    id: theme.id,
    title: theme.title,
    size: SIZE,
    letters: fillEmpty(grid, placed, rng),
    words: shuffle(
      rng,
      placed.map((item) => item.word),
    ),
    placed,
  };
}

export function getSearch(dayIndex: number, visitSeed?: number): SearchBoard {
  const rng = seededRng(visitSeed ?? dailySeed(dayIndex, 41));
  const theme = THEMES[Math.floor(rng() * THEMES.length)]!;
  for (let attempt = 0; attempt < 16; attempt++) {
    const board = buildBoard(theme, rng);
    if (board) return board;
  }
  return (
    buildBoard(theme, rng) ?? {
      id: theme.id,
      title: theme.title,
      size: SIZE,
      letters: emptyGrid("A"),
      words: [],
      placed: [],
    }
  );
}
