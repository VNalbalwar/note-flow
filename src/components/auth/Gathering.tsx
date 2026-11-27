"use client";

import { motion, useReducedMotion } from "motion/react";
import { CursorMark } from "@/components/presence/CursorMark";
import { PEOPLE_INKS } from "@/lib/people";

const PEOPLE = [
  { name: "Priya", ink: PEOPLE_INKS[1].ink, x: [-170, -96, -150], y: [-150, -96, -130] },
  { name: "Leo", ink: PEOPLE_INKS[2].ink, x: [150, 92, 170], y: [-130, -74, -110] },
  { name: "Amara", ink: PEOPLE_INKS[3].ink, x: [-190, -120, -165], y: [60, 40, 92] },
  { name: "Kenji", ink: PEOPLE_INKS[5].ink, x: [130, 100, 150], y: [110, 70, 128] },
  { name: "Sofia", ink: PEOPLE_INKS[4].ink, x: [-40, -12, -60], y: [160, 108, 150] },
];

/** Teammates drifting in around the name, waiting for you to join them. */
export function Gathering() {
  const reduced = useReducedMotion();
  return (
    <div aria-hidden="true" className="relative grid h-full place-items-center overflow-hidden">
      {[17, 27, 37].map((size, i) => (
        <motion.span
          key={size}
          className="absolute rounded-full border border-dashed border-white/25"
          style={{ width: `${size}rem`, height: `${size}rem` }}
          animate={reduced ? undefined : { rotate: i % 2 ? -360 : 360 }}
          transition={{ duration: 60 + i * 30, repeat: Infinity, ease: "linear" }}
        />
      ))}
      <motion.p className="display relative text-7xl text-white" initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 150, damping: 15 }}>
        huddle
      </motion.p>
      {PEOPLE.map((p, i) => (
        <motion.div
          key={p.name}
          className="absolute left-1/2 top-1/2"
          initial={{ x: p.x[0] * 3, y: p.y[0] * 3, opacity: 0 }}
          animate={reduced ? { x: p.x[1], y: p.y[1], opacity: 1 } : { x: [p.x[0], p.x[1], p.x[2], p.x[0]], y: [p.y[0], p.y[1], p.y[2], p.y[0]], opacity: 1 }}
          transition={{ x: { duration: 9 + i, repeat: Infinity, ease: "easeInOut" }, y: { duration: 9 + i, repeat: Infinity, ease: "easeInOut" }, opacity: { delay: 0.2 + i * 0.15 } }}
        >
          <CursorMark ink={p.ink} name={p.name} />
        </motion.div>
      ))}
    </div>
  );
}
