"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import { getPivotCase, pivotMap, type PivotNode } from "@/content/pivot";
import { useScoreHud } from "@/components/ScoreProvider";
import { sfx } from "@/lib/audio";
import { haptics } from "@/lib/haptics";
import type { CompleteHandler } from "@/games/types";

const MAX = 5;

function starsFor(pivots: number) {
  if (pivots <= 3) return 3;
  if (pivots === 4) return 2;
  return 1;
}

export function PivotGame({
  dayIndex,
  onComplete,
}: {
  dayIndex: number;
  onComplete: CompleteHandler;
}) {
  const pack = useMemo(() => getPivotCase(dayIndex), [dayIndex]);
  const { bump } = useScoreHud();
  const nodes = useMemo(() => pivotMap(pack), [pack]);
  const [current, setCurrent] = useState(pack.start);
  const [opened, setOpened] = useState<string[]>([pack.start]);
  const [pivots, setPivots] = useState(0);
  const [path, setPath] = useState<string[]>([pack.start]);

  const node = nodes.get(current)!;
  const exits = (node.exits ?? []).map((id) => nodes.get(id)).filter(Boolean) as PivotNode[];
  const remaining = MAX - pivots;

  const choose = (next: PivotNode) => {
    if (remaining <= 0) return;
    haptics.match();
    sfx.pivot();
    bump(90);
    const used = pivots + 1;
    setPivots(used);
    setCurrent(next.id);
    setOpened((list) => (list.includes(next.id) ? list : [...list, next.id]));
    setPath((list) => [...list, next.id]);

    if (next.id === pack.target || next.kind === "target") {
      bump(420);
      onComplete({
        score: Math.max(400, 1800 - used * 220),
        stars: starsFor(used),
        subtitle: `Found in ${used} pivot${used === 1 ? "" : "s"}`,
        marks: Array.from({ length: used }, () => "●"),
      });
      return;
    }

    if (used >= MAX && next.id !== pack.target) {
      onComplete({
        failed: true,
        score: 120,
        subtitle: "Five pivots. The trail went cold.",
        marks: Array.from({ length: 5 }, () => "○"),
      });
    }
  };

  return (
    <div>
      <p className="font-plex text-[11px] uppercase tracking-[0.16em] text-grey-600">
        {remaining} pivot{remaining === 1 ? "" : "s"} left
      </p>
      <h1 className="mt-1 font-season text-4xl leading-none">{pack.title}</h1>
      <p className="mt-2 text-sm text-grey-700">{pack.objective}</p>

      <div className="play-board mt-5 rounded-[0.45rem] navy-glow p-4 text-white">
        <div className="flex flex-wrap gap-2">
          {path.map((id, i) => {
            const item = nodes.get(id);
            return (
              <button
                key={`${id}-${i}`}
                type="button"
                onClick={() => {
                  setCurrent(id);
                  sfx.tap();
                }}
                className={`pressable rounded-sm px-2 py-1 font-plex text-[11px] ${
                  id === current ? "bg-red" : "bg-white/10"
                }`}
              >
                {item?.label}
              </button>
            );
          })}
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={node.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mt-5"
          >
            <p className="font-plex text-[10px] uppercase tracking-wider text-steel">
              {node.kind}
            </p>
            <h2 className="mt-1 font-season text-3xl">{node.label}</h2>
            <p className="mt-2 text-sm text-steel-light">{node.blurb}</p>
            {exits.length ? (
              <div className="mt-5 grid gap-2">
                {exits.map((exit) => (
                  <button
                    key={exit.id}
                    type="button"
                    onClick={() => choose(exit)}
                    className="pressable rounded-sm bg-white px-3 py-3 text-left text-navy"
                  >
                    <span className="font-plex text-[10px] uppercase text-grey-600">
                      Pivot to
                    </span>
                    <div className="font-season text-xl leading-none">{exit.label}</div>
                  </button>
                ))}
              </div>
            ) : node.kind === "dead" ? (
              <p className="mt-5 font-plex text-xs text-steel">Dead end. Step back along the path.</p>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>
      <p className="mt-3 font-plex text-[10px] text-grey-600">
        Opened {opened.length} nodes · {pack.objective}
      </p>
    </div>
  );
}
