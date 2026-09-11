import { toCanvas } from "html-to-image";
import { playPixelFallSound, playShockwaveSound, stopPixelFallSound, unlockAudio } from "@/lib/audio";
import { haptics } from "@/lib/haptics";

const HARD_MAX_MS = 2200;
const MAX_CAPTURE = 520;
/** Starting chunk size — coarse, then split while falling. */
const START_CELLS = 3;
const MIN_TILE = 16;
const MAX_DEPTH = 2;
const MAX_TILES = 180;
const BOUNCE = 0.62;

type Band = { top: number; left: number; width: number; height: number };

type Tile = {
  x: number;
  y: number;
  size: number;
  /** Source rect in band coordinates (real screen crop). */
  sx: number;
  sy: number;
  ssize: number;
  vx: number;
  vy: number;
  delay: number;
  drop: boolean;
  edge: number;
  alive: boolean;
  depth: number;
  nextSplit: number;
};

let canvas: HTMLCanvasElement | null = null;
let running = false;
let raf = 0;
let watchdog = 0;
let tiles: Tile[] = [];
let cursorX = -1;
let cursorY = -1;
let pressing = false;
let interactUntil = 0;
let detachPointer: (() => void) | null = null;
let holdEl: HTMLElement | null = null;
let shotRef: HTMLCanvasElement | null = null;
let shotScaleX = 1;
let shotScaleY = 1;
/** Live capture started on pointerdown (before route swap). */
let pendingShot: Promise<HTMLCanvasElement | null> | null = null;
/** Band measured at the same moment as the capture. */
let pendingBand: Band | null = null;

export function bindPixelDissolve(node: HTMLCanvasElement | null) {
  canvas = node;
}

function layer() {
  return canvas ?? document.querySelector<HTMLCanvasElement>("canvas.pixel-dissolve");
}

function bootOpen() {
  return Boolean(document.querySelector(".arcade-boot:not(.arcade-boot--out)"));
}

function frameRoot(): HTMLElement {
  return (document.querySelector(".horizon-bg") as HTMLElement | null) ?? document.body;
}

/** Middle stage only — below header banner, above dock tab bar (viewport space). */
function contentBand(): Band {
  const frame = frameRoot();
  const frameRect = frame.getBoundingClientRect();
  const header = frame.querySelector("header") ?? document.querySelector("header");
  const dock = document.querySelector(".dock-wrap");
  const top = Math.max(
    frameRect.top,
    Math.ceil(header?.getBoundingClientRect().bottom ?? frameRect.top),
  );
  let bottom = frameRect.bottom;
  if (dock) bottom = Math.min(bottom, Math.round(dock.getBoundingClientRect().top));
  return {
    top,
    left: Math.round(frameRect.left),
    width: Math.max(64, Math.round(frameRect.width)),
    height: Math.max(64, Math.round(bottom - top)),
  };
}

function placeBand(node: HTMLElement, band: Band) {
  node.style.top = `${band.top}px`;
  node.style.left = `${band.left}px`;
  node.style.width = `${band.width}px`;
  node.style.height = `${band.height}px`;
  node.style.right = "auto";
  node.style.bottom = "auto";
}

function clearBand(node: HTMLElement) {
  node.style.top = "";
  node.style.left = "";
  node.style.width = "";
  node.style.height = "";
  node.style.right = "";
  node.style.bottom = "";
}

function removeHold() {
  holdEl?.remove();
  holdEl = null;
}

function removeSnap() {
  document.querySelectorAll(".pixel-dissolve-snap").forEach((el) => el.remove());
}

function clearPendingCapture() {
  pendingShot = null;
  pendingBand = null;
}

/**
 * Freeze the on-screen page in the content band before the route unmounts.
 * html-to-image of a detached / re-laid-out tree on desktop lets mx-auto
 * content snap to a corner, so tiles no longer match the board.
 */
function pinVisualSnap(source: HTMLElement, band: Band) {
  removeSnap();
  const sourceRect = source.getBoundingClientRect();
  const wrap = document.createElement("div");
  wrap.className = "pixel-dissolve-snap";
  placeBand(wrap, band);

  const clone = source.cloneNode(true) as HTMLElement;
  clone.style.position = "absolute";
  clone.style.left = `${Math.round(sourceRect.left - band.left)}px`;
  clone.style.top = `${Math.round(sourceRect.top - band.top)}px`;
  clone.style.width = `${Math.round(source.offsetWidth)}px`;
  clone.style.height = `${Math.round(source.offsetHeight)}px`;
  clone.style.margin = "0";
  clone.style.maxWidth = "none";
  clone.style.transform = "none";
  clone.querySelectorAll("header").forEach((el) => {
    if (!(el instanceof HTMLElement)) return;
    // Keep the header's height so the board stays aligned, but do not
    // photograph the sticky navy bar into the falling tiles.
    el.style.position = "relative";
    el.style.visibility = "hidden";
    el.style.pointerEvents = "none";
  });
  wrap.appendChild(clone);
  document.body.appendChild(wrap);
  return wrap;
}

