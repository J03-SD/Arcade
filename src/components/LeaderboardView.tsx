"use client";

import { useEffect, useState } from "react";
import { formatClock } from "@/lib/daily";
import { LAUNCH_MODES, MODE_META, type GameMode } from "@/lib/modes";
import { loadProgress, type DayRecord } from "@/lib/progress";

function bestFor(records: DayRecord[], mode: GameMode) {
  return records
    .filter((item) => item.mode === mode)
    .sort((a, b) => b.score - a.score || a.timeMs - b.timeMs)[0];
}

export function LeaderboardView({ dayIndex }: { dayIndex: number }) {
  const [today, setToday] = useState<DayRecord[]>([]);
  const [bests, setBests] = useState<Partial<Record<GameMode, DayRecord>>>({});

  useEffect(() => {
    const progress = loadProgress();
    const daily = progress.records
      .filter((item) => item.dayIndex === dayIndex)
      .sort((a, b) => b.score - a.score);
    setToday(daily);
    const next: Partial<Record<GameMode, DayRecord>> = {};
    for (const mode of LAUNCH_MODES) {
      const best = bestFor(progress.records, mode);
      if (best) next[mode] = best;
    }
    setBests(next);
  }, [dayIndex]);

  return (
    <main className="dock-space mx-auto flex w-full max-w-[430px] flex-1 flex-col px-4 pt-6 md:max-w-[540px]">
      <p className="text-[13px] tracking-[-0.02em] text-navy/45">Arcade board</p>
      <h1 className="mt-2 font-season text-[2.4rem] leading-none tracking-[-0.03em]">Leaderboard</h1>
      <p className="mt-3 text-[14px] leading-snug text-navy/55">
        Local scores for this device. Beat your time, then come back tomorrow.
      </p>

      <section className="surface mt-6 rounded-[var(--radius)] p-4">
        <h2 className="font-plex text-[11px] tracking-[0.14em] text-navy/45">TODAY</h2>
        {today.length ? (
          <ol className="mt-4 grid gap-3">
            {today.map((item, index) => (
              <li key={`${item.mode}-${item.dayIndex}`} className="flex items-baseline justify-between gap-3">
                <span className="font-plex text-[12px] text-navy/40">{index + 1}</span>
                <span className="flex-1 font-season text-[1.35rem] leading-none">{MODE_META[item.mode].name}</span>
                <span className="text-right">
                  <span className="block font-plex text-[13px]">{item.score.toLocaleString()}</span>
                  <span className="text-[12px] text-navy/40">{formatClock(item.timeMs)}</span>
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-4 text-[14px] text-navy/50">Play a daily game to post a score.</p>
        )}
      </section>

      <section className="surface mt-4 rounded-[var(--radius)] p-4">
        <h2 className="font-plex text-[11px] tracking-[0.14em] text-navy/45">BEST</h2>
        <ul className="mt-4 grid gap-3">
          {LAUNCH_MODES.map((mode) => {
            const best = bests[mode];
            return (
              <li key={mode} className="flex items-baseline justify-between gap-3">
                <span className="font-season text-[1.35rem] leading-none">{MODE_META[mode].name}</span>
                <span className="text-right text-[14px] text-navy/50">
                  {best ? `${best.score.toLocaleString()} · ${formatClock(best.timeMs)}` : "—"}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
