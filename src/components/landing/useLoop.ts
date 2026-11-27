"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";

/**
 * Steps through phases while `running`. `durations` is milliseconds per phase.
 * With reduced motion it rests on the final phase, which shows the outcome.
 */
export function useLoop(durations: readonly number[], running: boolean) {
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (!running || reduced) return;
    const id = window.setTimeout(() => setPhase((p) => (p + 1) % durations.length), durations[phase]);
    return () => window.clearTimeout(id);
  }, [phase, running, reduced, durations]);

  return reduced ? durations.length - 1 : phase;
}
