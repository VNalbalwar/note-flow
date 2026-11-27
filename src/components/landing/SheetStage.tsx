"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { DemoDocument } from "./DemoDocument";

/** The shared page arrives leaning back, then stands up flat as you reach it. */
export function SheetStage() {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "start 0.2"] });
  const progress = useSpring(scrollYProgress, { stiffness: 420, damping: 48, mass: 0.4 });
  const rotateX = useTransform(progress, [0, 1], [34, 0]);
  const scale = useTransform(progress, [0, 1], [0.86, 1]);
  const y = useTransform(progress, [0, 1], [60, 0]);

  return (
    <div ref={ref} className="mx-auto max-w-4xl [perspective:1400px]">
      <motion.div style={reduced ? undefined : { rotateX, scale, y, transformOrigin: "50% 0%" }}>
        <DemoDocument />
      </motion.div>
    </div>
  );
}
