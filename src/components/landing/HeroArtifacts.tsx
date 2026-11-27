"use client";

import { useEffect } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform, type MotionValue } from "motion/react";
import { Check, History, Heart, ThumbsUp } from "lucide-react";
import { PEOPLE_INKS, onInk } from "@/lib/people";

/**
 * Pieces of a shared page floating around the headline. Each sits at its own
 * depth, so they separate as the pointer moves.
 */
function Shard({
  mx,
  my,
  depth,
  index,
  className,
  tilt,
  children,
}: {
  mx: MotionValue<number>;
  my: MotionValue<number>;
  depth: number;
  index: number;
  className: string;
  tilt: number;
  children: React.ReactNode;
}) {
  const x = useTransform(mx, (v) => v * depth * 30);
  const y = useTransform(my, (v) => v * depth * 22);

  return (
    <motion.div className={`absolute will-change-transform ${className}`} style={{ x, y }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.5, rotate: tilt * 3 }}
        animate={{ opacity: 1, scale: 1, rotate: tilt }}
        transition={{ delay: 1.1 + index * 0.16, type: "spring", stiffness: 220, damping: 18 }}
      >
        <div style={{ animation: `bob ${6 + index}s ease-in-out ${-index}s infinite` }}>{children}</div>
      </motion.div>
    </motion.div>
  );
}

function Face({ letter, ink }: { letter: string; ink: string }) {
  return (
    <span className="tag grid size-7 shrink-0 place-items-center text-[11px] font-bold" style={{ background: ink, color: onInk(ink) }}>
      {letter}
    </span>
  );
}

export function HeroArtifacts() {
  const reduced = useReducedMotion();
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const mx = useSpring(rawX, { stiffness: 60, damping: 18 });
  const my = useSpring(rawY, { stiffness: 60, damping: 18 });

  useEffect(() => {
    if (reduced) return;
    const move = (e: PointerEvent) => {
      rawX.set((e.clientX / window.innerWidth - 0.5) * 2);
      rawY.set((e.clientY / window.innerHeight - 0.5) * 2);
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, [reduced, rawX, rawY]);

  const shared = { mx, my };

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[2] hidden min-[1280px]:block">
      <Shard {...shared} index={0} depth={1.2} tilt={-3} className="left-[2.5%] top-[14%]">
        <div className="raised sheet flex w-48 gap-3 p-3 text-sm leading-snug">
          <Face letter="A" ink={PEOPLE_INKS[3].ink} />
          <p>
            <span className="font-semibold">Amara</span>
            <br />
            <span className="text-ink-2">Can we put the numbers here?</span>
          </p>
        </div>
      </Shard>

      <Shard {...shared} index={1} depth={0.7} tilt={2} className="bottom-[17%] right-[2%]">
        <div className="raised tag flex items-center gap-2.5 py-2 pl-3 pr-4 text-sm font-semibold">
          <History className="size-4 text-brand" />
          Version saved just now
        </div>
      </Shard>

      <Shard {...shared} index={2} depth={1.6} tilt={4} className="right-[3.5%] top-[13%]">
        <div className="raised sheet space-y-2.5 p-4 text-sm font-medium">
          {["Book the hall", "Print posters"].map((t, i) => (
            <p key={t} className="flex items-center gap-2.5">
              <span
                className="grid size-4 place-items-center rounded-[2px_6px_6px_6px] border-[1.5px]"
                style={i === 0 ? { background: PEOPLE_INKS[2].ink, borderColor: PEOPLE_INKS[2].ink } : { borderColor: "var(--ink-3)" }}
              >
                {i === 0 && <Check className="size-3" strokeWidth={4} color={PEOPLE_INKS[2].on} />}
              </span>
              <span className={i === 0 ? "text-ink-3 line-through" : ""}>{t}</span>
            </p>
          ))}
        </div>
      </Shard>

      <Shard {...shared} index={3} depth={1} tilt={-2} className="bottom-[18%] left-[4%]">
        <pre className="sheet border border-white/10 bg-[var(--code-bg)] px-4 py-3 font-mono text-[13px] leading-6 text-[var(--code-ink)] shadow-[var(--shadow)]">
          <span style={{ color: PEOPLE_INKS[4].ink }}>return</span> median(<span style={{ color: PEOPLE_INKS[6].ink }}>runs</span>)
        </pre>
      </Shard>

      <Shard {...shared} index={4} depth={1.4} tilt={3} className="bottom-[6%] right-[13%]">
        <div className="raised tag flex items-center gap-3 py-2 pl-3.5 pr-4 text-sm font-bold">
          <span className="flex items-center gap-1.5">
            <ThumbsUp className="size-4" style={{ color: PEOPLE_INKS[5].ink }} fill="currentColor" /> 3
          </span>
          <span className="flex items-center gap-1.5">
            <Heart className="size-4" style={{ color: PEOPLE_INKS[4].ink }} fill="currentColor" /> 2
          </span>
        </div>
      </Shard>
    </div>
  );
}
