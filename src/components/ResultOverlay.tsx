"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRef, useState } from "react";
import { formatClock } from "@/lib/daily";
import { sfx } from "@/lib/audio";
import { haptics } from "@/lib/haptics";
import type { GameResult } from "@/games/types";

export function ResultOverlay({
  result,
  onReplay,
}: {
  result: GameResult;
  onReplay?: () => void;
}) {
  const [leaving, setLeaving] = useState<"replay" | null>(null);
  const replayDone = useRef(false);
  const title = result.failed ? "Not this time" : "Solved!";

  return (
    <motion.div
      className="result-overlay fixed inset-0 z-50 flex items-center justify-center bg-navy/55 p-5"
      initial={{ opacity: 0 }}
      animate={{ opacity: leaving ? 0 : 1 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <motion.div
        className="result-card panel w-full max-w-[320px] rounded-[var(--radius)] p-7 text-center text-white"
        initial={{ y: 28, opacity: 0 }}
        animate={{ y: leaving ? -36 : 0, opacity: leaving ? 0 : 1 }}
        transition={{ duration: 0.4, ease: [0.22, 0.74, 0.18, 1] }}
        onAnimationComplete={() => {
          if (leaving !== "replay" || replayDone.current) return;
          replayDone.current = true;
          onReplay?.();
        }}
      >
        <h2 className="font-season text-[2.6rem] leading-none tracking-[-0.03em]">{title}</h2>
        <p className="mt-5 font-season text-[2rem] leading-none tracking-[-0.03em] text-white">
          {result.score.toLocaleString()}
        </p>
        <p className="mt-2 font-plex text-[13px] tracking-[0.08em] text-white/50">
          {formatClock(result.timeMs)}
        </p>
        <div className="mt-8 grid grid-cols-2 gap-3">
          {onReplay ? (
            <button
              type="button"
              className="pressable rounded-[12px] bg-white/10 py-3 font-plex text-[13px] tracking-[0.06em] text-white"
              onClick={() => {
                if (leaving) return;
                sfx.select();
                haptics.tap();
                setLeaving("replay");
              }}
            >
              Play again
            </button>
          ) : (
            <span />
          )}
          <Link
            href="/"
            className="pressable rounded-[12px] bg-red py-3 font-plex text-[13px] tracking-[0.06em] text-white"
            onClick={() => {
              sfx.select();
              haptics.tap();
            }}
          >
            Home
          </Link>
        </div>
      </motion.div>
    </motion.div>
  );
}
