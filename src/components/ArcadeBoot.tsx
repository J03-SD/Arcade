"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { sfx, unlockAudio } from "@/lib/audio";
import { haptics } from "@/lib/haptics";
import { dismissArcadeSsr } from "@/components/ArcadeSsr";
import {
  armArcadeTheme,
  fadeArcadeThemeToBackground,
  playArcadeThemeIntro,
  preloadArcadeTheme,
} from "@/lib/theme";

const PIXEL_END = 72;
const LOAD_CELLS = 8;
const LOAD_CELL_DELAY_MS = 500;
const LOAD_CELL_STEP_MS = 160;
const LOAD_CELL_FILL_MS = 160;
/** Last load cell finishes filling — pixelate should land on the same beat. */
const PIXELATE_MS =
  LOAD_CELL_DELAY_MS + (LOAD_CELLS - 1) * LOAD_CELL_STEP_MS + LOAD_CELL_FILL_MS;
const READY_MS = PIXELATE_MS + 320;
const FINISH_MS = READY_MS + 700;

let booted = false;
let launching = false;

function BootLogo({ pixelate }: { pixelate: boolean }) {
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offRef = useRef<HTMLCanvasElement | null>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    if (!pixelate) {
      setOn(false);
      return;
    }

    setOn(true);
    let raf = 0;
    let started = 0;
    let from = 0;

    const paint = (count: number) => {
      const canvas = canvasRef.current;
      const img = imgRef.current;
      if (!canvas || !img || !img.naturalWidth) return;
      const box = canvas.getBoundingClientRect();
      if (box.width < 8) return;
      const size = Math.max(8, Math.round(box.width * (window.devicePixelRatio || 1)));
      if (canvas.width !== size || canvas.height !== size) {
        canvas.width = size;
        canvas.height = size;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;
      const off = offRef.current ?? document.createElement("canvas");
      offRef.current = off;
      if (off.width !== count || off.height !== count) {
        off.width = count;
        off.height = count;
      }
      const small = off.getContext("2d");
      if (!small) return;
      small.imageSmoothingEnabled = false;
      small.clearRect(0, 0, count, count);
      small.drawImage(img, 0, 0, count, count);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(off, 0, 0, canvas.width, canvas.height);
    };

    const tick = (now: number) => {
      if (!started) {
        const box = (canvasRef.current ?? imgRef.current)?.getBoundingClientRect();
        from = Math.max(PIXEL_END, Math.round(box?.width ?? 340));
        started = now;
      }
      const p = Math.min(1, (now - started) / PIXELATE_MS);
      const eased = 1 - (1 - p) * (1 - p);
      paint(Math.max(PIXEL_END, Math.round(from - eased * (from - PIXEL_END))));
      if (p < 1) raf = window.requestAnimationFrame(tick);
    };

    raf = window.requestAnimationFrame(() => {
      raf = window.requestAnimationFrame(tick);
    });
    return () => window.cancelAnimationFrame(raf);
  }, [pixelate]);

  return (
    <div className="arcade-boot__mark">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src="/brand/boot-logo.png"
        alt="ShadowDragon"
        className={on ? "is-off" : ""}
      />
      <canvas
        ref={canvasRef}
        className={`arcade-boot__pixels${on ? "" : " is-off"}`}
        aria-hidden
      />
    </div>
  );
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function hideSsrCover() {
  dismissArcadeSsr();
}

export function ArcadeBoot() {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [gone, setGone] = useState(false);
  const [fading, setFading] = useState(false);
  const [phase, setPhase] = useState<"idle" | "loading">("idle");
  const [turningOn, setTurningOn] = useState(false);
  const [status, setStatus] = useState("LOADING");
  const playRef = useRef<HTMLButtonElement>(null);

  const goHome = () => {
    const search = window.location.search;
    if (pathname !== "/" || search) {
      router.replace("/");
    }
  };

  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("boot")) {
      booted = false;
      launching = false;
      setTurningOn(false);
    }
    hideSsrCover();
    setMounted(true);
    if (booted) {
      setGone(true);
      return;
    }
    preloadArcadeTheme();
  }, []);

  useEffect(() => {
    if (mounted && !gone && phase === "idle") playRef.current?.focus();
  }, [mounted, gone, phase]);

  useEffect(() => {
    if (phase === "idle") launching = false;
  }, [phase]);

  useEffect(() => {
    if (phase !== "loading") return;

    let cancelled = false;
    const timers: number[] = [];
    const later = (fn: () => void, ms: number) => {
      timers.push(window.setTimeout(fn, ms));
    };

    const finish = () => {
      if (cancelled || booted) return;
      booted = true;
      setStatus("READY");
      goHome();
      if (prefersReducedMotion()) {
        fadeArcadeThemeToBackground(400);
        setFading(true);
        later(() => {
          if (!cancelled) setGone(true);
        }, 200);
        return;
      }
      sfx.tvOn();
      fadeArcadeThemeToBackground(1100);
      haptics.win();
      setTurningOn(true);
      later(() => {
        if (!cancelled) setFading(true);
      }, 720);
      later(() => {
        if (!cancelled) setGone(true);
      }, 1280);
    };

    if (prefersReducedMotion()) {
      finish();
      return () => {
        cancelled = true;
        for (const id of timers) window.clearTimeout(id);
      };
    }

    setStatus("LOADING");
    for (let i = 0; i < LOAD_CELLS; i++) {
      later(() => {
        if (!cancelled) sfx.loadCell(i);
      }, LOAD_CELL_DELAY_MS + i * LOAD_CELL_STEP_MS + LOAD_CELL_FILL_MS);
    }
    later(() => setStatus("READY"), READY_MS);
    later(finish, FINISH_MS);

    return () => {
      cancelled = true;
      for (const id of timers) window.clearTimeout(id);
    };
  }, [phase]);

  const onPlay = () => {
    if (booted || launching || phase !== "idle") return;
    launching = true;
    armArcadeTheme();
    playArcadeThemeIntro();
    void unlockAudio().then(() => {
      sfx.boot();
      sfx.pixelate(PIXELATE_MS);
    });
    haptics.tap();
    setPhase("loading");
  };

  if (!mounted || gone) return null;

  return (
    <div
      className={`arcade-boot arcade-boot--${phase}${turningOn ? " arcade-boot--on" : ""}${fading ? " arcade-boot--out" : ""}`}
      role="dialog"
      aria-label="Arcade startup"
    >
      <div className="arcade-boot__vignette" />
      <div className="arcade-boot__scan" />
      <div className="arcade-boot__grain" />
      <div className="arcade-boot__crt" />
      <div className="arcade-boot__stage">
        <BootLogo pixelate={phase === "loading"} />
        <div className="arcade-boot__slot">
          {phase === "idle" ? (
            <button
              ref={playRef}
              type="button"
              className="arcade-boot__play"
              aria-label="Play"
              onPointerDown={onPlay}
              onClick={onPlay}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/play-button.png" alt="" draggable={false} />
            </button>
          ) : (
            <>
              <p className="arcade-boot__status">{status}</p>
              <div className="arcade-boot__cells" aria-hidden>
                {Array.from({ length: LOAD_CELLS }, (_, i) => (
                  <span key={i} style={{ ["--i" as string]: String(i) }} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
