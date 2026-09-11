export type CrosswordClue = {
  num: number;
  row: number;
  col: number;
  dir: "across" | "down";
  clue: string;
  answer: string;
};

export type CrosswordPack = {
  id: string;
  size: number;
  grid: (string | null)[][];
  clues: CrosswordClue[];
};

const DEFINITIONS: Record<string, string> = {
  ALIAS: "Online name used instead of your real one",
  EMAIL: "Inbox address",
  OSINT: "Publicly available intelligence",
  PIVOT: "A turn from one source to the next",
  TRACE: "Follow the evidence",
  GRAPH: "How relationships get drawn",
  NODE: "A point on a graph",
  LINK: "A clickable path to more data",
  META: "Information attached to a file",
  PHOTO: "A picture that may carry hidden data",
  PIXEL: "Smallest piece of an image",
  PROXY: "Stand-in that hides a source",
  TOKEN: "A small key that unlocks a session",
  NOISE: "What you swipe away",
  HASH: "A #topic marker, informally",
  OPEN: "Sources that anyone can see",
  DATA: "Raw facts before they become intel",
  CLUE: "A hint you can follow",
  LEAD: "The first thread of a case",
  MAP: "A picture of the network",
  LOG: "A record of what happened",
  KEY: "What unlocks a record",
  TAG: "A label on a post",
  BIO: "A short profile blurb",
  NET: "The wider web, casually",
};

function parse(rows: string[]): (string | null)[][] {
  const width = Math.max(...rows.map((row) => row.length));
  return rows.map((row) =>
    Array.from({ length: width }, (_, i) => {
      const ch = row[i];
      if (!ch || ch === "." || ch === "#") return null;
      return ch;
    }),
  );
}

function extract(id: string, rows: string[]): CrosswordPack {
  const grid = parse(rows);
  const size = Math.max(grid.length, grid[0]?.length ?? 0);
  const clues: CrosswordClue[] = [];
  let num = 1;
  const starts = new Map<string, number>();

  const isLetter = (r: number, c: number) => Boolean(grid[r]?.[c]);
  const numberAt = (r: number, c: number) => {
    const key = `${r}:${c}`;
    if (!starts.has(key)) starts.set(key, num++);
    return starts.get(key)!;
  };

  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < (grid[r]?.length ?? 0); c++) {
      if (!isLetter(r, c)) continue;
      const acrossStart = !isLetter(r, c - 1) && isLetter(r, c + 1);
      const downStart = !isLetter(r - 1, c) && isLetter(r + 1, c);
      if (!acrossStart && !downStart) continue;
      const n = numberAt(r, c);

      if (acrossStart) {
        let word = "";
        let cc = c;
        while (isLetter(r, cc)) {
          word += grid[r]![cc];
          cc++;
        }
        if (DEFINITIONS[word]) {
          clues.push({ num: n, row: r, col: c, dir: "across", clue: DEFINITIONS[word], answer: word });
        }
      }
      if (downStart) {
        let word = "";
        let rr = r;
        while (isLetter(rr, c)) {
          word += grid[rr]![c];
          rr++;
        }
        if (DEFINITIONS[word]) {
          clues.push({ num: n, row: r, col: c, dir: "down", clue: DEFINITIONS[word], answer: word });
        }
      }
    }
  }

  return { id, size, grid, clues };
}

export const CROSSWORDS: CrosswordPack[] = [
  extract("cw1", ["PIVOT", "I...R", "V...A", "O...C", "TRACE"]),
  extract("cw2", ["OSINT", "S...R", "I...A", "N...C", "TRACE"]),
  extract("cw3", ["TOKEN", "R...O", "A...I", "C...S", "E...E"]),
  extract("cw4", ["PIXEL", "I...I", "X...N", "E...K"]),
  extract("cw5", ["GRAPH", "R...A", "A...S", "P...H"]),
  extract("cw6", ["EMAIL", ".A..I", ".P..N", "....K"]),
  extract("cw7", ["ALIAS", "P...I", "I...G", "X...N", "ELINK"]),
  extract("cw8", ["CLUE.", "L...D", "U...A", "E...T", ".LEAD"]),
  extract("cw9", ["DATA.", "A...O", "T...P", "A...E", ".OPEN"]),
  extract("cw10", ["META.", "A...O", "P...G", ".HASH", "....."]),
];

const READY = CROSSWORDS.filter((pack) => pack.clues.length >= 3);

export function getCrossword(dayIndex: number): CrosswordPack {
  return READY[((dayIndex % READY.length) + READY.length) % READY.length]!;
}
