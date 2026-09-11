"use client";

import { useMemo, useState } from "react";
import { getAliasPack } from "@/content/alias";
import { useScoreHud } from "@/components/ScoreProvider";
import { sfx, vo } from "@/lib/audio";
import { haptics } from "@/lib/haptics";
import type { CompleteHandler } from "@/games/types";

export function AliasGame({
  dayIndex,
  onComplete,
}: {
  dayIndex: number;
  onComplete: CompleteHandler;
}) {
  const pack = useMemo(() => getAliasPack(dayIndex), [dayIndex]);
  const { bump } = useScoreHud();
  const [openId, setOpenId] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [resolved, setResolved] = useState<number[]>([]);
  const [flash, setFlash] = useState<"good" | "bad" | null>(null);

  const needed = useMemo(() => new Set(pack.accounts.map((a) => a.group)), [pack]);

  const toggle = (id: string) => {
    const account = pack.accounts.find((item) => item.id === id);
    if (!account || resolved.includes(account.group)) return;
    sfx.tap();
    haptics.tap();
    setOpenId(id);
    setSelected((list) => (list.includes(id) ? list.filter((item) => item !== id) : [...list, id]));
  };

  const fuse = () => {
    const chosen = pack.accounts.filter((item) => selected.includes(item.id));
    if (chosen.length < 2) return;
    const groups = new Set(chosen.map((item) => item.group));
    if (groups.size !== 1) {
      sfx.miss();
      vo.weakCorrelation();
      haptics.miss();
      setFlash("bad");
      setSelected([]);
      window.setTimeout(() => setFlash(null), 700);
      return;
    }
    const group = chosen[0]!.group;
    const members = pack.accounts.filter((item) => item.group === group);
    if (chosen.length !== members.length) {
      sfx.select();
      setFlash("bad");
      window.setTimeout(() => setFlash(null), 700);
      return;
    }
    sfx.fuse();
    vo.identityMatch();
    haptics.combo();
    bump(360);
    setFlash("good");
    const next = [...resolved, group];
    setResolved(next);
    setSelected([]);
    window.setTimeout(() => setFlash(null), 700);
    if (next.length === needed.size) {
      onComplete({
        score: 1600 + next.length * 120,
        stars: 3,
        subtitle: `${next.length} identities resolved`,
        marks: Array.from({ length: next.length }, () => "●"),
      });
    }
  };

  return (
    <div>
      <p className="font-plex text-[11px] uppercase tracking-[0.16em] text-grey-600">
        {pack.difficulty} · {resolved.length}/{needed.size} identities
      </p>
      <h1 className="mt-1 font-season text-4xl leading-none">{pack.title}</h1>
      <p className="mt-2 text-sm text-grey-700">{pack.hint}</p>
      {flash ? (
        <p className={`mt-3 font-plex text-xs ${flash === "good" ? "text-green" : "text-red"}`}>
          {flash === "good" ? "Identity match 98%" : "Weak correlation. Try again."}
        </p>
      ) : null}
      <div className="mt-4 grid grid-cols-2 gap-2">
        {pack.accounts.map((account) => {
          const done = resolved.includes(account.group);
          const active = selected.includes(account.id);
          return (
            <button
              key={account.id}
              type="button"
              onClick={() => toggle(account.id)}
              className={`pressable rounded-[0.45rem] border px-3 py-3 text-left ${
                done
                  ? "border-green bg-green/10"
                  : active
                    ? "border-red bg-white pulse-red"
                    : "border-steel-light bg-white"
              }`}
            >
              <div className="text-xl">{account.avatar}</div>
              <div className="font-plex text-xs">{account.handle}</div>
              {openId === account.id || done ? (
                <div className="mt-1 text-[11px] text-grey-700">
                  Joined {account.joined}
                  <br />
                  {account.bio}
                  {account.extra ? (
                    <>
                      <br />
                      {account.extra}
                    </>
                  ) : null}
                </div>
              ) : (
                <div className="mt-1 text-[11px] text-grey-600">Tap for clues</div>
              )}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={fuse}
        className="pressable mt-4 w-full rounded-sm bg-navy py-3 text-sm text-white"
      >
        Fuse selected
      </button>
    </div>
  );
}