function pinIce(band: Band) {
  removeHold();
  const hold = document.createElement("div");
  hold.className = "pixel-dissolve-hold";
  placeBand(hold, band);
  document.body.appendChild(hold);
  holdEl = hold;
}

/**
 * Freeze the live view on pointerdown, then photograph that freeze so the
 * shatter still matches after Next.js swaps in the home page.
 */
export function preparePixelDissolveSnap() {
  if (bootOpen() || running) return;
  const band = contentBand();
  pendingBand = { ...band };
  const source = frameRoot();
  const snap = pinVisualSnap(source, band);
  pendingShot = (async () => {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });
    return captureSnapBand(snap, band);
  })();
}

export function cancelPixelDissolvePrep() {
  if (running) return;
  clearPendingCapture();
  removeHold();
  removeSnap();
}

/**
 * Photograph the on-screen freeze. The wrap is already the content band, so
 * do not re-crop — and pin it at 0,0 in the SVG so `position: fixed` / inset
 * from the live overlay cannot shift the board to a corner.
 */
async function captureSnapBand(snap: HTMLElement, band: Band): Promise<HTMLCanvasElement | null> {
  const layoutW = Math.max(1, band.width);
  const layoutH = Math.max(1, band.height);
  const ratio = Math.min(
    Math.max(1, window.devicePixelRatio || 1),
    MAX_CAPTURE / Math.max(layoutW, layoutH),
  );

  try {
    return await toCanvas(snap, {
      width: layoutW,
      height: layoutH,
      pixelRatio: ratio,
      cacheBust: false,
      backgroundColor: "#ecf4ff",
      style: {
        position: "relative",
        left: "0",
        top: "0",
        right: "auto",
        bottom: "auto",
        margin: "0",
        transform: "none",
      },
      filter: (node) => {
        if (!(node instanceof Element)) return true;
        return (
          !node.classList.contains("pixel-dissolve") &&
          !node.classList.contains("pixel-dissolve-hold") &&
          !node.classList.contains("arcade-boot") &&
          !node.classList.contains("arcade-ssr") &&
          !node.classList.contains("dissolve-xp")
        );
      },
    });
  } catch {
    return null;
  }
}

/**
 * Capture `source` at its layout size, then crop the content band using the
 * same element's screen rect (keeps falling tiles pixel-aligned to the UI).
 */
async function captureElementBand(
  source: HTMLElement,
  band: Band,
): Promise<HTMLCanvasElement | null> {
  const sourceRect = source.getBoundingClientRect();
  const layoutW = Math.max(1, source.clientWidth);
  const layoutH = Math.max(1, source.clientHeight);
  const screenToLayoutX = layoutW / Math.max(1, sourceRect.width);
  const screenToLayoutY = layoutH / Math.max(1, sourceRect.height);

  const srcLeft = (band.left - sourceRect.left) * screenToLayoutX;
  const srcTop = (band.top - sourceRect.top) * screenToLayoutY;
  const srcW = band.width * screenToLayoutX;
  const srcH = band.height * screenToLayoutY;

  const ratio = Math.min(
    Math.max(1, window.devicePixelRatio || 1),
    MAX_CAPTURE / Math.max(layoutW, layoutH),
  );

  try {
    const full = await toCanvas(source, {
      width: layoutW,
      height: layoutH,
      pixelRatio: ratio,
      cacheBust: false,
      backgroundColor: "#ecf4ff",
      filter: (node) => {
        if (!(node instanceof Element)) return true;
        // Only strip overlay chrome — never remove in-flow page content.
        return (
          !node.classList.contains("pixel-dissolve") &&
          !node.classList.contains("pixel-dissolve-hold") &&
          !node.classList.contains("pixel-dissolve-snap") &&
          !node.classList.contains("arcade-boot") &&
          !node.classList.contains("arcade-ssr") &&
          !node.classList.contains("dissolve-xp")
        );
      },
    });

    const scaleX = full.width / layoutW;
    const scaleY = full.height / layoutH;
    const crop = document.createElement("canvas");
    crop.width = Math.max(1, Math.round(srcW * scaleX));
    crop.height = Math.max(1, Math.round(srcH * scaleY));
    const cctx = crop.getContext("2d");
    if (!cctx) return null;
    cctx.imageSmoothingEnabled = true;
    cctx.fillStyle = "#ecf4ff";
    cctx.fillRect(0, 0, crop.width, crop.height);
    cctx.drawImage(
      full,
      Math.round(srcLeft * scaleX),
      Math.round(srcTop * scaleY),
      crop.width,
      crop.height,
      0,
      0,
      crop.width,
      crop.height,
    );
    return crop;
  } catch {
    return null;
  }
}

