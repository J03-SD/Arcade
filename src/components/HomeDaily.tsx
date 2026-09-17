"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GameMark } from "./GameMark";
import { formatClock } from "@/lib/daily";
import { isComingSoonMode, LAUNCH_MODES, MODE_META, type LaunchMode } from "@/lib/modes";
import { loadProgress } from "@/lib/progress";

const CARD_CLASS: Record<LaunchMode, string> = {
  crossword: "game-card game-card--crossword",
  search: "game-card game-card--search",
  bedazel: "game-card game-card--bedazel",
};

export function HomeDaily({ dayIndex }: { dayIndex: number }) {
  const [status, setStatus] = useState<Partial<Record<LaunchMode, string>>>({});

  useEffect(() => {
    const progress = loadProgress();
    const next: Partial<Record<LaunchMode, string>> = {};
    for (const mode of LAUNCH_MODES) {
      if (isComingSoonMode(mode)) {
        next[mode] = "Coming soon";
        continue;
      }
      const record = progress.records.find(
        (item) => item.dayIndex === dayIndex && item.mode === mode,
      );
      next[mode] = record ? `Solved in ${formatClock(record.timeMs)}` : MODE_META[mode].blurb;
    }
    setStatus(next);
  }, [dayIndex]);

  return (
    <main className="dock-space mx-auto flex w-full max-w-[430px] flex-1 flex-col justify-center px-4 pt-2 md:max-w-[540px]">
      <div className="surface grid w-full grid-rows-3 gap-3.5 rounded-[var(--radius)] p-3.5 md:min-h-[min(640px,calc(100dvh-200px))]">
        {LAUNCH_MODES.map((mode) => {
          const meta = MODE_META[mode];
          const locked = isComingSoonMode(mode);
          const className = `${CARD_CLASS[mode]} flex min-h-[168px] flex-col items-center justify-center px-5 py-7 text-center text-navy md:min-h-0${
            locked ? " game-card--locked" : ""
          }`;
          const body = (
            <>
              <span className="game-card__icon" aria-hidden>
                <GameMark mode={mode} className="h-11 w-11" />
              </span>
              <h2
                className={`mt-5 font-season text-[2rem] leading-none tracking-[-0.03em]${
                  locked ? " text-navy/40" : ""
                }`}
              >
                {meta.name}
              </h2>
              <p
                className={`mt-2.5 text-[14px] leading-snug ${
                  locked ? "text-navy/35" : "text-navy/55"
                }`}
              >
                {status[mode] ?? (locked ? "Coming soon" : meta.blurb)}
              </p>
            </>
          );

          if (locked) {
            return (
              <div
                key={mode}
                className={className}
                aria-disabled="true"
                aria-label={`${meta.name}, coming soon`}
              >
                {body}
              </div>
            );
          }

          return (
            <Link key={mode} href={`/play/${mode}`} className={className}>
              {body}
            </Link>
          );
        })}
      </div>
    </main>
  );
}
