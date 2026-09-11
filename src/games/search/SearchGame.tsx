"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useScoreHud } from "@/components/ScoreProvider";
import { getSearch } from "@/content/search";
import { sfx, unlockAudio, WRONG_UNWIND_MS } from "@/lib/audio";
import { cellCentersFromRoot, wordScoreBursts } from "@/lib/score-fx";
import { haptics } from "@/lib/haptics";
import type { CompleteHandler } from "@/games/types";

const GAP_PX = 6;
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

function samePath(a: [number, number][], b: [number, number][]) {
  if (a.length !== b.length) return false;
  const rev = [...b].reverse();
  return (
    a.every(([r, c], i) => r === b[i]![0] && c === b[i]![1]) ||
    a.every(([r, c], i) => r === rev[i]![0] && c === rev[i]![1])
  );
}

function isReversePath(placed: [number, number][], dragged: [number, number][]) {
  if (placed.length !== dragged.length || placed.length < 2) return false;
  const rev = [...placed].reverse();
  return dragged.every(([r, c], i) => r === rev[i]![0] && c === rev[i]![1]);
}

function stepGapsMs(stamps: number[], length: number) {
  const gaps = Array.from({ length }, () => 0);
  for (let i = 1; i < length; i++) {
    const prev = stamps[i - 1];
    const next = stamps[i];
    gaps[i] = prev != null && next != null ? Math.max(0, next - prev) : 420;
  }
  return gaps;
}

function keyOf(r: number, c: number) {
  return `${r}:${c}`;
}

function pathsEqual(a: [number, number][], b: [number, number][]) {
  return a.length === b.length && a.every(([r, c], i) => r === b[i]![0] && c === b[i]![1]);
}

type Point = { x: number; y: number };

function PathLines({
  cells,
  centers,
  tone,
}: {
  cells: [number, number][];
  centers: Record<string, Point>;
  tone: "active" | "solved" | "reveal";
}) {
  if (cells.length < 2) return null;
  return (
    <>
      {cells.slice(1).map((cell, i) => {
        const prev = cells[i]!;
        const a = centers[keyOf(prev[0], prev[1])];
        const b = centers[keyOf(cell[0], cell[1])];
        if (!a || !b) return null;
        return (
          <line
            key={`${prev[0]}-${prev[1]}-${cell[0]}-${cell[1]}`}
            className={`search-line search-line--${tone}`}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            strokeWidth="5.5"
            strokeLinecap="round"
            vectorEffect="nonScalingStroke"
          />
        );
      })}
    </>
  );
}

function bestDirection(dx: number, dy: number): [number, number] {
  let best: [number, number] = [0, 1];
  let bestScore = -Infinity;
  for (const [dr, dc] of DIRS) {
    const len = Math.hypot(dc, dr) || 1;
    const score = (dx * dc + dy * dr) / len;
    if (score > bestScore) {
      bestScore = score;
      best = [dr, dc];
    }
  }
  return best;
}

function freshSeed(dayIndex: number) {
  const clock = Date.now();
  const jitter = Math.floor(Math.random() * 0xffffffff);
  const fine = typeof performance !== "undefined" ? Math.floor(performance.now() * 1000) : 0;
  return (clock ^ jitter ^ fine ^ (dayIndex * 2654435761)) >>> 0;
}

