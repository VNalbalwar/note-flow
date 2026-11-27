"use client";

import { useRef } from "react";
import {
  motion,
  useAnimationFrame,
  useInView,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from "motion/react";
import { PEOPLE_INKS } from "@/lib/people";

const ROWS = [
  ["Lab report", "Sprint plan", "Lecture notes", "API design", "Club minutes", "Trip itinerary"],
  ["Hackathon brief", "Study guide", "Release checklist", "Event run sheet", "Viva prep", "Bug diary"],
];

function wrap(min: number, max: number, value: number) {
  const range = max - min;
  return ((((value - min) % range) + range) % range) + min;
}

/** A band of document names that drifts, and speeds up as you scroll. */
function Row({ items, direction, offset, running }: { items: string[]; direction: 1 | -1; offset: number; running: boolean }) {
  const reduced = useReducedMotion();
  const base = useMotionValue(0);
  const { scrollY } = useScroll();
  const velocity = useSpring(useVelocity(scrollY), { damping: 50, stiffness: 300 });
  const boost = useTransform(velocity, [-1500, 0, 1500], [-4, 0, 4], { clamp: true });
  const heading = useRef<number>(direction);
  const x = useTransform(base, (v) => `${wrap(-50, 0, v)}%`);

  useAnimationFrame((_, delta) => {
    if (reduced || !running) return;
    const push = boost.get();
    if (push < -0.1) heading.current = -direction;
    else if (push > 0.1) heading.current = direction;
    base.set(base.get() + heading.current * (delta / 1000) * (1.4 + Math.abs(push) * 2.2));
  });

  return (
    <div className="overflow-hidden">
      <motion.div className="flex w-max items-center will-change-transform" style={{ x }}>
        {[0, 1].map((copy) => (
          <div key={copy} className="flex items-center">
            {items.map((item, i) => {
              const person = PEOPLE_INKS[(i + offset) % PEOPLE_INKS.length];
              return (
                <span key={item} className="flex items-center gap-6 pr-6 md:gap-10 md:pr-10">
                  <span className="display whitespace-nowrap py-2 text-5xl md:text-7xl">{item}</span>
                  <span className="tag h-7 w-14 md:h-10 md:w-20" style={{ background: person.ink }} />
                </span>
              );
            })}
          </div>
        ))}
      </motion.div>
    </div>
  );
}

export function Ticker() {
  const ref = useRef<HTMLElement>(null);
  const running = useInView(ref);
  return (
    <section ref={ref} aria-label="Things people write together" className="relative z-[5] overflow-x-clip py-8 md:py-14">
      <p className="sr-only">{ROWS.flat().join(", ")}</p>
      <div aria-hidden="true" className="-mx-4 -rotate-[1.6deg] border-y border-line bg-sheet py-5 shadow-[var(--shadow)] md:py-7">
        <Row items={ROWS[0]} direction={-1} offset={0} running={running} />
        <Row items={ROWS[1]} direction={1} offset={4} running={running} />
      </div>
    </section>
  );
}
