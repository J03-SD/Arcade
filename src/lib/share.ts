import { MODE_META } from "./modes";
import { formatClock, formatDayNumber } from "./daily";
import type { GameResult } from "@/games/types";

function rounded(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function renderShareCard(result: GameResult, streak: number) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const meta = MODE_META[result.mode];
  ctx.fillStyle = "#0A101E";
  ctx.fillRect(0, 0, 1080, 1350);

  const glow = ctx.createRadialGradient(540, 0, 40, 540, 220, 820);
  glow.addColorStop(0, "rgba(237, 27, 36, 0.28)");
  glow.addColorStop(1, "rgba(9, 12, 26, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 1080, 700);

  ctx.fillStyle = "#ecf4ff";
  ctx.font = "48px SuisseIntl, sans-serif";
  ctx.fillText(formatDayNumber(result.dayIndex), 80, 140);

  ctx.font = "92px SeasonSerif, Georgia, serif";
  ctx.fillText(meta.short, 80, 270);

  ctx.fillStyle = "#acbed8";
  ctx.font = "36px IBM Plex Mono, monospace";
  ctx.fillText(meta.name.toUpperCase(), 80, 330);

  const marks = result.marks?.length ? result.marks : result.failed ? ["○"] : ["●"];
  marks.slice(0, 16).forEach((mark, i) => {
    const x = 80 + (i % 8) * 88;
    const y = 430 + Math.floor(i / 8) * 88;
    rounded(ctx, x, y, 72, 72, 12);
    ctx.fillStyle = mark === "●" || mark === "🟩" ? "#58cb72" : mark === "○" || mark === "⬛" ? "#1c2236" : "#ed1b24";
    if (mark === "🟡") ctx.fillStyle = "#b882fa";
    ctx.fill();
  });

  ctx.fillStyle = "#ffffff";
  ctx.font = "44px IBM Plex Mono, monospace";
  ctx.fillText(result.subtitle ?? (result.failed ? "Not this time" : "Solved"), 80, 720);
  ctx.fillText(formatClock(result.timeMs), 80, 790);

  ctx.fillStyle = "#ed1b24";
  ctx.font = "40px SuisseIntl, sans-serif";
  ctx.fillText(streak > 0 ? `${streak} day streak` : "Day one", 80, 880);

  ctx.fillStyle = "#7b808c";
  ctx.font = "28px SuisseIntl, sans-serif";
  ctx.fillText("The internet is full of clues.", 80, 1200);
  ctx.fillText("games-sd.shadowdragon.io", 80, 1250);

  return canvas;
}

export async function shareResult(result: GameResult, streak: number) {
  const canvas = renderShareCard(result, streak);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) return;
  const file = new File([blob], `shadow-${result.dayIndex}.png`, { type: "image/png" });
  const text = `${formatDayNumber(result.dayIndex)} ${MODE_META[result.mode].short} — ${result.subtitle ?? "done"}`;

  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], text, title: "ShadowDragon Games" });
      return;
    }
    if (navigator.share) {
      await navigator.share({ text, title: "ShadowDragon Games" });
      return;
    }
  } catch {
    /* user cancelled or fallback */
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.click();
  URL.revokeObjectURL(url);
}
