export const MODES = [
  "crossword",
  "search",
  "pivot",
  "crush",
  "alias",
  "signal",
] as const;

export const LAUNCH_MODES = ["search", "crossword"] as const;

/** Launch modes shown on home but not playable yet. */
export const COMING_SOON_MODES = ["crossword"] as const;

export type GameMode = (typeof MODES)[number];
export type LaunchMode = (typeof LAUNCH_MODES)[number];
export type ComingSoonMode = (typeof COMING_SOON_MODES)[number];

export type ModeMeta = {
  id: GameMode;
  name: string;
  short: string;
  blurb: string;
};

export const MODE_META: Record<GameMode, ModeMeta> = {
  crossword: {
    id: "crossword",
    name: "Crossword",
    short: "Crossword",
    blurb: "Fill in today's puzzle.",
  },
  search: {
    id: "search",
    name: "Word Search",
    short: "Word Search",
    blurb: "Find the hidden terms.",
  },
  pivot: { id: "pivot", name: "Pivot", short: "Pivot", blurb: "Follow the next source." },
  crush: { id: "crush", name: "Link Crush", short: "Crush", blurb: "Match the links." },
  alias: { id: "alias", name: "Alias", short: "Alias", blurb: "Group the identities." },
  signal: { id: "signal", name: "Signal", short: "Signal", blurb: "Keep the real signal." },
};

export function isGameMode(value: string): value is GameMode {
  return (MODES as readonly string[]).includes(value);
}

export function isLaunchMode(value: string): value is LaunchMode {
  return (LAUNCH_MODES as readonly string[]).includes(value);
}

export function isComingSoonMode(value: string): value is ComingSoonMode {
  return (COMING_SOON_MODES as readonly string[]).includes(value);
}
