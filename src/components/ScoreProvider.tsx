"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { usePathname } from "next/navigation";
import { sfx } from "@/lib/audio";
import { haptics } from "@/lib/haptics";
import { prefersScoreReduce, type LetterBurst } from "@/lib/score-fx";
import { stageSize, toStagePoint } from "@/lib/stage";

type WorldPop = LetterBurst & {
  id: number;
  dx: number;
  dy: number;
  phase: "hold" | "fly";
};

type DockPenalty = {
  id: number;
  amount: number;
  kind?: "tick" | "debt";
};

type ScoreHud = {
  score: number;
  shown: number;
  combo: number;
  hit: number;
  pending: number;
  pendingGoal: number;
  pendingHit: number;
  collecting: boolean;
  smashing: boolean;
  smashAmount: number;
  scoreHit: number;
  penalties: DockPenalty[];
  pendingAnchorRef: RefObject<HTMLSpanElement | null>;
  burstWord: (letters: LetterBurst[], opts?: { streak?: number }) => void;
  bump: (delta: number, origin?: { x: number; y: number }) => void;
  penalize: (amount?: number) => void;
  getScore: () => number;
  freezeDrain: () => void;
  waitUntilSettled: () => Promise<void>;
  reset: () => void;
};

const FLY_MS = 640;
const FLY_HIT_MS = 560;
const HOLD_STAGGER_MS = 70;
const HOLD_POP_MS = 260;
const HOLD_READ_MS = 300;
const FLY_STAGGER_MS = 95;
const OPEN_LEAD_MS = 80;
const SMASH_PAD_MS = 220;
const SMASH_WIND_MS = 180;
const SMASH_SLAM_MS = 150;
const SMASH_TRAVEL_MS = SMASH_WIND_MS + SMASH_SLAM_MS;
const SMASH_CREDIT_MS = SMASH_WIND_MS + 70;
const TICK_DOWN_MS = 250;

const ScoreHudContext = createContext<ScoreHud | null>(null);

export function useScoreHud() {
  const value = useContext(ScoreHudContext);
  if (!value) throw new Error("useScoreHud must be used inside ScoreProvider");
  return value;
}