function startCell(width: number, height: number) {
  const short = Math.min(width, height);
  return Math.max(MIN_TILE * 3, Math.round(short / START_CELLS));
}

function buildTiles(width: number, height: number, cell: number) {
  const cols = Math.ceil(width / cell);
  const rows = Math.ceil(height / cell);
  const next: Tile[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * cell;
      const y = row * cell;
      const size = cell;
      next.push({
        x,
        y,
        size,
        sx: x,
        sy: y,
        ssize: size,
        vx: (Math.random() - 0.5) * 28,
        vy: 40 + Math.random() * 60,
        delay: row * 12 + Math.random() * 40,
        drop: false,
        edge: 0,
        alive: true,
        depth: 0,
        nextSplit: 55 + Math.random() * 70 + row * 8,
      });
    }
  }
  return next;
}

function splitTile(tile: Tile, fallT: number): Tile[] {
  const half = tile.size / 2;
  const shalf = tile.ssize / 2;
  if (half < MIN_TILE || tile.depth >= MAX_DEPTH) return [tile];
  tile.alive = false;
  const kids: Tile[] = [];
  // Second subdivision (depth 0→1 is calm; 1→2 gets a light scatter).
  const scatter = tile.depth >= 1;
  const kick = scatter ? 70 + Math.random() * 40 : 0;
  for (let oy = 0; oy < 2; oy++) {
    for (let ox = 0; ox < 2; ox++) {
      const dirX = ox === 0 ? -1 : 1;
      const dirY = oy === 0 ? -1 : 1;
      kids.push({
        x: tile.x + ox * half,
        y: tile.y + oy * half,
        size: half,
        sx: tile.sx + ox * shalf,
        sy: tile.sy + oy * shalf,
        ssize: shalf,
        vx: tile.vx + (scatter ? dirX * kick + (Math.random() - 0.5) * 18 : 0),
        vy: tile.vy + (scatter ? dirY * kick * 0.85 + (Math.random() - 0.5) * 14 : 0),
        delay: 0,
        drop: true,
        edge: Math.min(1, tile.edge + 0.28),
        alive: true,
        depth: tile.depth + 1,
        nextSplit: fallT + 70 + Math.random() * 90,
      });
    }
  }
  return kids;
}

function paintTiles(ctx: CanvasRenderingContext2D, width: number, height: number, list: Tile[]) {
  const shot = shotRef;
  ctx.clearRect(0, 0, width, height);
  if (!shot) return;
  ctx.imageSmoothingEnabled = true;
  for (const tile of list) {
    if (!tile.alive) continue;
    const sw = Math.max(1, Math.round(tile.ssize * shotScaleX));
    const sh = Math.max(1, Math.round(tile.ssize * shotScaleY));
    const sx = Math.round(tile.sx * shotScaleX);
    const sy = Math.round(tile.sy * shotScaleY);
    ctx.drawImage(shot, sx, sy, sw, sh, tile.x, tile.y, tile.size, tile.size);
    if (tile.edge > 0.02) {
      ctx.strokeStyle = `rgba(0,0,0,${Math.min(0.55, tile.edge * 0.55).toFixed(3)})`;
      ctx.lineWidth = Math.max(1, tile.size * 0.04 * tile.edge);
      ctx.strokeRect(
        tile.x + ctx.lineWidth / 2,
        tile.y + ctx.lineWidth / 2,
        Math.max(0, tile.size - ctx.lineWidth),
        Math.max(0, tile.size - ctx.lineWidth),
      );
    }
  }
}

function shove(gx: number, gy: number, dx: number, dy: number) {
  const radius = pressing ? 120 : 96;
  const speed = Math.hypot(dx, dy);
  let hit = 0;
  for (const tile of tiles) {
    if (!tile.alive) continue;
    const cx = tile.x + tile.size / 2;
    const cy = tile.y + tile.size / 2;
    const ox = cx - gx;
    const oy = cy - gy;
    const dist = Math.hypot(ox, oy);
    if (dist > radius) continue;
    const falloff = 1 - dist / radius;
    const nx = dist < 1 ? Math.random() - 0.5 : ox / dist;
    const ny = dist < 1 ? Math.random() - 0.5 : oy / dist;
    tile.drop = true;
    tile.delay = 0;
    const push = falloff * (pressing ? 14 : 9);
    tile.vx += nx * push;
    tile.vy += ny * push - falloff * 4;
    if (speed > 0.2) {
      tile.vx += dx * falloff * (pressing ? 0.7 : 0.55);
      tile.vy += dy * falloff * (pressing ? 0.7 : 0.55);
    }
    hit += 1;
  }
  if (hit) interactUntil = performance.now() + 800;
}

