"use client";

import { useEffect, useRef } from "react";
import {
  bindPixelDissolve,
  cancelPixelDissolvePrep,
  preparePixelDissolveSnap,
  startPixelDissolve,
} from "@/lib/pixel-dissolve";

function isInternalNav(event: Event) {
  if ("button" in event && (event as MouseEvent).button !== 0) return false;
  if (
    "metaKey" in event &&
    ((event as MouseEvent).metaKey ||
      (event as MouseEvent).ctrlKey ||
      (event as MouseEvent).shiftKey ||
      (event as MouseEvent).altKey)
  ) {
    return false;
  }
  const target = event.target;
  if (!(target instanceof Element)) return false;
  const link = target.closest("a[href]");
  if (!(link instanceof HTMLAnchorElement)) return false;
  if (link.target === "_blank" || link.hasAttribute("download")) return false;
  const url = new URL(link.href, window.location.href);
  if (url.origin !== window.location.origin) return false;
  if (url.pathname === window.location.pathname && url.search === window.location.search) return false;
  return true;
}

export function PixelDissolve() {
  const ref = useRef<HTMLCanvasElement>(null);
  const armed = useRef(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    bindPixelDissolve(node);

    const onPointerDown = (event: Event) => {
      if (!isInternalNav(event)) return;
      armed.current = true;
      // Cloning the page on touchstart cancels the synthetic click on iOS /
      // Android, which feels like a double-tap. Prep on mouse/pen only;
      // touch captures on the click that actually navigates.
      const pointerType =
        "pointerType" in event ? String((event as PointerEvent).pointerType) : "";
      if (pointerType === "touch") return;
      preparePixelDissolveSnap();
    };

    const onPointerUp = () => {
      if (!armed.current) return;
      window.setTimeout(() => {
        if (!armed.current) return;
        armed.current = false;
        cancelPixelDissolvePrep();
      }, 60);
    };

    const onClick = (event: Event) => {
      if (!isInternalNav(event)) {
        armed.current = false;
        cancelPixelDissolvePrep();
        return;
      }
      armed.current = false;
      // Touch never prepped on pointerdown — freeze now, still before route swap.
      preparePixelDissolveSnap();
      window.setTimeout(() => {
        startPixelDissolve(node);
      }, 0);
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("pointerup", onPointerUp, true);
    document.addEventListener("pointercancel", onPointerUp, true);
    document.addEventListener("click", onClick, true);
    return () => {
      bindPixelDissolve(null);
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("pointerup", onPointerUp, true);
      document.removeEventListener("pointercancel", onPointerUp, true);
      document.removeEventListener("click", onClick, true);
      cancelPixelDissolvePrep();
    };
  }, []);

  return <canvas ref={ref} className="pixel-dissolve" aria-hidden />;
}