function ScoreFloats({ pops }: { pops: WorldPop[] }) {
  const styleFor = (pop: WorldPop) => ({
    left: pop.x,
    top: pop.y,
    ["--dx" as string]: `${pop.dx}px`,
    ["--dy" as string]: `${pop.dy}px`,
  });

  return (
    <div className="score-float-layer" aria-hidden>
      <div className="score-float-layer__plates">
        {pops.map((pop) => (
          <span
            key={`plate-${pop.id}`}
            className={`score-float score-float--${pop.phase} ${pop.size === "lg" ? "score-float--lg" : ""}`}
            style={styleFor(pop)}
          >
            <span className="score-float__plate" />
            {/* Invisible text keeps the plate sized to the +points label. */}
            <span className="score-float__value score-float__value--sizer">+{pop.delta.toLocaleString()}</span>
          </span>
        ))}
      </div>
      <div className="score-float-layer__values">
        {pops.map((pop) => (
          <span
            key={`value-${pop.id}`}
            className={`score-float score-float--${pop.phase} ${pop.size === "lg" ? "score-float--lg" : ""}`}
            style={styleFor(pop)}
          >
            <span className="score-float__value">+{pop.delta.toLocaleString()}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function ScoreProvider({ children }: { children: React.ReactNode }) {
  const [score, setScore] = useState(0);
  const [shown, setShown] = useState(0);
  const [combo, setCombo] = useState(0);
  const [hit, setHit] = useState(0);
  const [pending, setPending] = useState(0);
  const [pendingGoal, setPendingGoal] = useState(0);
  const [pendingHit, setPendingHit] = useState(0);
  const [collecting, setCollecting] = useState(false);
  const [smashing, setSmashing] = useState(false);
  const [smashAmount, setSmashAmount] = useState(0);
  const [scoreHit, setScoreHit] = useState(0);
  const [worldPops, setWorldPops] = useState<WorldPop[]>([]);
  const [penalties, setPenalties] = useState<DockPenalty[]>([]);
  const lastAt = useRef(0);
  const comboRef = useRef(0);
  const popId = useRef(0);
  const shownRef = useRef(0);
  const scoreRef = useRef(0);
  /** May go negative so time debt stays accurate while the HUD floors at 0. */
  const trueScoreRef = useRef(0);
  /** Silent floor debt — revealed on the next second tick with that tick's -5. */
  const debtRevealRef = useRef(0);
  /** Seconds*5 already taken off the true score. */
  const appliedDebtRef = useRef(0);
  const drainStartedAtRef = useRef(0);
  const freezeAtRef = useRef(0);
  const pendingRef = useRef(0);
  const pendingGoalRef = useRef(0);
  const collectingRef = useRef(false);
  const smashingRef = useRef(false);
  const drainPausedRef = useRef(false);
  const tickRef = useRef<number | null>(null);
  const smashTimer = useRef<number | null>(null);
  const drainTimer = useRef<number | null>(null);
  const timers = useRef<number[]>([]);
  const pendingAnchorRef = useRef<HTMLSpanElement | null>(null);

  const setCollectingSafe = useCallback((value: boolean) => {
    collectingRef.current = value;
    setCollecting(value);
  }, []);

  const setSmashingSafe = useCallback((value: boolean) => {
    smashingRef.current = value;
    setSmashing(value);
  }, []);

  const publishDisplay = useCallback((trueScore: number) => {
    const display = Math.max(0, trueScore);
    scoreRef.current = display;
    setScore(display);
    return display;
  }, []);

  const elapsedDebtTarget = useCallback(() => {
    const start = drainStartedAtRef.current;
    if (!start) return 0;
    const end =
      drainPausedRef.current && freezeAtRef.current > 0 ? freezeAtRef.current : Date.now();
    return Math.max(0, Math.floor((end - start) / 1000) * 5);
  }, []);

  /** Apply any missed -5 ticks (e.g. after solve freezes the timer). */
  const settleTimeDebt = useCallback(() => {
    const owed = Math.max(0, elapsedDebtTarget() - appliedDebtRef.current);
    if (owed <= 0) return 0;
    appliedDebtRef.current += owed;
    trueScoreRef.current -= owed;
    return owed;
  }, [elapsedDebtTarget]);

  const clearTracked = useCallback(() => {
    for (const id of timers.current) window.clearTimeout(id);
    timers.current = [];
    if (smashTimer.current) {
      window.clearTimeout(smashTimer.current);
      smashTimer.current = null;
    }
  }, []);

  const track = useCallback((id: number) => {
    timers.current.push(id);
    return id;
  }, []);

  const flashDebt = useCallback(
    (amount: number) => {
      if (amount <= 0) return;
      const id = ++popId.current;
      setPenalties((list) => [...list, { id, amount, kind: "debt" }]);
      sfx.penalty();
      track(
        window.setTimeout(() => {
          setPenalties((list) => list.filter((item) => item.id !== id));
        }, 980),
      );
    },
    [track],
  );

  const tickTo = useCallback((target: number) => {
    if (tickRef.current) window.clearInterval(tickRef.current);
    tickRef.current = window.setInterval(() => {
      const current = shownRef.current;
      if (current >= target) {
        if (tickRef.current) window.clearInterval(tickRef.current);
        tickRef.current = null;
        return;
      }
      const step = Math.max(1, Math.ceil((target - current) / 8));
      const next = Math.min(target, current + step);
      shownRef.current = next;
      setShown(next);
    }, 18);
  }, []);

  const tickDownTo = useCallback((target: number) => {
    if (tickRef.current) window.clearInterval(tickRef.current);
    const from = shownRef.current;
    if (from <= target) {
      shownRef.current = target;
      setShown(target);
      tickRef.current = null;
      return;
    }
    const steps = from - target;
    const stepMs = Math.max(16, Math.floor(TICK_DOWN_MS / steps));
    tickRef.current = window.setInterval(() => {
      const current = shownRef.current;
      if (current <= target) {
        if (tickRef.current) window.clearInterval(tickRef.current);
        tickRef.current = null;
        shownRef.current = target;
        setShown(target);
        return;
      }
      const next = current - 1;
      shownRef.current = next;
      setShown(next);
    }, stepMs);
  }, []);

  const flyTarget = useCallback(() => {
    const plus = pendingAnchorRef.current ?? document.querySelector(".dock-pending");
    if (plus instanceof HTMLElement) {
      const range = document.createRange();
      range.selectNodeContents(plus);
      const glyph = range.getBoundingClientRect();
      range.detach();
      if (glyph.width > 2 && glyph.height > 2) {
        return toStagePoint(glyph.left + glyph.width / 2, glyph.top + glyph.height / 2);
      }
    }
    const score = document.querySelector(".dock-score__value");
    if (score instanceof HTMLElement) {
      const rect = score.getBoundingClientRect();
      return toStagePoint(rect.right + 28, rect.top + rect.height / 2);
    }
    const { w, h } = stageSize();
    return { x: w / 2, y: h - 78 };
  }, []);

  const reservePending = useCallback((amount: number) => {
    if (amount <= 0) return;
    pendingGoalRef.current += amount;
    setPendingGoal(pendingGoalRef.current);
  }, []);

  const creditPending = useCallback((delta: number, bounce = true) => {
    if (delta <= 0) return;
    pendingRef.current += delta;
    setPending(pendingRef.current);
    if (bounce) setPendingHit((value) => value + 1);
  }, []);

  const smashPending = useCallback(() => {
    smashTimer.current = null;
    const amount = pendingRef.current;
    if (amount <= 0) return;
    pendingRef.current = 0;
    setPending(0);
    setSmashAmount(amount);
    setSmashingSafe(true);
    sfx.smash();
    haptics.combo();
    track(
      window.setTimeout(() => {
        // Catch up any missed drain ticks, then eat existing time debt with this payout.
        settleTimeDebt();
        const absorbed = Math.max(0, -Math.round(trueScoreRef.current));
        trueScoreRef.current += amount;
        const display = publishDisplay(trueScoreRef.current);
        if (absorbed > 0) {
          if (drainPausedRef.current) {
            // Timer already stopped on solve — show full debt with this smash.
            const queued = debtRevealRef.current;
            debtRevealRef.current = 0;
            flashDebt(absorbed + queued);
          } else {
            debtRevealRef.current += absorbed;
          }
        }
        tickTo(display);
        setScoreHit((value) => value + 1);
        setHit((value) => value + 1);
      }, SMASH_CREDIT_MS),
    );
    track(
      window.setTimeout(() => {
        setCollectingSafe(false);
        setSmashingSafe(false);
        setSmashAmount(0);
        pendingGoalRef.current = pendingRef.current;
        setPendingGoal(pendingRef.current);
        if (pendingRef.current > 0) {
          smashTimer.current = window.setTimeout(smashPending, SMASH_PAD_MS);
        }
      }, SMASH_TRAVEL_MS),
    );
  }, [flashDebt, publishDisplay, setCollectingSafe, setSmashingSafe, settleTimeDebt, tickTo, track]);

  const scheduleSmash = useCallback(
    (delay: number) => {
      if (smashTimer.current) window.clearTimeout(smashTimer.current);
      smashTimer.current = window.setTimeout(smashPending, delay);
    },
    [smashPending],
  );

  const burstWord = useCallback(
    (letters: LetterBurst[], opts?: { streak?: number }) => {
      const bursts = letters.filter((letter) => letter.delta > 0);
      if (!bursts.length) return;
      if (opts?.streak) {
        comboRef.current = opts.streak;
        setCombo(opts.streak);
        lastAt.current = Date.now();
      }
      const reduced = prefersScoreReduce();
      reservePending(bursts.reduce((sum, letter) => sum + letter.delta, 0));
      setCollectingSafe(true);

      if (reduced) {
        bursts.forEach((letter, i) => {
          track(
            window.setTimeout(() => {
              creditPending(letter.delta);
              sfx.score(Math.min(i + 1, 8));
            }, OPEN_LEAD_MS + i * 40),
          );
        });
        scheduleSmash(OPEN_LEAD_MS + 40 * bursts.length + 120);
        return;
      }

      const holdIds: number[] = [];

      // 1) Pop each letter value beside the word so you can read it.
      bursts.forEach((letter, i) => {
        track(
          window.setTimeout(() => {
            const id = ++popId.current;
            holdIds[i] = id;
            setWorldPops((list) => [
              ...list,
              {
                ...letter,
                id,
                dx: 0,
                dy: 0,
                phase: "hold",
              },
            ]);
            sfx.score(Math.min(i + 1, 8));
            haptics.tap();
          }, OPEN_LEAD_MS + i * HOLD_STAGGER_MS),
        );
      });

      const holdDoneAt =
        OPEN_LEAD_MS + Math.max(0, bursts.length - 1) * HOLD_STAGGER_MS + HOLD_POP_MS + HOLD_READ_MS;

      // 2) Then send them one-by-one into the running +total.
      bursts.forEach((letter, i) => {
        track(
          window.setTimeout(() => {
            const id = holdIds[i];
            if (id == null) return;
            const target = flyTarget();
            setWorldPops((list) =>
              list.map((pop) =>
                pop.id === id
                  ? {
                      ...pop,
                      dx: target.x - letter.x,
                      dy: target.y - letter.y,
                      phase: "fly" as const,
                    }
                  : pop,
              ),
            );
            sfx.score(Math.min(i + 1, 8));
            track(
              window.setTimeout(() => {
                creditPending(letter.delta);
              }, FLY_HIT_MS),
            );
            track(
              window.setTimeout(() => {
                setWorldPops((list) => list.filter((item) => item.id !== id));
              }, FLY_MS),
            );
          }, holdDoneAt + i * FLY_STAGGER_MS),
        );
      });

      scheduleSmash(holdDoneAt + bursts.length * FLY_STAGGER_MS + FLY_MS + SMASH_PAD_MS);
    },
    [creditPending, flyTarget, reservePending, scheduleSmash, setCollectingSafe, track],
  );

  const bump = useCallback(
    (delta: number, origin?: { x: number; y: number }) => {
      if (delta <= 0) return;
      const now = Date.now();
      const nextCombo = now - lastAt.current < 900 ? comboRef.current + 1 : 1;
      lastAt.current = now;
      comboRef.current = nextCombo;
      setCombo(nextCombo);
      const gained = Math.round(delta * (1 + (nextCombo - 1) * 0.12));
      if (origin) {
        burstWord([{ ...origin, delta: gained, size: "lg" }], { streak: nextCombo });
        return;
      }
      setCollectingSafe(true);
      reservePending(gained);
      creditPending(gained);
      sfx.score(nextCombo);
      if (nextCombo > 1) haptics.combo();
      else haptics.match();
      scheduleSmash(SMASH_PAD_MS + 180);
    },
    [burstWord, creditPending, reservePending, scheduleSmash, setCollectingSafe],
  );

  const penalize = useCallback(
    (amount = 5) => {
      if (amount <= 0 || drainPausedRef.current) return;
      const queuedDebt = debtRevealRef.current;
      debtRevealRef.current = 0;
      const showAmount = amount + queuedDebt;

      const beforeDisplay = Math.max(0, trueScoreRef.current);
      trueScoreRef.current -= amount;
      appliedDebtRef.current += amount;
      const afterDisplay = publishDisplay(trueScoreRef.current);
      const visualDrop = beforeDisplay > afterDisplay;

      // Still at the floor with nothing queued — drain quietly.
      if (!visualDrop && queuedDebt <= 0) {
        shownRef.current = 0;
        setShown(0);
        return;
      }

      if (visualDrop) tickDownTo(afterDisplay);
      else {
        shownRef.current = afterDisplay;
        setShown(afterDisplay);
      }

      const id = ++popId.current;
      setPenalties((list) => [
        ...list,
        { id, amount: showAmount, kind: queuedDebt > 0 ? "debt" : "tick" },
      ]);
      sfx.penalty();
      track(
        window.setTimeout(() => {
          setPenalties((list) => list.filter((item) => item.id !== id));
        }, queuedDebt > 0 ? 980 : 720),
      );
    },
    [publishDisplay, tickDownTo, track],
  );

  const getScore = useCallback(() => {
    settleTimeDebt();
    return Math.max(0, trueScoreRef.current);
  }, [settleTimeDebt]);

  const freezeDrain = useCallback(() => {
    if (!drainPausedRef.current) {
      freezeAtRef.current = Date.now();
      drainPausedRef.current = true;
    }
    // Bank remaining playtime into trueScore; the next smash shows the absorbed debt.
    settleTimeDebt();
    publishDisplay(trueScoreRef.current);
    if (pendingRef.current <= 0 && !collectingRef.current && !smashingRef.current) {
      shownRef.current = Math.max(0, trueScoreRef.current);
      setShown(shownRef.current);
    }
  }, [publishDisplay, settleTimeDebt]);

  const waitUntilSettled = useCallback(
    () =>
      new Promise<void>((resolve) => {
        const started = performance.now();
        const poll = () => {
          const busy =
            collectingRef.current ||
            smashingRef.current ||
            pendingRef.current > 0 ||
            smashTimer.current != null ||
            tickRef.current != null;
          if (!busy && shownRef.current === scoreRef.current) {
            resolve();
            return;
          }
          if (performance.now() - started > 14000) {
            resolve();
            return;
          }
          window.setTimeout(poll, 40);
        };
        poll();
      }),
    [],
  );

  const reset = useCallback(() => {
    clearTracked();
    if (tickRef.current) window.clearInterval(tickRef.current);
    tickRef.current = null;
    lastAt.current = 0;
    comboRef.current = 0;
    shownRef.current = 0;
    scoreRef.current = 0;
    trueScoreRef.current = 0;
    debtRevealRef.current = 0;
    appliedDebtRef.current = 0;
    drainStartedAtRef.current = Date.now();
    freezeAtRef.current = 0;
    pendingRef.current = 0;
    pendingGoalRef.current = 0;
    drainPausedRef.current = false;
    collectingRef.current = false;
    smashingRef.current = false;
    setScore(0);
    setShown(0);
    setCombo(0);
    setHit(0);
    setPending(0);
    setPendingGoal(0);
    setPendingHit(0);
    setCollecting(false);
    setSmashing(false);
    setSmashAmount(0);
    setScoreHit(0);
    setWorldPops([]);
    setPenalties([]);
  }, [clearTracked]);

  const pathname = usePathname();
  useEffect(() => {
    // Clear HUD whenever the route changes so enter fade never replays old green hits.
    reset();
  }, [pathname, reset]);

  useEffect(() => {
    const timed = /\/play\/(crossword|search)(?:\/|$|\?)/.test(pathname);
    if (!timed) {
      if (drainTimer.current) {
        window.clearInterval(drainTimer.current);
        drainTimer.current = null;
      }
      return;
    }
    if (!drainStartedAtRef.current) drainStartedAtRef.current = Date.now();
    drainTimer.current = window.setInterval(() => {
      penalize(5);
    }, 1000);
    return () => {
      if (drainTimer.current) {
        window.clearInterval(drainTimer.current);
        drainTimer.current = null;
      }
    };
  }, [pathname, penalize]);

  useEffect(() => () => clearTracked(), [clearTracked]);

  const value = useMemo(
    () => ({
      score,
      shown,
      combo,
      hit,
      pending,
      pendingGoal,
      pendingHit,
      collecting,
      smashing,
      smashAmount,
      scoreHit,
      penalties,
      pendingAnchorRef,
      burstWord,
      bump,
      penalize,
      getScore,
      freezeDrain,
      waitUntilSettled,
      reset,
    }),
    [
      score,
      shown,
      combo,
      hit,
      pending,
      pendingGoal,
      pendingHit,
      collecting,
      smashing,
      smashAmount,
      scoreHit,
      penalties,
      burstWord,
      bump,
      penalize,
      getScore,
      freezeDrain,
      waitUntilSettled,
      reset,
    ],
  );

  return (
    <ScoreHudContext.Provider value={value}>
      {children}
      <ScoreFloats pops={worldPops} />
    </ScoreHudContext.Provider>
  );
}
