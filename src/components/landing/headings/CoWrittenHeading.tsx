"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "motion/react";
import { PEOPLE_INKS, onInk } from "@/lib/people";

/**
 * A headline that three people write at the same moment. Every letter holds its
 * place from the start, so nothing reflows while they type.
 */
const PARTS = [
  { text: "Three", name: "Priya", ink: PEOPLE_INKS[1].ink, startAt: 0, perLetter: 150 },
  { text: "people.", name: "Leo", ink: PEOPLE_INKS[2].ink, startAt: 260, perLetter: 120 },
  { text: "One page.", name: "Amara", ink: PEOPLE_INKS[3].ink, startAt: 120, perLetter: 135 },
] as const;

const DONE_AT = Math.max(...PARTS.map((p) => p.startAt + p.text.length * p.perLetter)) + 900;

function Part({ part, elapsed }: { part: (typeof PARTS)[number]; elapsed: number }) {
  const chars = Array.from(part.text);
  const typed = Math.max(0, Math.min(chars.length, Math.floor((elapsed - part.startAt) / part.perLetter)));
  const finished = elapsed >= DONE_AT;
  const started = elapsed > part.startAt;

  return (
    <span className="relative whitespace-nowrap">
      {chars.map((char, i) => (
        <span
          key={i}
          className="relative transition-colors duration-700"
          style={{ color: i < typed ? (finished ? "var(--ink)" : part.ink) : "transparent" }}
        >
          {char}
          {!finished && started && i === Math.max(0, typed - 1) && (
            <span
              className="absolute inset-y-[0.06em] w-[0.055em] rounded-full"
              style={{ background: part.ink, left: typed === 0 ? 0 : "100%" }}
            >
              <span
                className="tag absolute bottom-full left-0 mb-[-0.1em] whitespace-nowrap px-2.5 py-1 font-sans text-xs font-semibold leading-none tracking-normal [font-variation-settings:normal] sm:text-sm"
                style={{ background: part.ink, color: onInk(part.ink) }}
              >
                {part.name}
              </span>
            </span>
          )}
        </span>
      ))}
    </span>
  );
}

export function CoWrittenHeading() {
  const ref = useRef<HTMLHeadingElement>(null);
  const seen = useInView(ref, { once: true, amount: 0.7 });
  const reduced = useReducedMotion();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!seen || reduced) return;
    let raf = 0;
    const start = performance.now();
    let shown = "";
    const tick = (now: number) => {
      const passed = now - start;
      // Re-render only when someone's next letter is due.
      const letters = PARTS.map((p) => Math.floor((passed - p.startAt) / p.perLetter)).join() + (passed >= DONE_AT);
      if (letters !== shown) {
        shown = letters;
        setElapsed(passed);
      }
      if (now - start <= DONE_AT) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [seen, reduced]);

  const at = reduced ? DONE_AT : elapsed;

  return (
    <h2
      ref={ref}
      aria-label="Three people. One page."
      className="display pt-[0.35em] text-center text-[clamp(2.6rem,9.4vw,8.5rem)]"
    >
      <span aria-hidden="true">
        <span className="block">
          <Part part={PARTS[0]} elapsed={at} /> <Part part={PARTS[1]} elapsed={at} />
        </span>
        <span className="mt-[0.12em] block">
          <Part part={PARTS[2]} elapsed={at} />
        </span>
      </span>
    </h2>
  );
}
