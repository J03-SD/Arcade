"use client";

import { useEffect, useState } from "react";
import { isMuted, sfx } from "@/lib/audio";
import { loadProgress, toggleMuted } from "@/lib/progress";
import { applyThemeMute } from "@/lib/theme";
import { haptics } from "@/lib/haptics";

export function ProfileView() {
  const [muted, setMuted] = useState(false);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [solved, setSolved] = useState(0);
  const [finds, setFinds] = useState(0);

  useEffect(() => {
    const progress = loadProgress();
    setMuted(progress.muted);
    setStreak(progress.streak);
    setBestStreak(progress.bestStreak);
    setSolved(progress.records.length);
    setFinds(progress.dragonFinds);
  }, []);

  return (
    <main className="dock-space mx-auto flex w-full max-w-[430px] flex-1 flex-col px-4 pt-6 md:max-w-[540px]">
      <p className="text-[13px] tracking-[-0.02em] text-navy/45">Your arcade</p>
      <h1 className="mt-2 font-season text-[2.4rem] leading-none tracking-[-0.03em]">Profile</h1>

      <section className="surface mt-6 grid grid-cols-3 gap-3 rounded-[var(--radius)] p-4 text-center">
        <div>
          <p className="font-season text-[1.8rem] leading-none">{streak}</p>
          <p className="mt-2 text-[12px] text-navy/45">Streak</p>
        </div>
        <div>
          <p className="font-season text-[1.8rem] leading-none">{bestStreak}</p>
          <p className="mt-2 text-[12px] text-navy/45">Best</p>
        </div>
        <div>
          <p className="font-season text-[1.8rem] leading-none">{solved}</p>
          <p className="mt-2 text-[12px] text-navy/45">Solved</p>
        </div>
      </section>

      <p className="mt-4 text-[13px] text-navy/45">{finds} dragon find{finds === 1 ? "" : "s"}</p>

      <section className="surface mt-6 rounded-[var(--radius)] p-4">
        <h2 className="font-plex text-[11px] tracking-[0.14em] text-navy/45">SETTINGS</h2>
        <button
          type="button"
          className="pressable mt-4 flex w-full items-center justify-between text-left"
          onClick={() => {
            const next = toggleMuted();
            setMuted(next.muted);
            applyThemeMute();
            if (!next.muted) sfx.tap();
            haptics.tap();
          }}
        >
          <span className="text-[15px]">Sound</span>
          <span className="font-plex text-[13px] text-navy/50">{muted ? "Off" : "On"}</span>
        </button>
      </section>
    </main>
  );
}
