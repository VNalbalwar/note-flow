"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { PEOPLE_INKS } from "@/lib/people";
import { useLoop } from "../useLoop";

const LINES = [
  { from: 0, ink: PEOPLE_INKS[1].ink, text: "Aim: compare three sorting methods." },
  { from: 1, ink: PEOPLE_INKS[2].ink, text: "Setup: one laptop, 100,000 numbers." },
  { from: 2, ink: PEOPLE_INKS[3].ink, text: "Results table with ten runs each." },
  { from: 3, ink: PEOPLE_INKS[4].ink, text: "Merge sort stayed steady on every run." },
  { from: 4, ink: PEOPLE_INKS[5].ink, text: "Conclusion and what we would change." },
];
const TIMES = ["Mon 4:10 pm", "Mon 9:42 pm", "Tue 11:05 am", "Tue 8:30 pm", "Wed 1:15 am"];
const DURATIONS = [900, 900, 900, 900, 2400] as const;

/** Drag the handle to move the page back and forth through its history. */
export function VersionStage({ running }: { running: boolean }) {
  const auto = useLoop(DURATIONS, running);
  const [picked, setPicked] = useState<number | null>(null);
  const version = picked ?? auto;

  return (
    <div className="flex h-full flex-col justify-center gap-7 p-5 sm:p-8">
      <ul className="min-h-[15rem] space-y-3">
        <AnimatePresence initial={false}>
          {LINES.filter((l) => l.from <= version).map((l) => (
            <motion.li
              key={l.text}
              layout
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              className="flex items-center gap-3 text-base sm:text-lg"
            >
              <span className="tag h-5 w-5 shrink-0" style={{ background: l.ink }} />
              {l.text}
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      <label className="block">
        <span className="mb-3 flex items-baseline justify-between text-sm">
          <span className="font-semibold">Drag to go back in time</span>
          <span className="tabular-nums text-ink-3">{TIMES[version]}</span>
        </span>
        <input
          type="range"
          min={0}
          max={LINES.length - 1}
          value={version}
          onChange={(e) => setPicked(Number(e.target.value))}
          aria-valuetext={TIMES[version]}
          className="w-full accent-[var(--brand)]"
        />
      </label>
    </div>
  );
}
