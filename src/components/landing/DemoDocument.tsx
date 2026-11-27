"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { PEOPLE_INKS, initials, onInk } from "@/lib/people";

/**
 * A scripted preview of a shared page: three demo people write into different
 * blocks at once. It is labelled as a demo; nothing here is live user data.
 */
const WRITERS = [
  {
    name: "Priya",
    ink: PEOPLE_INKS[1].ink,
    kind: "text" as const,
    text: "We measured round-trip latency across three campus networks, ten runs each.",
  },
  {
    name: "Leo",
    ink: PEOPLE_INKS[2].ink,
    kind: "check" as const,
    text: "Re-run the Wi-Fi trial before Friday",
  },
  {
    name: "Amara",
    ink: PEOPLE_INKS[3].ink,
    kind: "text" as const,
    text: "The wired lab network held steady. Wi-Fi doubled its worst case after 6 pm.",
  },
];

const SPEEDS = [34, 52, 28];

function useTyping(running: boolean, reduced: boolean) {
  const [counts, setCounts] = useState(() => WRITERS.map(() => 0));
  const doneAt = useRef(0);

  useEffect(() => {
    if (!running || reduced) return;
    let raf = 0;
    let start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const next = WRITERS.map((w, i) => Math.max(0, Math.min(w.text.length, Math.floor((elapsed - i * 500) / SPEEDS[i]))));
      setCounts((current) => (current.every((n, i) => n === next[i]) ? current : next));
      if (next.every((n, i) => n === WRITERS[i].text.length)) {
        // Rest on the finished page for a few seconds, then start again.
        doneAt.current ||= now;
        if (now - doneAt.current > 4300) {
          doneAt.current = 0;
          start = now;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, reduced]);

  return reduced ? WRITERS.map((w) => w.text.length) : counts;
}

function Typed({ index, count }: { index: number; count: number }) {
  const writer = WRITERS[index];
  const typing = count > 0 && count < writer.text.length;
  return (
    <span aria-hidden="true">
      {writer.text.slice(0, count)}
      <span className="relative inline-block h-[1.1em] w-0 align-text-bottom">
        <span
          className="absolute bottom-0 left-0 h-full w-0.5"
          style={{ background: writer.ink, animation: typing ? undefined : "caret-blink 1.1s step-end infinite" }}
        />
        <span
          className="absolute -top-[1.15rem] left-0 whitespace-nowrap rounded-[0_6px_6px_0] px-1.5 py-0.5 text-[10px] font-semibold leading-none"
          style={{ background: writer.ink, color: onInk(writer.ink) }}
        >
          {writer.name}
        </span>
      </span>
    </span>
  );
}

export function DemoDocument() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.3 });
  const reduced = useReducedMotion() ?? false;
  const counts = useTyping(inView, reduced);

  return (
    <div ref={ref}>
      <p className="sr-only">
        Demo of a shared lab report where three people, Priya, Leo and Amara, type in different blocks at the same time.
      </p>
      <div className="raised sheet overflow-hidden !shadow-[var(--shadow-lift)]">
        <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-3">
          <span className="truncate text-sm font-semibold">Networks lab report</span>
          <span className="flex items-center gap-3">
            <span className="text-xs text-ink-3">Demo</span>
            <span className="flex -space-x-1.5">
              {WRITERS.map((w, i) => (
                <motion.span
                  key={w.name}
                  initial={reduced ? false : { y: -18, opacity: 0 }}
                  animate={inView ? { y: 0, opacity: 1 } : undefined}
                  transition={{ delay: 0.15 + i * 0.18, type: "spring", stiffness: 380, damping: 22 }}
                  className="tag grid size-7 place-items-center text-[10px] font-bold ring-2 ring-[var(--sheet)]"
                  style={{ background: w.ink, color: onInk(w.ink) }}
                >
                  {initials(w.name)}
                </motion.span>
              ))}
            </span>
          </span>
        </div>

        <div className="space-y-5 px-5 py-8 sm:px-12 sm:py-12">
          <p className="display-tight text-3xl sm:text-4xl">Latency on campus networks</p>
          <p className="min-h-[4.5rem] text-lg leading-relaxed sm:min-h-[3.5rem]">
            <Typed index={0} count={counts[0]} />
          </p>
          <p className="display-tight text-xl">Still to do</p>
          <div className="flex items-start gap-3 text-lg leading-relaxed">
            <span className="mt-1.5 size-4 shrink-0 rounded-[2px_6px_6px_6px] border-[1.5px] border-ink" />
            <span className="min-h-[3.5rem] sm:min-h-[1.75rem]">
              <Typed index={1} count={counts[1]} />
            </span>
          </div>
          <p className="display-tight text-xl">What we saw</p>
          <p className="min-h-[4.5rem] text-lg leading-relaxed sm:min-h-[3.5rem]">
            <Typed index={2} count={counts[2]} />
          </p>
        </div>
      </div>
    </div>
  );
}
