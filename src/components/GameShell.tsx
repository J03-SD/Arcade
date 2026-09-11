"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Header } from "./Header";
import { PageFade } from "./PageFade";
import { ResultOverlay } from "./ResultOverlay";
import { useScoreHud } from "./ScoreProvider";
import { dayIndex as todayIndex } from "@/lib/daily";
import { loadProgress, recordDaily, saveProgress } from "@/lib/progress";
import { sfx } from "@/lib/audio";
import { haptics } from "@/lib/haptics";
import type { GameMode } from "@/lib/modes";
import type { CompleteHandler, GameResult } from "@/games/types";

const RESULT_HOLD_MS = 500;

export function GameShell({
  mode,
  dayIndex,
  isDaily,
  children,
}: {
  mode: GameMode;
  dayIndex: number;
  isDaily: boolean;
  children: (api: { onComplete: CompleteHandler; key: number }) => React.ReactNode;
}) {
  const started = useRef(Date.now());
  const [result, setResult] = useState<GameResult | null>(null);
  const [run, setRun] = useState(0);
  const completing = useRef(false);
  const { reset, getScore, freezeDrain, waitUntilSettled } = useScoreHud();

  useEffect(() => {
    reset();
    completing.current = false;
  }, [mode, run, reset]);

  const onComplete: CompleteHandler = useCallback(
    (partial) => {
      if (completing.current) return;
      completing.current = true;
      freezeDrain();

      const timeMs = partial.timeMs ?? Date.now() - started.current;
      const failed = Boolean(partial.failed);

      if (!failed) {
        sfx.win();
        haptics.win();
      } else {
        sfx.miss();
        haptics.miss();
      }

      void (async () => {
        await waitUntilSettled();
        await new Promise((resolve) => window.setTimeout(resolve, RESULT_HOLD_MS));
        const score = failed ? partial.score : getScore();
        const next: GameResult = {
          mode,
          dayIndex,
          isDaily,
          timeMs,
          score,
          stars: partial.stars,
          subtitle: partial.subtitle,
          marks: partial.marks,
          failed,
        };
        if (isDaily && dayIndex === todayIndex() && !failed) {
          const progress = recordDaily(loadProgress(), {
            dayIndex,
            mode,
            score: next.score,
            timeMs: next.timeMs,
            stars: next.stars,
          });
          saveProgress(progress);
        }
        setResult(next);
      })();
    },
    [dayIndex, freezeDrain, getScore, isDaily, mode, waitUntilSettled],
  );

  const api = useMemo(() => ({ onComplete, key: run }), [onComplete, run]);

  return (
    <div className="horizon-bg flex min-h-dvh flex-col">
      <Header dayIndex={dayIndex} />
      <PageFade>
        <div className="dock-space mx-auto w-full max-w-[430px] min-w-0 px-4 pt-5 md:max-w-[540px]">
          <div className="panel min-w-0 rounded-[var(--radius)] p-5">{children(api)}</div>
        </div>
      </PageFade>
      {result ? (
        <ResultOverlay
          result={result}
          onReplay={() => {
            started.current = Date.now();
            setResult(null);
            setRun((value) => value + 1);
          }}
        />
      ) : null}
    </div>
  );
}