export function SearchGame({
  dayIndex,
  onComplete,
}: {
  dayIndex: number;
  onComplete: CompleteHandler;
}) {
  const [visitSeed, setVisitSeed] = useState(() => freshSeed(dayIndex));
  const board = useMemo(() => getSearch(dayIndex, visitSeed), [dayIndex, visitSeed]);
  const { burstWord, reset } = useScoreHud();
  const [found, setFound] = useState<string[]>([]);
  const [path, setPath] = useState<[number, number][]>([]);
  const [pathTone, setPathTone] = useState<"active" | "solved">("active");
  const [pulse, setPulse] = useState<string | null>(null);
  const [failing, setFailing] = useState(false);
  const [centers, setCenters] = useState<Record<string, Point>>({});
  const [boardSizePx, setBoardSizePx] = useState({ w: 100, h: 100 });
  const [reveal, setReveal] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const pathRef = useRef<[number, number][]>([]);
  const startRef = useRef<[number, number] | null>(null);
  const dirRef = useRef<[number, number] | null>(null);
  const settleTimer = useRef<number | null>(null);
  const failTimer = useRef<number | null>(null);
  const stepAtRef = useRef<number[]>([]);
  const metricsRef = useRef({ width: 1, height: 1, cellW: 1, cellH: 1 });

  const clearTimers = () => {
    if (settleTimer.current) {
      window.clearTimeout(settleTimer.current);
      settleTimer.current = null;
    }
    if (failTimer.current) {
      window.clearTimeout(failTimer.current);
      failTimer.current = null;
    }
  };

  const shuffleBoard = useCallback(() => {
    clearTimers();
    dragging.current = false;
    pathRef.current = [];
    startRef.current = null;
    dirRef.current = null;
    stepAtRef.current = [];
    setFound([]);
    setPath([]);
    setPathTone("active");
    setPulse(null);
    setFailing(false);
    setReveal(false);
    setVisitSeed(freshSeed(dayIndex));
    reset();
    sfx.select();
    haptics.tap();
  }, [dayIndex, reset]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key === "s") {
        event.preventDefault();
        shuffleBoard();
        return;
      }
      if (key === "d") {
        event.preventDefault();
        setReveal((value) => !value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shuffleBoard]);

  const solvedCells = useMemo(() => {
    const set = new Set<string>();
    for (const item of board.placed) {
      if (!found.includes(item.word)) continue;
      for (const [r, c] of item.cells) set.add(keyOf(r, c));
    }
    return set;
  }, [board.placed, found]);

  const foundPaths = useMemo(
    () => board.placed.filter((item) => found.includes(item.word)).map((item) => item.cells),
    [board.placed, found],
  );

  const revealPaths = useMemo(
    () =>
      reveal
        ? board.placed.filter((item) => !found.includes(item.word)).map((item) => item.cells)
        : [],
    [board.placed, found, reveal],
  );

  const revealCells = useMemo(() => {
    const set = new Set<string>();
    for (const cells of revealPaths) {
      for (const [r, c] of cells) set.add(keyOf(r, c));
    }
    return set;
  }, [revealPaths]);

  const measure = () => {
    const root = boardRef.current;
    if (!root) return;
    const rootRect = root.getBoundingClientRect();
    const width = rootRect.width;
    const height = rootRect.height;
    if (width < 1 || height < 1) return;

    const cellW = (width - GAP_PX * (board.size - 1)) / board.size;
    const cellH = (height - GAP_PX * (board.size - 1)) / board.size;
    metricsRef.current = { width, height, cellW, cellH };
    setBoardSizePx({ w: width, h: height });

    const next: Record<string, Point> = {};
    for (let r = 0; r < board.size; r++) {
      for (let c = 0; c < board.size; c++) {
        next[keyOf(r, c)] = {
          x: c * (cellW + GAP_PX) + cellW / 2,
          y: r * (cellH + GAP_PX) + cellH / 2,
        };
      }
    }
    setCenters(next);
  };

  useEffect(() => {
    measure();
    const root = boardRef.current;
    if (!root) return;
    const frame = requestAnimationFrame(measure);
    const observer = new ResizeObserver(() => measure());
    observer.observe(root);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [board.size, found.length]);

  const clearFailUnwind = () => {
    if (failTimer.current) {
      window.clearTimeout(failTimer.current);
      failTimer.current = null;
    }
  };

  useEffect(
    () => () => {
      if (failTimer.current) window.clearTimeout(failTimer.current);
    },
    [],
  );

  const cellCenterPx = (r: number, c: number) => {
    const { cellW, cellH } = metricsRef.current;
    return {
      x: c * (cellW + GAP_PX) + cellW / 2,
      y: r * (cellH + GAP_PX) + cellH / 2,
    };
  };

  const nearestCell = (x: number, y: number): [number, number] => {
    const { cellW, cellH } = metricsRef.current;
    const c = Math.max(0, Math.min(board.size - 1, Math.round((x - cellW / 2) / (cellW + GAP_PX))));
    const r = Math.max(0, Math.min(board.size - 1, Math.round((y - cellH / 2) / (cellH + GAP_PX))));
    return [r, c];
  };

  const buildPathFromPointer = (x: number, y: number) => {
    const start = startRef.current;
    if (!start) return;

    const origin = cellCenterPx(start[0], start[1]);
    const dx = x - origin.x;
    const dy = y - origin.y;
    const dist = Math.hypot(dx, dy);
    const { cellW, cellH } = metricsRef.current;
    const arm = Math.max(Math.min(cellW, cellH) * 0.32, 10);

    // Back on the start letter — unlock direction so you can go another way
    if (dist < arm) {
      dirRef.current = null;
      const only: [number, number][] = [start];
      if (!pathsEqual(pathRef.current, only)) {
        commitPath(only, "disconnect");
      }
      return;
    }

    if (!dirRef.current) {
      dirRef.current = bestDirection(dx, dy);
    }

    const dir = dirRef.current;
    const stepX = dir[1] * (cellW + GAP_PX);
    const stepY = dir[0] * (cellH + GAP_PX);
    const stepLenSq = stepX * stepX + stepY * stepY || 1;
    const projected = (dx * stepX + dy * stepY) / stepLenSq;
    let steps = Math.round(projected);

    // Near origin along the ray — treat as single letter and unlock
    if (steps <= 0) {
      dirRef.current = null;
      const only: [number, number][] = [start];
      if (!pathsEqual(pathRef.current, only)) {
        commitPath(only, "disconnect");
      }
      return;
    }

    const next: [number, number][] = [];
    for (let i = 0; i <= steps; i++) {
      const r = start[0] + dir[0] * i;
      const c = start[1] + dir[1] * i;
      if (r < 0 || c < 0 || r >= board.size || c >= board.size) break;
      next.push([r, c]);
    }
    if (!next.length) next.push(start);

    // If we collapsed to one cell, unlock for a new direction
    if (next.length <= 1) {
      dirRef.current = null;
    }

    const prev = pathRef.current;
    if (pathsEqual(prev, next)) return;
    commitPath(next, next.length >= prev.length ? "connect" : "disconnect");
  };

  const commitPath = (next: [number, number][], kind: "connect" | "disconnect") => {
    clearFailUnwind();
    setFailing(false);
    if (settleTimer.current) {
      window.clearTimeout(settleTimer.current);
      settleTimer.current = null;
    }
    const prevLen = pathRef.current.length;
    const grew = next.length > prevLen;
    const shrank = next.length < prevLen;
    const now = performance.now();
    if (next.length <= 1) {
      stepAtRef.current = [now];
    } else if (grew) {
      while (stepAtRef.current.length < next.length) {
        stepAtRef.current.push(now);
      }
    } else if (shrank) {
      stepAtRef.current = stepAtRef.current.slice(0, next.length);
    }
    pathRef.current = next;
    setPath(next);
    setPathTone("active");
    const tip = next[next.length - 1];
    if (tip && grew) {
      setPulse(keyOf(tip[0], tip[1]));
      window.setTimeout(() => setPulse((current) => (current === keyOf(tip[0], tip[1]) ? null : current)), 120);
    }
    if (kind === "connect" && grew) {
      sfx.connect(next.length);
      haptics.tap();
    } else if (kind === "disconnect" && shrank) {
      sfx.disconnect(next.length + 1);
      haptics.tap();
    }
  };

  const pointerOnBoard = (clientX: number, clientY: number) => {
    const root = boardRef.current;
    if (!root) return null;
    const rect = root.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const unwindFail = (cells: [number, number][]) => {
    clearFailUnwind();
    if (settleTimer.current) {
      window.clearTimeout(settleTimer.current);
      settleTimer.current = null;
    }
    let remaining = cells.map((cell) => [cell[0], cell[1]] as [number, number]);
    pathRef.current = remaining;
    setPath(remaining);
    setPathTone("active");
    setFailing(true);

    const drop = () => {
      if (!remaining.length) {
        pathRef.current = [];
        setPath([]);
        setPulse(null);
        setFailing(false);
        failTimer.current = null;
        return;
      }
      sfx.disconnect(remaining.length);
      haptics.tap();
      const tip = remaining[remaining.length - 1]!;
      setPulse(keyOf(tip[0], tip[1]));
      remaining = remaining.slice(0, -1);
      pathRef.current = remaining;
      setPath(remaining);
      if (!remaining.length) {
        failTimer.current = window.setTimeout(() => {
          setPulse(null);
          setFailing(false);
          failTimer.current = null;
        }, WRONG_UNWIND_MS);
        return;
      }
      failTimer.current = window.setTimeout(drop, WRONG_UNWIND_MS);
    };

    drop();
  };

  const endPath = (nextPath: [number, number][]) => {
    dragging.current = false;
    const match = board.placed.find(
      (item) => samePath(item.cells, nextPath) && !found.includes(item.word),
    );
    dirRef.current = null;
    startRef.current = null;

    if (!match) {
      if (nextPath.length > 1) {
        unwindFail(nextPath);
      } else {
        pathRef.current = [];
        setPath([]);
        setPathTone("active");
        setPulse(null);
        setFailing(false);
      }
      return;
    }

    pathRef.current = [];

    haptics.match();
    const streak = found.length + 1;
    const reverse = isReversePath(match.cells, nextPath);
    const stepMs = stepGapsMs(stepAtRef.current, nextPath.length);
    stepAtRef.current = [];
    const root = boardRef.current;
    if (root) {
      burstWord(
        wordScoreBursts(cellCentersFromRoot(root, nextPath), {
          streak,
          stepMs,
          reverse,
          cells: nextPath,
          boardSize: board.size,
        }),
        { streak },
      );
    }
    const next = [...found, match.word];
    setFound(next);
    setPath(match.cells);
    setPathTone("solved");
    setPulse(null);
    if (settleTimer.current) window.clearTimeout(settleTimer.current);
    settleTimer.current = window.setTimeout(() => {
      setPath([]);
      setPathTone("active");
      settleTimer.current = null;
    }, 450);
    if (next.length >= board.placed.length) {
      onComplete({
        score: 1200 + next.length * 90,
        stars: 3,
        subtitle: board.title,
        marks: board.placed.map((item) => (next.includes(item.word) ? "●" : "○")),
      });
    }
  };

  const pathKeys = new Set(path.map(([r, c]) => keyOf(r, c)));

  return (
    <div className="min-w-0">
      <p className="text-center font-season text-[1.25rem] leading-none tracking-[-0.03em] text-white">
        {board.title}
      </p>

      <div
        ref={boardRef}
        className="play-board relative mt-5 aspect-square w-full touch-none"
        onPointerDown={(event) => {
          void unlockAudio();
          measure();
          dragging.current = true;
          event.currentTarget.setPointerCapture(event.pointerId);
          const point = pointerOnBoard(event.clientX, event.clientY);
          if (!point) return;
          const start = nearestCell(point.x, point.y);
          startRef.current = start;
          dirRef.current = null;
          pathRef.current = [];
          stepAtRef.current = [performance.now()];
          commitPath([start], "connect");
        }}
        onPointerMove={(event) => {
          if (!dragging.current) return;
          const point = pointerOnBoard(event.clientX, event.clientY);
          if (!point) return;
          buildPathFromPointer(point.x, point.y);
        }}
        onPointerUp={() => endPath(pathRef.current)}
        onPointerCancel={() => endPath(pathRef.current)}
      >
        <svg
          className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-visible"
          viewBox={`0 0 ${boardSizePx.w} ${boardSizePx.h}`}
          preserveAspectRatio="none"
          aria-hidden
        >
          {foundPaths.map((cells, index) =>
            pathTone === "solved" && samePath(cells, path) ? null : (
              <PathLines key={`found-${index}`} cells={cells} centers={centers} tone="solved" />
            ),
          )}
          {revealPaths.map((cells, index) => (
            <PathLines key={`reveal-${index}`} cells={cells} centers={centers} tone="reveal" />
          ))}
          <PathLines cells={path} centers={centers} tone={pathTone} />
        </svg>

        <div
          className="relative z-10 grid h-full w-full"
          style={{
            gridTemplateColumns: `repeat(${board.size}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${board.size}, minmax(0, 1fr))`,
            gap: GAP_PX,
          }}
        >
          {board.letters.map((row, r) =>
            row.map((letter, c) => {
              const id = keyOf(r, c);
              const selected = pathKeys.has(id);
              const solved = solvedCells.has(id);
              const hinted = revealCells.has(id);
              const dropping = failing && pulse === id;
              const popping = !failing && pulse === id;
              return (
                <button
                  key={id}
                  type="button"
                  data-r={r}
                  data-c={c}
                  className={`letter-node flex h-full w-full min-w-0 items-center justify-center bg-[#141826] p-0 font-plex text-[11px] sm:text-[13px] ${
                    solved
                      ? "is-solved"
                      : dropping
                        ? "is-dropping"
                        : selected
                          ? "is-active"
                          : hinted
                            ? "is-reveal"
                            : ""
                  } ${popping ? "scale-125" : ""}`}
                >
                  {letter}
                </button>
              );
            }),
          )}
        </div>
      </div>

      <ul className="mt-5 flex flex-wrap justify-center gap-x-3 gap-y-2">
        {board.words.map((word) => (
          <li
            key={word}
            className={`font-plex text-[10px] tracking-[0.12em] ${
              found.includes(word) ? "text-white/30 line-through" : reveal ? "text-[#d4a017]" : "text-white/70"
            }`}
          >
            {word}
          </li>
        ))}
      </ul>
    </div>
  );
}
