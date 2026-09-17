"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useScoreHud } from "@/components/ScoreProvider";
import {
  GEM_COLORS,
  gemColorById,
  getBedazel,
  sampleGemSlots,
  type GemSlot,
} from "@/content/bedazel";
import { sfx } from "@/lib/audio";
import { haptics } from "@/lib/haptics";
import type { CompleteHandler } from "@/games/types";

const PLACE_PTS = 40;
const RECOLOR_PTS = 8;
const CLEAR_BONUS = 500;

export function BedazelGame({
  dayIndex,
  onComplete,
}: {
  dayIndex: number;
  onComplete: CompleteHandler;
}) {
  const pack = useMemo(() => getBedazel(dayIndex), [dayIndex]);
  const { bump } = useScoreHud();
  const [slots, setSlots] = useState<GemSlot[]>([]);
  const [filled, setFilled] = useState<Record<number, string>>({});
  const [colorId, setColorId] = useState(GEM_COLORS[1]?.id ?? "crimson");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const doneRef = useRef(false);
  const boardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    doneRef.current = false;
    setFilled({});
    setLoading(true);
    setError(null);
    void sampleGemSlots(pack)
      .then((next) => {
        if (cancelled) return;
        setSlots(next);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Couldn’t load the logo pattern.");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pack]);

  const placed = Object.keys(filled).length;
  const total = slots.length;
  const selected = gemColorById(colorId);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    bump(CLEAR_BONUS);
    onComplete({
      score: placed * PLACE_PTS + CLEAR_BONUS,
      stars: 3,
      subtitle: pack.title,
      marks: Array.from({ length: Math.min(8, total) }, () => "◆"),
    });
  }, [bump, onComplete, pack.title, placed, total]);

  const onSocket = (slot: GemSlot) => {
    if (doneRef.current || loading) return;
    const prev = filled[slot.id];
    if (prev === colorId) {
      sfx.tap();
      return;
    }

    const next = { ...filled, [slot.id]: colorId };
    setFilled(next);

    if (!prev) {
      bump(PLACE_PTS);
      sfx.gem();
      haptics.match();
    } else {
      bump(RECOLOR_PTS);
      sfx.select();
      haptics.tap();
    }

    if (Object.keys(next).length >= slots.length) {
      window.setTimeout(finish, 280);
    }
  };

  return (
    <div className="bedazel">
      <div className="bedazel__head">
        <p className="bedazel__title font-season">{pack.title}</p>
        <p className="bedazel__progress">
          {loading ? "Mapping gems…" : `${placed} / ${total} gems`}
        </p>
      </div>

      <div
        ref={boardRef}
        className="bedazel__board"
        style={{ ["--stone" as string]: `${pack.stoneR * 100}%` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="bedazel__guide" src={pack.src} alt="" draggable={false} />

        {error ? <p className="bedazel__error">{error}</p> : null}

        {!loading &&
          slots.map((slot) => {
            const gemId = filled[slot.id];
            const gem = gemId ? gemColorById(gemId) : null;
            return (
              <button
                key={slot.id}
                type="button"
                className={`bedazel__socket${gem ? " is-filled" : ""}`}
                style={{
                  left: `${slot.x * 100}%`,
                  top: `${slot.y * 100}%`,
                  ...(gem
                    ? {
                        ["--gem" as string]: gem.fill,
                        ["--gem-hi" as string]: gem.highlight,
                        ["--gem-rim" as string]: gem.rim,
                      }
                    : {}),
                }}
                aria-label={gem ? `Recolor gem with ${selected.name}` : `Place ${selected.name} gem`}
                onClick={() => onSocket(slot)}
              />
            );
          })}
      </div>

      <div className="bedazel__tray" role="listbox" aria-label="Crystal colors">
        {GEM_COLORS.map((color) => {
          const active = color.id === colorId;
          return (
            <button
              key={color.id}
              type="button"
              role="option"
              aria-selected={active}
              className={`bedazel__swatch${active ? " is-active" : ""}`}
              style={{
                ["--gem" as string]: color.fill,
                ["--gem-hi" as string]: color.highlight,
                ["--gem-rim" as string]: color.rim,
              }}
              aria-label={color.name}
              onClick={() => {
                setColorId(color.id);
                sfx.select();
                haptics.tap();
              }}
            />
          );
        })}
      </div>
      <p className="bedazel__hint">Pick a crystal, then tap empty sockets to bedazzle.</p>
    </div>
  );
}
