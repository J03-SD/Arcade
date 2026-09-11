import type { GameMode } from "@/lib/modes";

export type GameResult = {
  mode: GameMode;
  dayIndex: number;
  isDaily: boolean;
  timeMs: number;
  score: number;
  stars?: number;
  subtitle?: string;
  marks?: string[];
  failed?: boolean;
};

export type CompleteHandler = (result: Omit<GameResult, "mode" | "dayIndex" | "isDaily" | "timeMs"> & {
  timeMs?: number;
}) => void;
