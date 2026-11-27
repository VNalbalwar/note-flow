"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from "motion/react";
import { PEOPLE_INKS } from "@/lib/people";
import { CursorMark } from "@/components/presence/CursorMark";
import { Aurora } from "./Aurora";

const WORD = Array.from("huddle");
/** Where each letter starts, in viewport units, before it joins the others. */
const SCATTER = [
  { x: -22, y: -30, r: -38, name: "Priya" },
  { x: -6, y: 24, r: 26, name: "Leo" },
  { x: -12, y: -22, r: 44, name: "Amara" },
  { x: 11, y: 28, r: -30, name: "Kenji" },
  { x: 7, y: -34, r: 22, name: "Sofia" },
  { x: 24, y: 14, r: 48, name: "Omar" },
];

function Letter({ char, index, progress }: { char: string; index: number; progress: MotionValue<number> }) {
  const from = SCATTER[index];
  const person = PEOPLE_INKS[(index + 1) % PEOPLE_INKS.length];
  const x = useTransform(progress, [0, 0.72], [`${from.x}vw`, "0vw"]);
  const y = useTransform(progress, [0, 0.72], [`${from.y}vh`, "0vh"]);
  const rotate = useTransform(progress, [0, 0.72], [from.r, 0]);
  const mix = useTransform(progress, [0.74, 0.92], [100, 0]);
  const color = useTransform(mix, (v) => `color-mix(in srgb, ${person.ink} ${v}%, var(--ink))`);
  const tag = useTransform(progress, [0.62, 0.8], [1, 0]);

  return (
    <motion.span style={{ x, y, rotate }} className="relative inline-block">
      <motion.span style={{ color }} className="inline-block">
        {char}
      </motion.span>
      <motion.span style={{ opacity: tag }} className="absolute left-1/2 top-[62%] font-sans text-base normal-case tracking-normal [font-variation-settings:normal]">
        <CursorMark ink={person.ink} name={from.name} />
      </motion.span>
    </motion.span>
  );
}

/** Everyone brings their letter in, and the word comes together. */
export function Finale() {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const smooth = useSpring(scrollYProgress, { stiffness: 90, damping: 22 });
  const settled = useSpring(1, { duration: 0 });
  const progress = reduced ? settled : smooth;
  // The words and button wait until the letters have cleared the space.
  const afterOpacity = useTransform(progress, [0.5, 0.74], [0, 1]);
  const afterY = useTransform(progress, [0.5, 0.74], [40, 0]);

  return (
    <section ref={ref} className="relative h-[240vh]">
      <div className="sticky top-0 isolate flex h-screen flex-col items-center justify-center overflow-hidden px-5">
        <Aurora />
        <h2 aria-label="Huddle" className="display flex whitespace-nowrap text-[23vw] lowercase leading-none">
          {WORD.map((char, i) => (
            <span key={i} aria-hidden="true">
              <Letter char={char} index={i} progress={progress} />
            </span>
          ))}
        </h2>
        <motion.div style={{ opacity: afterOpacity, y: afterY }} className="flex flex-col items-center">
          <p className="mt-4 max-w-[30ch] text-center text-xl leading-snug text-ink-2 md:text-2xl">
            Free for you and everyone you invite. Bring your people.
          </p>
          <Link href="/sign-up" className="btn btn-solid mt-8 !min-h-14 !px-8 !text-lg">
            Start writing
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
