"use client";

import { useEffect } from "react";
import { ArcadeBoot } from "@/components/ArcadeBoot";
import { ArcadeSsr } from "@/components/ArcadeSsr";
import { Dock } from "@/components/Dock";
import { PixelDissolve } from "@/components/PixelDissolve";
import { ScoreProvider } from "@/components/ScoreProvider";
import { unlockAudio } from "@/lib/audio";
import { haptics } from "@/lib/haptics";

function RouteAtmosphere() {
  useEffect(() => {
    const navLink = (event: Event) => {
      if (event.defaultPrevented) return null;
      if ("button" in event && (event as MouseEvent).button !== 0) return null;
      if ("metaKey" in event && ((event as MouseEvent).metaKey || (event as MouseEvent).ctrlKey || (event as MouseEvent).shiftKey || (event as MouseEvent).altKey)) return null;
      const target = event.target;
      if (!(target instanceof Element)) return null;
      const link = target.closest("a[href]");
      if (!(link instanceof HTMLAnchorElement)) return null;
      if (link.target === "_blank" || link.hasAttribute("download")) return null;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return null;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return null;
      return url;
    };

    const unlock = () => {
      void unlockAudio();
    };
    const onPointerDown = () => {
      unlock();
    };
    const onClick = (event: MouseEvent) => {
      const url = navLink(event);
      if (!url) return;
      haptics.tap();
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("click", onClick);
    };
  }, []);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ArcadeSsr />
      <RouteAtmosphere />
      <ArcadeBoot />
      <ScoreProvider>
        <PixelDissolve />
        {children}
        <Dock />
      </ScoreProvider>
    </>
  );
}