function spawnXpBurst(clientX: number, clientY: number, groups: number) {
  if (groups < 1) return;
  const perGroup = 12;
  const total = groups * perGroup;
  const el = document.createElement("span");
  el.className = "dissolve-xp";
  el.textContent = "+0 XP";
  el.style.left = `${clientX}px`;
  el.style.top = `${clientY}px`;
  document.body.appendChild(el);

  let shown = 0;
  const tick = () => {
    shown = Math.min(total, shown + perGroup);
    el.textContent = `+${shown} XP`;
    el.classList.remove("dissolve-xp--pulse");
    void el.offsetWidth;
    el.classList.add("dissolve-xp--pulse");

    if (shown < total) {
      window.setTimeout(tick, 90);
    } else {
      el.classList.add("dissolve-xp--out");
      window.setTimeout(() => el.remove(), 720);
    }
  };
  window.setTimeout(tick, 40);
}

function shockwave(gx: number, gy: number, clientX: number, clientY: number) {
  const maxR = 170;
  let hit = 0;
  for (const tile of tiles) {
    if (!tile.alive) continue;
    const cx = tile.x + tile.size / 2;
    const cy = tile.y + tile.size / 2;
    const dx = cx - gx;
    const dy = cy - gy;
    const dist = Math.hypot(dx, dy);
    if (dist > maxR) continue;
    const force = 1 - dist / maxR;
    const nx = dist < 1 ? Math.random() - 0.5 : dx / dist;
    const ny = dist < 1 ? Math.random() - 0.5 : dy / dist;
    tile.drop = true;
    tile.delay = dist * 0.35;
    tile.vx += nx * force * 520;
    tile.vy += ny * force * 520 - 90 * force;
    tile.edge = Math.max(tile.edge, 0.35);
    hit += 1;
  }
  if (!hit) return;
  interactUntil = performance.now() + 1100;
  playShockwaveSound(hit);
  const groups = Math.floor(hit / 14);
  if (groups >= 1) {
    spawnXpBurst(clientX, clientY, groups);
    haptics.tap();
  }
}

function bindInput(node: HTMLCanvasElement) {
  const point = (clientX: number, clientY: number) => {
    const rect = node.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const onMove = (event: PointerEvent) => {
    const p = point(event.clientX, event.clientY);
    const rect = node.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    ) {
      cursorX = -1;
      cursorY = -1;
      return;
    }
    const dx = cursorX < 0 ? 0 : p.x - cursorX;
    const dy = cursorY < 0 ? 0 : p.y - cursorY;
    shove(p.x, p.y, dx, dy);
    cursorX = p.x;
    cursorY = p.y;
    interactUntil = performance.now() + 800;
  };

  const onDown = (event: PointerEvent) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const p = point(event.clientX, event.clientY);
    pressing = true;
    cursorX = p.x;
    cursorY = p.y;
    shockwave(p.x, p.y, event.clientX, event.clientY);
    try {
      node.setPointerCapture(event.pointerId);
    } catch {
      /* ignore */
    }
  };

  const onUp = () => {
    pressing = false;
  };

  document.addEventListener("pointermove", onMove, { passive: true });
  node.addEventListener("pointerdown", onDown);
  node.addEventListener("pointerup", onUp);
  node.addEventListener("pointercancel", onUp);
  window.addEventListener("pointerup", onUp);
  return () => {
    document.removeEventListener("pointermove", onMove);
    node.removeEventListener("pointerdown", onDown);
    node.removeEventListener("pointerup", onUp);
    node.removeEventListener("pointercancel", onUp);
    window.removeEventListener("pointerup", onUp);
  };
}

function stop(node: HTMLCanvasElement, ctx: CanvasRenderingContext2D | null) {
  cancelAnimationFrame(raf);
  raf = 0;
  if (watchdog) {
    window.clearTimeout(watchdog);
    watchdog = 0;
  }
  detachPointer?.();
  detachPointer = null;
  tiles = [];
  shotRef = null;
  cursorX = -1;
  cursorY = -1;
  pressing = false;
  interactUntil = 0;
  stopPixelFallSound();
  removeHold();
  clearPendingCapture();
  removeSnap();
  document.querySelectorAll(".pixel-dissolve-hold").forEach((el) => el.remove());
  node.classList.remove("is-on", "is-live");
  node.style.filter = "";
  node.style.zIndex = "";
  node.style.height = "";
  clearBand(node);
  ctx?.clearRect(0, 0, node.width, node.height);
  running = false;
}

