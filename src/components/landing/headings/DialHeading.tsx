"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";

const ALPHABET = "abcdefghijklmnopqrstuvwxyz";
const WORDS = ["Locked", "properly."];

/** Each letter is a dial on a combination lock that spins until it clicks into place. */
function Dial({ char, index, open }: { char: string; index: number; open: boolean }) {
  const lower = char.toLowerCase();
  const turns = ALPHABET.includes(lower);
  const strip = turns
    ? [...Array.from({ length: 5 + (index % 4) }, (_, i) => ALPHABET[(ALPHABET.indexOf(lower) + 7 * (i + 1) + index) % 26]), char]
    : [char];

  return (
    <span className="relative inline-block overflow-hidden pb-[0.22em] pt-[0.06em] align-bottom">
      {/* Holds the final width so the line never moves. */}
      <span className="invisible block leading-none">{char}</span>
      <motion.span
        className="absolute inset-x-0 top-[0.06em] flex flex-col items-center"
        initial={false}
        animate={{ y: open ? `-${strip.length - 1}em` : "0em" }}
        transition={{ duration: 0.9 + index * 0.07, ease: [0.16, 1, 0.3, 1] }}
      >
        {strip.map((c, i) => (
          <span key={i} className="block h-[1em] leading-none">
            {c}
          </span>
        ))}
      </motion.span>
    </span>
  );
}

export function DialHeading() {
  const ref = useRef<HTMLHeadingElement>(null);
  const seen = useInView(ref, { once: true, amount: 0.8 });
  const reduced = useReducedMotion();

  return (
    <h2 ref={ref} aria-label="Locked properly." className="display flex flex-wrap gap-x-[0.24em] text-[clamp(3rem,10vw,9rem)]">
      {WORDS.map((word, w) => (
        <span key={word} aria-hidden="true" className="whitespace-nowrap">
          {Array.from(word).map((char, i) => (
            <Dial key={i} char={char} index={w * 6 + i} open={seen || !!reduced} />
          ))}
        </span>
      ))}
    </h2>
  );
}
