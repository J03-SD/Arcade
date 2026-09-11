"use client";

import { useMemo, useState } from "react";
import { dailySeed } from "@/lib/daily";
import { seededRng } from "@/lib/rng";
import { sfx } from "@/lib/audio";
import { haptics } from "@/lib/haptics";
import { useScoreHud } from "@/components/ScoreProvider";
import type { CompleteHandler } from "@/games/types";

const TYPES = ["user", "domain", "place", "tag", "email", "url"] as const;
type TileType = (typeof TYPES)[number] | "alias" | "identity";

const GLYPH: Record<TileType, string> = {
  user: "@",
  domain: "🌐",
  place: "📍",
  tag: "#",
  email: "✉️",
  url: "🔗",
  alias: "A",
  identity: "👤",
};

const ROWS = 7;
const COLS = 5;

type Cell = { type: TileType; id: number; crust: number; target?: boolean };

let seq = 1;
function makeTile(type: TileType, crust = 0, target = false): Cell {
  return { type, id: seq++, crust, target };
}

function randomType(rng: () => number): TileType {
  return TYPES[Math.floor(rng() * TYPES.length)]!;
}

function findMatches(board: Cell[][]) {
  const marked = new Set<string>();
  const runs: { cells: [number, number][]; type: TileType }[] = [];

  const mark = (cells: [number, number][], type: TileType) => {
    if (cells.length < 3) return;
    runs.push({ cells, type });
    cells.forEach(([r, c]) => marked.add(`${r}:${c}`));
  };

  for (let r = 0; r < ROWS; r++) {
    let run: [number, number][] = [[r, 0]];
    for (let c = 1; c < COLS; c++) {
      if (board[r]![c]!.type === board[r]![c - 1]!.type) run.push([r, c]);
      else {
        mark(run, board[r]![run[0]![1]]!.type);
        run = [[r, c]];
      }
    }
    mark(run, board[r]![run[0]![1]]!.type);
  }

  for (let c = 0; c < COLS; c++) {
    let run: [number, number][] = [[0, c]];
    for (let r = 1; r < ROWS; r++) {
      if (board[r]![c]!.type === board[r - 1]![c]!.type) run.push([r, c]);
      else {
        mark(run, board[run[0]![0]]![c]!.type);
        run = [[r, c]];
      }
    }
    mark(run, board[run[0]![0]]![c]!.type);
  }

  return { marked, runs };
}

function applyGravity(board: (Cell | null)[][], rng: () => number) {
  const next: Cell[][] = board.map((row) => row.map((cell) => cell as Cell));
  for (let c = 0; c < COLS; c++) {
    const stack: Cell[] = [];
    for (let r = ROWS - 1; r >= 0; r--) {
      const cell = board[r]![c];
      if (cell) stack.push(cell);
    }
    for (let r = ROWS - 1; r >= 0; r--) {
      next[r]![c] = stack.shift() ?? makeTile(randomType(rng));
    }
  }
  return next;
}

function createBoard(seed: number) {
  const rng = seededRng(seed);
  const board: Cell[][] = [];
  for (let r = 0; r < ROWS; r++) {
    board[r] = [];
    for (let c = 0; c < COLS; c++) {
      const crust = r >= ROWS - 2 ? 2 : 0;
      board[r]![c] = makeTile(randomType(rng), crust, r === ROWS - 1 && c === 2);
    }
  }
  return { board, rng };
}

