"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check } from "lucide-react";
import { PEOPLE_INKS, initials, onInk } from "@/lib/people";
import { useLoop } from "../useLoop";

const AMARA = PEOPLE_INKS[3].ink;
const KENJI = PEOPLE_INKS[5].ink;
const DURATIONS = [1100, 2000, 1100, 2300, 2400] as const;

function Face({ name, ink }: { name: string; ink: string }) {
  return (
    <span className="tag grid size-7 shrink-0 place-items-center text-[10px] font-bold" style={{ background: ink, color: onInk(ink) }}>
      {initials(name)}
    </span>
  );
}

export function CommentStage({ running }: { running: boolean }) {
  const phase = useLoop(DURATIONS, running);
  const resolved = phase === 4;

  return (
    <div className="flex h-full flex-col justify-center gap-6 p-5 sm:p-8">
      <p className="text-xl leading-relaxed sm:text-2xl">
        Our method is{" "}
        <span className="relative inline-block">
          <motion.span
            aria-hidden="true"
            className="absolute inset-0 origin-left rounded-[2px_8px_8px_8px]"
            style={{ background: AMARA }}
            animate={{ scaleX: resolved ? 0 : 1, opacity: 0.28 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          />
          <span className="relative px-1">clearly better</span>
        </span>{" "}
        than the baseline.
      </p>

      <div className="min-h-[13.5rem]">
        <AnimatePresence mode="wait">
          {!resolved ? (
            <motion.div
              key="thread"
              initial={{ opacity: 0, x: 40, rotate: 2 }}
              animate={{ opacity: 1, x: 0, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.2, x: 120, y: -60 }}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
              className="sheet ml-auto max-w-sm space-y-4 border border-line bg-sheet p-4 shadow-[var(--shadow)]"
            >
              <div className="flex gap-3">
                <Face name="Amara" ink={AMARA} />
                <p className="text-sm leading-relaxed">
                  <span className="font-semibold">Amara</span>
                  <br />
                  Better by how much? Add the number.
                </p>
              </div>
              {phase >= 2 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
                  <Face name="Kenji" ink={KENJI} />
                  <div className="text-sm leading-relaxed">
                    <span className="font-semibold">Kenji</span>
                    <br />
                    {phase === 2 ? (
                      <span className="mt-1.5 flex gap-1" aria-label="Kenji is typing">
                        {[0, 1, 2].map((d) => (
                          <motion.span
                            key={d}
                            className="size-1.5 rounded-full bg-ink-3"
                            animate={{ y: [0, -5, 0] }}
                            transition={{ duration: 0.6, repeat: Infinity, delay: d * 0.12 }}
                          />
                        ))}
                      </span>
                    ) : (
                      "Adding the results table under it now."
                    )}
                  </div>
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.p
              key="done"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="tag ml-auto flex w-max items-center gap-2 bg-ink px-4 py-2 text-sm font-semibold text-ground"
            >
              <Check className="size-4" aria-hidden="true" /> Thread resolved
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
