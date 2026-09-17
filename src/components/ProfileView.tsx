"use client";

import { useEffect, useState } from "react";
import { applySfxVolume, sfx } from "@/lib/audio";
import { loadProgress, setAudioLevels, toggleMuted } from "@/lib/progress";
import { applyMusicVolume, applyThemeMute } from "@/lib/theme";
import { haptics } from "@/lib/haptics";

function percent(value: number) {
  return Math.round(value * 100);
}

export function ProfileView() {
  const [muted, setMuted] = useState(false);
  const [musicVolume, setMusicVolume] = useState(1);
  const [sfxVolume, setSfxVolume] = useState(1);

  useEffect(() => {
    const progress = loadProgress();
    setMuted(progress.muted);
    setMusicVolume(progress.musicVolume);
    setSfxVolume(progress.sfxVolume);
  }, []);

  return (
    <main className="dock-space mx-auto flex w-full max-w-[430px] flex-1 flex-col px-4 pt-6 md:max-w-[540px]">
      <h1 className="font-season text-[2.4rem] leading-none tracking-[-0.03em]">Settings</h1>

      <section className="surface mt-6 rounded-[var(--radius)] p-4">
        <button
          type="button"
          className="pressable flex w-full items-center justify-between text-left"
          onClick={() => {
            const next = toggleMuted();
            setMuted(next.muted);
            applyThemeMute();
            applySfxVolume();
            if (!next.muted) sfx.tap();
            haptics.tap();
          }}
        >
          <span className="text-[15px]">Sound</span>
          <span className="font-plex text-[13px] text-navy/50">{muted ? "Off" : "On"}</span>
        </button>

        <label className="mt-5 block">
          <span className="flex items-center justify-between text-[15px]">
            Music
            <span className="font-plex text-[13px] text-navy/50">{percent(musicVolume)}%</span>
          </span>
          <input
            type="range"
            min={0}
            max={100}
            value={percent(musicVolume)}
            className="volume-slider mt-3 w-full"
            aria-label="Music volume"
            onChange={(event) => {
              const next = setAudioLevels({ musicVolume: Number(event.target.value) / 100 });
              setMusicVolume(next.musicVolume);
              applyMusicVolume();
            }}
          />
        </label>

        <label className="mt-5 block">
          <span className="flex items-center justify-between text-[15px]">
            Sound effects
            <span className="font-plex text-[13px] text-navy/50">{percent(sfxVolume)}%</span>
          </span>
          <input
            type="range"
            min={0}
            max={100}
            value={percent(sfxVolume)}
            className="volume-slider mt-3 w-full"
            aria-label="Sound effects volume"
            onChange={(event) => {
              const next = setAudioLevels({ sfxVolume: Number(event.target.value) / 100 });
              setSfxVolume(next.sfxVolume);
              applySfxVolume();
            }}
            onPointerUp={() => {
              if (!muted) sfx.tap();
            }}
          />
        </label>
      </section>
    </main>
  );
}
