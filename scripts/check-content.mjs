import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

// Lightweight integrity checks without a test runner.
const { getPivotCase, pivotMap } = await import("../src/content/pivot.ts");
const { getCrossword } = await import("../src/content/crossword.ts");
const { getAliasPack } = await import("../src/content/alias.ts");
const { getSignalPack } = await import("../src/content/signal.ts");
const { getSearch } = await import("../src/content/search.ts");

for (let i = 0; i < 21; i++) {
  const pack = getPivotCase(i);
  const map = pivotMap(pack);
  if (!map.get(pack.start) || !map.get(pack.target)) {
    throw new Error(`Pivot ${pack.id} missing start/target`);
  }
}

for (let i = 0; i < 14; i++) {
  const cw = getCrossword(i);
  if (cw.clues.length < 3) throw new Error(`Crossword ${cw.id} has ${cw.clues.length} clues`);
  const alias = getAliasPack(i);
  if (alias.accounts.length !== 8) throw new Error(`Alias ${alias.id} count`);
  const groups = new Set(alias.accounts.map((a) => a.group));
  if (groups.size !== 3) throw new Error(`Alias ${alias.id} groups`);
  const signal = getSignalPack(i);
  if (signal.posts.filter((p) => p.signal).length !== 4) {
    throw new Error(`Signal ${signal.id} should have 4 signals`);
  }
}

for (let i = 0; i < 12; i++) {
  const pack = getSearch(i);
  if (pack.size !== 10) throw new Error(`Search ${pack.id} should be 10x10`);
  if (pack.placed.length < 3) throw new Error(`Search ${pack.id} placed too few words`);
  if (pack.placed.length !== pack.words.length) {
    throw new Error(`Search ${pack.id} missing placements`);
  }
}

console.log("content packs ok");
