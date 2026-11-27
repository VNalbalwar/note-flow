"use client";

import { AnimatePresence, motion } from "motion/react";
import { PEOPLE_INKS, onInk } from "@/lib/people";
import { useLoop } from "../useLoop";

const PRIYA = PEOPLE_INKS[4].ink;
const LEO = PEOPLE_INKS[2].ink;
const DURATIONS = [1700, 2600, 3800] as const;

function Mark({ ink, children }: { ink: string; children: React.ReactNode }) {
  return (
    <motion.span
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-0.5 inline-block rounded-[2px_7px_7px_7px] px-1.5 font-semibold"
      style={{ background: ink, color: onInk(ink) }}
    >
      {children}
    </motion.span>
  );
}

function Line({ who, ink, children }: { who: string; ink: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -28, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 40, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 240, damping: 24 }}
      className="sheet border border-line bg-sheet p-4"
    >
      <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-ink-3">
        <span className="tag size-3" style={{ background: ink }} />
        {who}, offline
      </p>
      <p className="text-base leading-relaxed sm:text-lg">{children}</p>
    </motion.div>
  );
}

/** Two offline edits to one sentence join back without a conflict. */
export function MergeStage({ running }: { running: boolean }) {
  const phase = useLoop(DURATIONS, running);

  return (
    <div className="flex h-full flex-col justify-center gap-4 p-5 sm:p-8">
      <motion.p layout className="sheet border border-line bg-wash p-4 text-base sm:text-lg">
        <span className="mb-2 block text-xs font-semibold text-ink-3">Both start here</span>
        The test ran.
      </motion.p>

      <svg viewBox="0 0 400 56" className="h-12 w-full shrink-0" aria-hidden="true" preserveAspectRatio="none">
        {[
          { d: "M200 0 C200 34 96 22 96 56", ink: PRIYA },
          { d: "M200 0 C200 34 304 22 304 56", ink: LEO },
        ].map((p) => (
          <motion.path
            key={p.ink}
            d={p.d}
            fill="none"
            stroke={p.ink}
            strokeWidth="3.5"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            animate={{ pathLength: phase >= 1 ? 1 : 0, opacity: phase >= 1 ? 1 : 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          />
        ))}
      </svg>

      <div className="relative min-h-[15rem]">
        <AnimatePresence mode="popLayout">
          {phase === 1 && (
            <motion.div key="split" exit={{ opacity: 0 }} className="grid gap-3 sm:grid-cols-2">
              <Line who="Priya" ink={PRIYA}>
                The test ran <Mark ink={PRIYA}>ten times</Mark>.
              </Line>
              <Line who="Leo" ink={LEO}>
                The test ran <Mark ink={LEO}>on Wi-Fi</Mark>.
              </Line>
            </motion.div>
          )}
          {phase === 2 && (
            <motion.div
              key="merged"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 240, damping: 20 }}
              className="sheet border-2 border-brand bg-sheet p-5"
            >
              <p className="mb-2 text-xs font-semibold text-ink-3">Back online, both edits kept</p>
              <p className="text-lg leading-loose sm:text-xl">
                The test ran <Mark ink={PRIYA}>ten times</Mark> <Mark ink={LEO}>on Wi-Fi</Mark>.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
