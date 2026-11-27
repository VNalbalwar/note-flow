"use client";

import { motion, useReducedMotion } from "motion/react";

/** "Press /" where the slash is a real key that goes down. */
export function SlashHeading() {
  const reduced = useReducedMotion();
  return (
    <h2 aria-label="Press slash." className="display flex flex-wrap items-center gap-x-[0.28em] text-[clamp(3rem,10vw,9rem)]">
      <span aria-hidden="true">Press</span>
      <motion.span
        aria-hidden="true"
        className="sheet inline-grid size-[1.08em] place-items-center border border-line bg-sheet pb-[0.1em] text-brand"
        initial={{ y: 0, boxShadow: "0 0.13em 0 0 var(--wash-2)" }}
        whileInView={
          reduced
            ? undefined
            : {
                y: [0, "0.11em", 0],
                boxShadow: ["0 0.13em 0 0 var(--wash-2)", "0 0.02em 0 0 var(--wash-2)", "0 0.13em 0 0 var(--wash-2)"],
              }
        }
        viewport={{ amount: 1 }}
        transition={{ duration: 0.42, delay: 0.35, repeat: 2, repeatDelay: 1.3 }}
      >
        /
      </motion.span>
    </h2>
  );
}
