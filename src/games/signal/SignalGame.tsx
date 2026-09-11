"use client";

import { AnimatePresence, motion, useMotionValue, useTransform } from "framer-motion";
import { useMemo, useState } from "react";
import { getSignalPack } from "@/content/signal";
import { useScoreHud } from "@/components/ScoreProvider";
import { sfx, vo } from "@/lib/audio";
import { haptics } from "@/lib/haptics";
import type { CompleteHandler } from "@/games/types";

export function SignalGame({
  dayIndex,
  onComplete,
}: {
  dayIndex: number;
  onComplete: CompleteHandler;
}) {
  const pack = useMemo(() => getSignalPack(dayIndex), [dayIndex]);
  const { bump } = useScoreHud();
  const needed = pack.posts.filter((post) => post.signal).length;
  const [index, setIndex] = useState(0);
  const [found, setFound] = useState(0);
  const [noiseHits, setNoiseHits] = useState(0);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-160, 160], [-10, 10]);

  const finish = (nextFound: number, nextNoise: number) => {
    const confidence = Math.round((nextFound / needed) * 100 - nextNoise * 8);
    if (nextFound >= needed) {
      vo.signalFound();
      onComplete({
        score: 1400 + Math.max(0, confidence) * 6,
        stars: nextNoise === 0 ? 3 : nextNoise < 2 ? 2 : 1,
        subtitle: `${pack.resolution.what} · ${pack.resolution.place}`,
        marks: Array.from({ length: needed }, () => "●"),
      });
    } else if (index + 1 >= pack.posts.length) {
      onComplete({
        failed: nextFound < needed,
        score: 200 + nextFound * 180,
        subtitle: `${nextFound}/${needed} signals`,
        marks: [
          ...Array.from({ length: nextFound }, () => "●"),
          ...Array.from({ length: needed - nextFound }, () => "○"),
        ],
      });
    }
  };

  const decide = (keep: boolean) => {
    const post = pack.posts[index];
    if (!post) return;
    let nextFound = found;
    let nextNoise = noiseHits;
    if (keep && post.signal) {
      nextFound += 1;
      sfx.signal();
      haptics.match();
      bump(220);
    } else if (keep && !post.signal) {
      nextNoise += 1;
      sfx.miss();
      haptics.miss();
    } else if (!keep && post.signal) {
      sfx.miss();
      haptics.miss();
    } else {
      sfx.tap();
      haptics.tap();
    }
    setFound(nextFound);
    setNoiseHits(nextNoise);
    x.set(0);
    const nextIndex = index + 1;
    if (nextFound >= needed || nextIndex >= pack.posts.length) {
      finish(nextFound, nextNoise);
    } else {
      setIndex(nextIndex);
    }
  };

  const post = pack.posts[index];
  const confidence = Math.min(100, Math.round((found / needed) * 100));

  return (
    <div>
      <p className="font-plex text-[11px] uppercase tracking-[0.16em] text-grey-600">
        Signal {found}/{needed}
      </p>
      <h1 className="mt-1 font-season text-4xl leading-none">Signal</h1>
      <p className="mt-2 text-sm text-grey-700">{pack.mission}</p>
      <div className="mt-3 h-2 overflow-hidden rounded-sm bg-steel-light">
        <div className="h-full bg-green transition-all" style={{ width: `${confidence}%` }} />
      </div>
      <p className="mt-1 font-plex text-[10px] text-grey-600">Confidence {confidence}%</p>

      <div className="relative mt-5 h-64">
        <AnimatePresence>
          {post ? (
            <motion.article
              key={post.id}
              drag="x"
              style={{ x, rotate }}
              dragConstraints={{ left: 0, right: 0 }}
              onDragEnd={(_, info) => {
                if (info.offset.x > 90) decide(true);
                else if (info.offset.x < -90) decide(false);
              }}
              className="play-board absolute inset-0 rounded-[0.45rem] navy-glow p-5 text-white"
            >
              <p className="font-plex text-[10px] uppercase text-steel">Posted {post.age} ago</p>
              <p className="mt-4 font-season text-3xl leading-tight">{post.text}</p>
            </motion.article>
          ) : null}
        </AnimatePresence>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => decide(false)}
          className="pressable rounded-sm bg-navy/10 py-3 text-sm"
        >
          ← Noise
        </button>
        <button
          type="button"
          onClick={() => decide(true)}
          className="pressable rounded-sm bg-navy py-3 text-sm text-white"
        >
          Signal →
        </button>
      </div>
    </div>
  );
}