export function startPixelDissolve(node = layer()) {
  if (!node || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    cancelPixelDissolvePrep();
    return;
  }
  if (bootOpen()) {
    cancelPixelDissolvePrep();
    return;
  }
  if (running) return;

  const ctx = node.getContext("2d");
  if (!ctx) {
    cancelPixelDissolvePrep();
    return;
  }

  // Band from capture time so crop + overlay stay aligned.
  const band = pendingBand ?? contentBand();
  if (band.height < 48) {
    cancelPixelDissolvePrep();
    return;
  }

  running = true;
  const width = band.width;
  const height = band.height;
  const fallHeight = Math.max(height, Math.round(frameRoot().getBoundingClientRect().bottom - band.top));
  const shotPromise = pendingShot ?? captureElementBand(frameRoot(), band);
  pendingShot = null;
  pendingBand = null;

  if (node.parentElement !== document.body) {
    document.body.appendChild(node);
  }

  // Keep the visual freeze up until tiles paint so home does not flash through.
  if (!document.querySelector(".pixel-dissolve-snap")) pinIce(band);
  node.width = width;
  node.height = height;
  placeBand(node, band);
  node.classList.remove("is-on", "is-live");
  node.style.filter = "none";
  node.style.zIndex = "35";
  node.style.height = `${height}px`;

  const finish = () => stop(node, ctx);
  watchdog = window.setTimeout(finish, HARD_MAX_MS);

  void (async () => {
    const shot = await shotPromise;
    if (!shot || !running) {
      finish();
      return;
    }
    shotRef = shot;
    shotScaleX = shot.width / width;
    shotScaleY = shot.height / height;

    node.height = fallHeight;
    node.style.height = `${fallHeight}px`;
    node.style.zIndex = "35";
    tiles = buildTiles(width, height, startCell(width, height));
    paintTiles(ctx, width, fallHeight, tiles);
    node.classList.add("is-on", "is-live");
    removeHold();
    removeSnap();

    detachPointer = bindInput(node);
    interactUntil = performance.now() + 280;
    void unlockAudio().then(() => {
      playPixelFallSound();
    });

    const started = performance.now();
    let last = started;

    const tick = (now: number) => {
      try {
        if (!running) return;
        const fallT = now - started;
        const dt = Math.min(0.033, (now - last) / 1000);
        last = now;

        const next: Tile[] = [];
        for (const tile of tiles) {
          if (!tile.alive) continue;
          if (fallT >= tile.delay) tile.drop = true;

          if (
            tile.drop &&
            fallT >= tile.nextSplit &&
            tile.depth < MAX_DEPTH &&
            tile.size / 2 >= MIN_TILE &&
            next.length < MAX_TILES
          ) {
            const kids = splitTile(tile, fallT);
            for (const kid of kids) next.push(kid);
            continue;
          }

          if (tile.drop) {
            tile.edge = Math.min(1, tile.edge + dt * 4.2);
            tile.vy += 1950 * dt;
            tile.x += tile.vx * dt;
            tile.y += tile.vy * dt;
            tile.vx *= 0.995;

            // Bounce off left / right / top — bottom is open so pieces can fall through.
            if (tile.x < 0) {
              tile.x = 0;
              tile.vx = Math.abs(tile.vx) * BOUNCE;
            } else if (tile.x + tile.size > width) {
              tile.x = width - tile.size;
              tile.vx = -Math.abs(tile.vx) * BOUNCE;
            }
            if (tile.y < 0) {
              tile.y = 0;
              tile.vy = Math.abs(tile.vy) * BOUNCE;
            }
          }

          if (tile.y > fallHeight + tile.size + 8) {
            tile.alive = false;
          } else {
            next.push(tile);
          }
        }
        tiles = next;
        paintTiles(ctx, width, fallHeight, tiles);

        const holding = now < interactUntil || pressing;
        if (tiles.length === 0 && !holding) {
          stopPixelFallSound();
          finish();
          return;
        }
        if (fallT > HARD_MAX_MS && !holding) {
          stopPixelFallSound();
          finish();
          return;
        }
        raf = requestAnimationFrame(tick);
      } catch {
        stopPixelFallSound();
        finish();
      }
    };

    raf = requestAnimationFrame(tick);
  })();
}