export function CrushGame({
  dayIndex,
  onComplete,
}: {
  dayIndex: number;
  onComplete: CompleteHandler;
}) {
  const start = useMemo(() => createBoard(dailySeed(dayIndex, 44)), [dayIndex]);
  const { bump } = useScoreHud();
  const [board, setBoard] = useState(start.board);
  const [rng] = useState(() => start.rng);
  const [picked, setPicked] = useState<[number, number] | null>(null);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [moves, setMoves] = useState(24);

  const resolve = (input: Cell[][], gained: number, extraCombo: number) => {
    let current = input;
    let total = gained;
    let chain = extraCombo;
    for (let step = 0; step < 8; step++) {
      const { marked, runs } = findMatches(current);
      if (!marked.size) break;
      chain += 1;
      total += marked.size * 20 * chain;
      const next: (Cell | null)[][] = current.map((row) => row.map((cell) => cell));
      const chip = (r: number, c: number) => {
        const cell = next[r]?.[c];
        if (!cell || cell.crust <= 0) return;
        next[r]![c] = { ...cell, crust: cell.crust - 1 };
      };
      marked.forEach((key) => {
        const [r, c] = key.split(":").map(Number) as [number, number];
        const cell = next[r]![c];
        if (!cell) return;
        if (cell.crust > 0) chip(r, c);
        else next[r]![c] = null;
        chip(r + 1, c);
        chip(r - 1, c);
        chip(r, c + 1);
        chip(r, c - 1);
      });
      runs.forEach((run) => {
        if (run.type === "user" && run.cells.length >= 3) {
          const [r, c] = run.cells[0]!;
          next[r]![c] = makeTile("alias", next[r]![c]?.crust ?? 0);
        }
        if (run.cells.length === 4) {
          run.cells.forEach(([r]) => {
            for (let col = 0; col < COLS; col++) next[r]![col] = null;
          });
        }
        if (run.cells.length >= 5) {
          for (let row = 0; row < ROWS; row++) {
            for (let col = 0; col < COLS; col++) {
              if (next[row]![col]?.type === run.type) next[row]![col] = null;
            }
          }
        }
      });
      current = applyGravity(next, rng);
    }
    setBoard(current);
    setScore((value) => value + total);
    setCombo(chain);
    if (total > 0) bump(total);
    const revealed = current.some((row) => row.some((cell) => cell.target && cell.crust === 0));
    if (revealed) {
      onComplete({
        score: score + total + 800,
        stars: moves > 8 ? 3 : moves > 4 ? 2 : 1,
        subtitle: "Target uncovered",
        marks: ["●", "●", "●"],
      });
    }
    return current;
  };

  const tap = (r: number, c: number) => {
    if (moves <= 0) return;
    if (!picked) {
      setPicked([r, c]);
      sfx.tap();
      return;
    }
    const [pr, pc] = picked;
    setPicked(null);
    if (Math.abs(pr - r) + Math.abs(pc - c) !== 1) {
      setPicked([r, c]);
      return;
    }
    const a = board[pr]![pc]!;
    const b = board[r]![c]!;
    if (
      (a.type === "alias" && b.type === "email") ||
      (b.type === "alias" && a.type === "email")
    ) {
      const next = board.map((row) => row.map((cell) => cell));
      next[r]![c] = makeTile("identity", Math.max(0, b.crust - 1), b.target);
      next[pr]![pc] = makeTile(randomType(rng));
      sfx.fuse();
      haptics.combo();
      setMoves((value) => value - 1);
      resolve(next, 220, 1);
      return;
    }
    const swapped = board.map((row) => row.map((cell) => cell));
    swapped[pr]![pc] = b;
    swapped[r]![c] = a;
    const { marked } = findMatches(swapped);
    if (!marked.size) {
      sfx.miss();
      haptics.miss();
      return;
    }
    sfx.match();
    haptics.match();
    const left = moves - 1;
    setMoves(left);
    resolve(swapped, 40, 0);
    if (left <= 0) {
      window.setTimeout(() => {
        onComplete({
          failed: true,
          score,
          subtitle: "The target stayed buried",
          marks: ["○", "○", "○"],
        });
      }, 400);
    }
  };

  return (
    <div>
      <p className="font-plex text-[11px] uppercase tracking-[0.16em] text-grey-600">
        {moves} moves · {score} pts {combo > 1 ? `· combo x${combo}` : ""}
      </p>
      <h1 className="mt-1 font-season text-4xl leading-none">Link Crush</h1>
      <p className="mt-2 text-sm text-grey-700">
        Match three. 3 usernames make an alias. Swap alias + email to mint an identity. Dig to the buried target.
      </p>
      <div className="play-board mt-4 grid w-full gap-1 overflow-hidden rounded-[0.45rem] navy-glow p-2" style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}>
        {board.map((row, r) =>
          row.map((cell, c) => {
            const selected = picked?.[0] === r && picked?.[1] === c;
            return (
              <button
                key={cell.id}
                type="button"
                onClick={() => tap(r, c)}
                className={`pressable aspect-square rounded-sm text-lg ${
                  selected ? "bg-red text-white" : cell.crust > 0 ? "bg-navy text-steel" : "bg-white text-navy"
                }`}
              >
                {cell.target && cell.crust === 0 ? "🎯" : GLYPH[cell.type]}
              </button>
            );
          }),
        )}
      </div>
    </div>
  );
}
