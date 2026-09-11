"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useScoreHud } from "@/components/ScoreProvider";
import { getCrossword, type CrosswordClue } from "@/content/crossword";
import { sfx } from "@/lib/audio";
import { haptics } from "@/lib/haptics";
import { cellCentersFromRoot, wordScoreBursts } from "@/lib/score-fx";
import type { CompleteHandler } from "@/games/types";

const KEYS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function clueComplete(clue: CrosswordClue, fill: (string | null)[][]) {
  const dr = clue.dir === "down" ? 1 : 0;
  const dc = clue.dir === "across" ? 1 : 0;
  for (let i = 0; i < clue.answer.length; i++) {
    if (fill[clue.row + dr * i]?.[clue.col + dc * i] !== clue.answer[i]) return false;
  }
  return true;
}

export function CrosswordGame({
  dayIndex,
  onComplete,
}: {
  dayIndex: number;
  onComplete: CompleteHandler;
}) {
  const [packShift, setPackShift] = useState(0);
  const pack = useMemo(() => getCrossword(dayIndex + packShift), [dayIndex, packShift]);
  const { burstWord, reset } = useScoreHud();
  const boardRef = useRef<HTMLDivElement>(null);
  const [fill, setFill] = useState<(string | null)[][]>(() =>
    pack.grid.map((row) => row.map((cell) => (cell ? "" : null))),
  );
  const [active, setActive] = useState<[number, number] | null>(null);
  const [clueId, setClueId] = useState(0);
  const [reveal, setReveal] = useState(false);

  const shuffleBoard = useCallback(() => {
    setPackShift((value) => value + 1);
    setActive(null);
    setClueId(0);
    setReveal(false);
    reset();
    sfx.select();
    haptics.tap();
  }, [reset]);

  useEffect(() => {
    setFill(pack.grid.map((row) => row.map((cell) => (cell ? "" : null))));
    setActive(null);
    setClueId(0);
    setReveal(false);
  }, [pack]);

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

  const clue = pack.clues[clueId] ?? pack.clues[0];
  const numbers = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of pack.clues) {
      const key = `${item.row}:${item.col}`;
      if (!map.has(key)) map.set(key, item.num);
    }
    return map;
  }, [pack]);

  const write = (letter: string) => {
    if (!active) return;
    const [r, c] = active;
    if (fill[r]![c] === null) return;
    const next = fill.map((row) => [...row]);
    next[r]![c] = letter;
    setFill(next);
    sfx.tap();
    haptics.tap();
    const solved = pack.clues.filter((item) => !clueComplete(item, fill) && clueComplete(item, next));
    if (solved.length) {
      const already = pack.clues.filter((item) => clueComplete(item, fill)).length;
      const root = boardRef.current;
      solved.forEach((item, i) => {
        const streak = already + i + 1;
        const dr = item.dir === "down" ? 1 : 0;
        const dc = item.dir === "across" ? 1 : 0;
        const cells: [number, number][] = item.answer.split("").map((_, k) => [item.row + dr * k, item.col + dc * k]);
        if (!root) return;
        burstWord(
          wordScoreBursts(cellCentersFromRoot(root, cells), {
            streak,
            cells,
            boardSize: pack.size,
          }),
          { streak },
        );
      });
    }

    if (clue) {
      const dr = clue.dir === "down" ? 1 : 0;
      const dc = clue.dir === "across" ? 1 : 0;
      const nr = r + dr;
      const nc = c + dc;
      if (next[nr]?.[nc] !== undefined && next[nr]![nc] !== null) setActive([nr, nc]);
    }

    const done = pack.grid.every((row, rr) =>
      row.every((cell, cc) => cell === null || next[rr]![cc] === cell),
    );
    if (done) {
      const marks = pack.grid.flat().map((cell) => (cell ? "🟩" : "⬛"));
      onComplete({
        score: 1500,
        stars: 3,
        subtitle: "Grid complete",
        marks,
      });
    }
  };

  const erase = () => {
    if (!active) return;
    const [r, c] = active;
    const next = fill.map((row) => [...row]);
    if (next[r]![c] === null) return;
    const had = Boolean(next[r]![c]);
    next[r]![c] = "";
    setFill(next);
    if (had) {
      sfx.erase();
      haptics.tap();
    } else {
      sfx.tap();
    }
  };

  return (
    <div>
      <p className="text-sm text-white/55">
        {clue ? `${clue.num} ${clue.dir} · ${clue.clue}` : ""}
      </p>
      <div
        ref={boardRef}
        className="play-board mx-auto mt-8 grid w-full max-w-[280px] gap-px"
        style={{ gridTemplateColumns: `repeat(${pack.grid[0]?.length ?? pack.size}, minmax(0, 1fr))` }}
      >
        {fill.map((row, r) =>
          row.map((cell, c) => {
            if (cell === null) {
              return <div key={`${r}-${c}`} className="aspect-square bg-ink" />;
            }
            const selected = active?.[0] === r && active?.[1] === c;
            const num = numbers.get(`${r}:${c}`);
            return (
              <button
                key={`${r}-${c}`}
                type="button"
                data-r={r}
                data-c={c}
                onClick={() => {
                  setActive([r, c]);
                  const idx = pack.clues.findIndex((item) => item.row === r && item.col === c);
                  if (idx >= 0) setClueId(idx);
                  sfx.select();
                  haptics.tap();
                }}
                className={`cw-cell relative aspect-square rounded-[10px] font-plex text-sm ${
                  selected ? "is-selected bg-red text-white" : "bg-panel text-white"
                }`}
              >
                {num ? (
                  <span className="absolute left-1 top-0.5 text-[8px] text-white/35">{num}</span>
                ) : null}
                {reveal ? pack.grid[r]![c] : cell}
              </button>
            );
          }),
        )}
      </div>
      <div className="mt-5 flex gap-2">
        {pack.clues.map((item, i) => (
          <button
            key={`${item.num}-${item.dir}`}
            type="button"
            onClick={() => {
              setClueId(i);
              setActive([item.row, item.col]);
              sfx.select();
              haptics.tap();
            }}
            className={`pressable font-plex text-[11px] ${
              i === clueId ? "text-white" : "text-white/35"
            }`}
          >
            {item.num}
            {item.dir === "across" ? "A" : "D"}
          </button>
        ))}
      </div>
      <div className="action-bar mt-6 grid gap-px" style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}>
        {KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => write(key)}
            className="cw-key rounded-[10px] bg-panel py-2.5 font-plex text-xs text-white"
          >
            {key}
          </button>
        ))}
        <button type="button" onClick={erase} className="cw-key rounded-[10px] bg-panel py-2.5 text-xs text-white/55">
          Del
        </button>
      </div>
    </div>
  );
}
