"use client";

import { GameShell } from "./GameShell";
import { AliasGame } from "@/games/alias/AliasGame";
import { CrosswordGame } from "@/games/crossword/CrosswordGame";
import { CrushGame } from "@/games/crush/CrushGame";
import { PivotGame } from "@/games/pivot/PivotGame";
import { SearchGame } from "@/games/search/SearchGame";
import { SignalGame } from "@/games/signal/SignalGame";
import { featuredMode } from "@/lib/daily";
import type { GameMode } from "@/lib/modes";

export function PlayView({
  mode,
  dayIndex,
  forcePractice,
}: {
  mode: GameMode;
  dayIndex: number;
  forcePractice?: boolean;
}) {
  const isDaily = !forcePractice && featuredMode(dayIndex) === mode;
  return (
    <GameShell mode={mode} dayIndex={dayIndex} isDaily={isDaily}>
      {({ onComplete, key }) => {
        const props = { dayIndex, onComplete };
        switch (mode) {
          case "pivot":
            return <PivotGame key={key} {...props} />;
          case "crush":
            return <CrushGame key={key} {...props} />;
          case "alias":
            return <AliasGame key={key} {...props} />;
          case "crossword":
            return <CrosswordGame key={key} {...props} />;
          case "search":
            return <SearchGame key={key} {...props} />;
          case "signal":
            return <SignalGame key={key} {...props} />;
        }
      }}
    </GameShell>
  );
}
