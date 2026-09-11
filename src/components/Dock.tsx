"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useScoreHud } from "./ScoreProvider";

function PlayIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.6" stroke="currentColor" strokeWidth="1.7" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.6" stroke="currentColor" strokeWidth="1.7" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.6" stroke="currentColor" strokeWidth="1.7" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.6" fill="currentColor" />
    </svg>
  );
}

function BoardIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 19v-6M12 19V5M19 19v-9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M5.5 19c1.2-3.2 3.4-4.8 6.5-4.8s5.3 1.6 6.5 4.8"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

const TABS = [
  { href: "/leaderboard", label: "Board", icon: BoardIcon },
  { href: "/", label: "Play", icon: PlayIcon },
  { href: "/profile", label: "Profile", icon: ProfileIcon },
] as const;

const MORPH_MS = 560;
const EASE = "width 560ms cubic-bezier(0.22, 0.74, 0.18, 1)";

function tabActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/" || pathname.startsWith("/play");
  return pathname === href || pathname.startsWith(`${href}/`);
}

type Morph = "idle" | "enter-shrink" | "enter-grow" | "exit";

export function Dock() {
  const pathname = usePathname();
  const playing = pathname.startsWith("/play/");
  const { shown, hit, pending, pendingGoal, pendingHit, collecting, smashing, smashAmount, scoreHit, penalties, pendingAnchorRef } = useScoreHud();
  const shownPending = smashing ? smashAmount : pending;
  const hasPending = collecting || smashing || pending > 0 || pendingGoal > 0;
  const PAD = 36;
  const dockRef = useRef<HTMLDivElement>(null);
  const scoreSizerRef = useRef<HTMLSpanElement>(null);
  const plusSizerRef = useRef<HTMLSpanElement>(null);
  const [pillW, setPillW] = useState<number | null>(null);
  const [smashPhase, setSmashPhase] = useState<"wind" | "close" | null>(null);
  const nextScore = shown + (smashing ? smashAmount : 0);
  const [backVisible, setBackVisible] = useState(playing);
  const [backMode, setBackMode] = useState<"enter" | "exit">("enter");
  const [morph, setMorph] = useState<Morph>("idle");
  const wasPlayingRef = useRef(playing);

  // Prime exit on this render so nav icons never flash visible.
  if (wasPlayingRef.current && !playing && morph !== "exit") {
    setMorph("exit");
    setBackMode("exit");
    setBackVisible(true);
  }

  // Prime enter-shrink on this render so the full bar can collapse (not cut).
  if (!wasPlayingRef.current && playing && morph === "idle") {
    setMorph("enter-shrink");
    setBackVisible(false);
  }

  const showScore = playing && morph !== "enter-shrink";
  const showNav = !showScore;
  const navHiding = morph === "enter-shrink";
  const navRevealing = morph === "exit";
  const backShowing = backVisible && morph !== "enter-shrink";

  useEffect(() => {
    const wasPlaying = wasPlayingRef.current;
    wasPlayingRef.current = playing;

    if (playing) {
      if (!wasPlaying) {
        setMorph("enter-shrink");
        setBackVisible(false);
      }
      return;
    }

    if (!wasPlaying) return;

    setMorph("exit");
    setBackMode("exit");
    setBackVisible(true);
    const id = window.setTimeout(() => {
      setBackVisible(false);
      setMorph("idle");
      if (dockRef.current) {
        dockRef.current.style.width = "";
        dockRef.current.style.transition = "";
      }
    }, MORPH_MS + 40);
    return () => window.clearTimeout(id);
  }, [playing]);

  // Home → game step 1: full bar → circle (icons fade out)
  useLayoutEffect(() => {
    if (morph !== "enter-shrink" || !playing) return;
    const el = dockRef.current;
    if (!el) return;
    const parentW = el.parentElement?.clientWidth ?? 360;
    const full = Math.min(360, Math.floor(parentW));

    el.style.transition = "none";
    el.style.width = `${full}px`;
    void el.getBoundingClientRect();
    el.style.transition = EASE;
    el.style.width = "56px";

    const id = window.setTimeout(() => {
      setMorph("enter-grow");
      setBackVisible(true);
      setBackMode("enter");
    }, MORPH_MS);
    return () => {
      window.clearTimeout(id);
      el.style.transition = "";
    };
  }, [morph, playing]);

  // Home → game step 2: circle → score pill (same ease as exit expand)
  useLayoutEffect(() => {
    if (morph !== "enter-grow" || !playing || pillW == null) return;
    const el = dockRef.current;
    if (!el) return;

    el.style.transition = "none";
    el.style.width = "56px";
    el.style.marginLeft = "";
    void el.getBoundingClientRect();
    el.style.transition = EASE;
    el.style.width = `${pillW}px`;

    const id = window.setTimeout(() => {
      setMorph("idle");
      el.style.transition = "";
    }, MORPH_MS);
    return () => {
      window.clearTimeout(id);
      el.style.transition = "";
    };
  }, [morph, playing, pillW]);

  // Game → home: circle → full bar
  useLayoutEffect(() => {
    if (morph !== "exit" || playing) return;
    const el = dockRef.current;
    if (!el) return;
    const parentW = el.parentElement?.clientWidth ?? 360;
    const target = Math.min(360, Math.floor(parentW));

    el.style.transition = "none";
    el.style.width = "56px";
    void el.getBoundingClientRect();
    el.style.transition = EASE;
    el.style.width = `${target}px`;

    return () => {
      el.style.transition = "";
    };
  }, [morph, playing]);

  useLayoutEffect(() => {
    if (!showScore) return;
    const el = dockRef.current;
    if (!el) return;
    const scoreEl = el.querySelector(".dock-score__value");
    const plusEl = plusSizerRef.current;
    const scoreW = scoreEl?.getBoundingClientRect().width ?? 48;
    const plusW = hasPending ? plusEl?.getBoundingClientRect().width ?? 0 : 0;
    if (smashing) return;
    setPillW(Math.ceil(PAD + scoreW + plusW));
  }, [PAD, showScore, shown, shownPending, hasPending, smashing]);

  useLayoutEffect(() => {
    if (!smashing) {
      setSmashPhase(null);
      return;
    }
    const el = dockRef.current;
    if (!el) return;
    const scoreEl = el.querySelector(".dock-score__value");
    const plusEl = plusSizerRef.current;
    const scoreW = scoreEl?.getBoundingClientRect().width ?? 48;
    const plusW = plusEl?.getBoundingClientRect().width ?? 0;
    const tight = Math.ceil(PAD + scoreW + plusW);
    setSmashPhase("wind");
    setPillW(tight + 22);
    const id = window.setTimeout(() => {
      setSmashPhase("close");
      setPillW(Math.ceil(PAD + scoreW));
    }, 180);
    return () => window.clearTimeout(id);
  }, [PAD, smashing]);

  const dockWidthStyle = {
    ...(showScore && pillW != null ? { width: pillW } : {}),
  };

  return (
    <div className={`dock-wrap${playing || backShowing ? " dock-wrap--play" : ""}${showScore ? " dock-wrap--score" : ""}`}>
      {backShowing ? (
        <Link
          href="/"
          className={`dock-back pressable dock-back--${backMode}`}
          aria-label="Back to games"
          tabIndex={backMode === "exit" ? -1 : undefined}
          onClick={(event) => {
            if (backMode === "exit") event.preventDefault();
          }}
        >
          <span className="dock-back__orb" aria-hidden />
          <svg className="dock-back__icon" width="20" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M15 5.5 8.5 12 15 18.5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      ) : null}
      <div
        ref={dockRef}
        className={`dock${showScore ? " dock--score" : ""}${navRevealing ? " dock--reveal" : ""}${morph === "enter-grow" ? " dock--morph-enter" : ""}${morph === "enter-shrink" ? " dock--morph-shrink" : ""}${smashPhase ? ` dock--smash dock--smash-${smashPhase}` : ""}`}
        style={dockWidthStyle}
      >
        {showScore ? (
          <div className="dock-flash-clip" aria-hidden>
            {morph === "idle" && pendingHit ? (
              <span key={`plus-${pendingHit}`} className="dock-flash dock-flash--plus" />
            ) : null}
            {morph === "idle" && hit ? <span key={hit} className="dock-flash" /> : null}
          </div>
        ) : null}
        {showScore ? (
          <div
            className={`dock-score${hasPending ? " dock-score--pending" : ""}${morph === "enter-grow" ? " dock-score--enter" : ""}`}
            aria-live="polite"
            aria-label={`Score ${shown.toLocaleString()}${hasPending ? `, plus ${shownPending.toLocaleString()}` : ""}`}
          >
            <p
              key={scoreHit}
              className={`dock-score__value${morph === "idle" && scoreHit ? " dock-score__value--hit" : ""}`}
            >
              <span className="dock-penalties" aria-hidden>
                {penalties.map((item) => (
                  <span
                    key={item.id}
                    className={`dock-penalty${item.kind === "debt" ? " dock-penalty--debt" : ""}`}
                  >
                    -{item.amount.toLocaleString()}
                  </span>
                ))}
              </span>
              {shown.toLocaleString()}
            </p>
            <span ref={scoreSizerRef} className="dock-measure dock-score__sizer" aria-hidden>
              {nextScore.toLocaleString()}
            </span>
            <span ref={plusSizerRef} className="dock-measure dock-plus-sizer" aria-hidden>
              +{shownPending.toLocaleString()}
            </span>
            <span className="dock-pending-slot">
              {hasPending ? (
                <span
                  ref={pendingAnchorRef}
                  className={`dock-pending${smashing ? " dock-pending--smash" : pendingHit ? " dock-pending--tick" : ""}`}
                >
                  +{shownPending.toLocaleString()}
                </span>
              ) : null}
            </span>
          </div>
        ) : showNav ? (
          <nav
            className={`dock-nav${navRevealing ? " dock-nav--reveal" : ""}${navHiding ? " dock-nav--hide" : ""}`}
            aria-label="Arcade"
          >
            {TABS.map((tab) => {
              const active = tabActive(pathname, tab.href);
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`dock-tab ${active ? "is-active" : ""}`}
                  aria-label={tab.label}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon />
                </Link>
              );
            })}
          </nav>
        ) : null}
      </div>
    </div>
  );
}
