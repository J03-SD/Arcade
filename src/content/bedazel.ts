export type GemColor = {
  id: string;
  name: string;
  fill: string;
  highlight: string;
  rim: string;
};

export type GemSlot = {
  id: number;
  /** 0–1 board space */
  x: number;
  /** 0–1 board space */
  y: number;
};

export type BedazelPack = {
  id: string;
  title: string;
  src: string;
  /** Sample step in logo pixel space (lower = denser). */
  spacing: number;
  /** Socket radius as fraction of board width. */
  stoneR: number;
  /** Alpha threshold 0–255 for counting a logo pixel. */
  alphaMin: number;
};

export const GEM_COLORS: GemColor[] = [
  {
    id: "crystal",
    name: "Crystal",
    fill: "#e8eef8",
    highlight: "#ffffff",
    rim: "#b8c4d8",
  },
  {
    id: "crimson",
    name: "Crimson",
    fill: "#ed1b24",
    highlight: "#ff8a90",
    rim: "#9a1016",
  },
  {
    id: "ice",
    name: "Ice",
    fill: "#7eb6ff",
    highlight: "#d6ebff",
    rim: "#3d6fad",
  },
  {
    id: "gold",
    name: "Gold",
    fill: "#e2b340",
    highlight: "#ffe9a8",
    rim: "#9a7420",
  },
  {
    id: "rose",
    name: "Rose AB",
    fill: "#f0a0c0",
    highlight: "#ffe0ee",
    rim: "#b05a7a",
  },
  {
    id: "emerald",
    name: "Emerald",
    fill: "#2f9e6a",
    highlight: "#9aefc4",
    rim: "#1a6a44",
  },
  {
    id: "amethyst",
    name: "Amethyst",
    fill: "#8b6bb8",
    highlight: "#dcc8f5",
    rim: "#5a3f7a",
  },
  {
    id: "onyx",
    name: "Onyx",
    fill: "#2a2e38",
    highlight: "#8a92a4",
    rim: "#12141a",
  },
];

const PACKS: BedazelPack[] = [
  {
    id: "dragon-mark",
    title: "ShadowDragon",
    src: "/brand/dragon-mark.png",
    spacing: 14,
    stoneR: 0.028,
    alphaMin: 40,
  },
];

export function getBedazel(dayIndex: number): BedazelPack {
  const i = ((dayIndex % PACKS.length) + PACKS.length) % PACKS.length;
  return PACKS[i]!;
}

export function gemColorById(id: string): GemColor {
  return GEM_COLORS.find((c) => c.id === id) ?? GEM_COLORS[0]!;
}

/**
 * Sample opaque logo pixels onto a hex-ish grid of gem sockets in 0–1 space.
 * Targets roughly 80–140 slots depending on logo coverage.
 */
export async function sampleGemSlots(pack: BedazelPack): Promise<GemSlot[]> {
  if (typeof window === "undefined") return [];

  const img = await loadImage(pack.src);
  const size = 320;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return [];

  ctx.clearRect(0, 0, size, size);
  // Fit logo centered with padding so sockets aren't clipped at edges.
  const pad = size * 0.08;
  const box = size - pad * 2;
  const scale = Math.min(box / img.naturalWidth, box / img.naturalHeight);
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  const ox = (size - w) / 2;
  const oy = (size - h) / 2;
  ctx.drawImage(img, ox, oy, w, h);

  const { data } = ctx.getImageData(0, 0, size, size);
  const step = pack.spacing;
  const rowH = step * 0.866;
  const slots: GemSlot[] = [];
  let id = 0;

  for (let row = 0, y = step * 0.5; y < size; row++, y += rowH) {
    const offset = row % 2 === 0 ? 0 : step * 0.5;
    for (let x = step * 0.5 + offset; x < size; x += step) {
      const px = Math.min(size - 1, Math.round(x));
      const py = Math.min(size - 1, Math.round(y));
      const i = (py * size + px) * 4;
      const a = data[i + 3] ?? 0;
      if (a < pack.alphaMin) continue;
      // Prefer brighter / more opaque logo ink (white mark on black).
      const lum = ((data[i] ?? 0) + (data[i + 1] ?? 0) + (data[i + 2] ?? 0)) / 3;
      if (lum < 28 && a < 120) continue;
      slots.push({
        id: id++,
        x: px / size,
        y: py / size,
      });
    }
  }

  // Thin if extremely dense.
  if (slots.length > 140) {
    const keep = 120;
    const stride = slots.length / keep;
    const thinned: GemSlot[] = [];
    for (let i = 0; i < keep; i++) {
      const src = slots[Math.floor(i * stride)]!;
      thinned.push({ ...src, id: i });
    }
    return thinned;
  }

  return slots;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = src;
  });
}
