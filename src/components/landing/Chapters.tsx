"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "motion/react";
import { MergeStage } from "./stages/MergeStage";
import { CommentStage } from "./stages/CommentStage";
import { VersionStage } from "./stages/VersionStage";
import { AccessStage } from "./stages/AccessStage";

/** Each chapter has its own colour, which takes over the room. */
const CHAPTERS = [
  {
    id: "merge",
    wash: "var(--ch1)",
    on: "var(--ch1-on)",
    title: "Nobody overwrites anybody",
    body: "Type in the same sentence at the same moment. If your connection drops, keep going. When it returns, both sets of changes are there.",
    Stage: MergeStage,
  },
  {
    id: "comments",
    wash: "var(--ch2)",
    on: "var(--ch2-on)",
    title: "Argue in the margin",
    body: "Select any words and start a thread on them. Reply, react, then resolve it so the page stays clean.",
    Stage: CommentStage,
  },
  {
    id: "versions",
    wash: "var(--ch3)",
    on: "var(--ch3-on)",
    title: "Wind it back",
    body: "Huddle keeps versions as you work. Open an older one and bring it back, even after a bad night of editing.",
    Stage: VersionStage,
  },
  {
    id: "access",
    wash: "var(--ch4)",
    on: "var(--ch4-on)",
    title: "You hold the door",
    body: "Invite by email or share a link. Make people editors or viewers, and change your mind whenever you like.",
    Stage: AccessStage,
  },
] as const;

function Panel({ index, active }: { index: number; active: boolean }) {
  const { Stage, title } = CHAPTERS[index];
  return (
    <div
      role="group"
      aria-label={`Demo: ${title}`}
      className="sheet h-full w-full overflow-hidden border border-white/20 bg-sheet text-ink shadow-[0_50px_90px_-30px_rgb(6_22_8/0.55)]"
    >
      <Stage running={active} />
    </div>
  );
}

function Copy({ index, onActive }: { index: number; onActive: (i: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const centred = useInView(ref, { margin: "-48% 0px -48% 0px" });
  const nearby = useInView(ref, { amount: 0.4 });
  useEffect(() => {
    if (centred) onActive(index);
  }, [centred, index, onActive]);
  const chapter = CHAPTERS[index];

  return (
    <div ref={ref} className="flex flex-col justify-center py-16 lg:min-h-screen lg:py-0">
      <h3 className="display text-[clamp(2.75rem,6vw,5.5rem)]">{chapter.title}</h3>
      <p className="mt-6 max-w-[38ch] text-xl leading-relaxed">{chapter.body}</p>
      <div className="mt-10 h-[32rem] lg:hidden">
        <Panel index={index} active={nearby} />
      </div>
    </div>
  );
}

export function Chapters() {
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLElement>(null);
  const visible = useInView(ref, { amount: 0.05 });

  return (
    <motion.section
      ref={ref}
      aria-label="What you can do together"
      className="relative isolate mx-2 overflow-clip rounded-[10px_44px_44px_44px] px-4 transition-colors duration-700 md:mx-4 md:px-8"
      style={{ color: CHAPTERS[active].on }}
    >
      {/* Gradients cannot be tweened, so each chapter's wash cross-fades in. */}
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        {CHAPTERS.map((c, i) => (
          <motion.span
            key={c.id}
            className="absolute inset-0"
            style={{ background: c.wash }}
            initial={false}
            animate={{ opacity: i <= active ? 1 : 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          />
        ))}
        <span className="sticky top-0 block h-screen">
          <span className="absolute -right-[10vw] top-[-20vh] block size-[60vw] rounded-full bg-[radial-gradient(closest-side,rgb(255_255_255/0.28),transparent)]" />
        </span>
      </div>
      <div className="grid gap-x-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <div>
          {CHAPTERS.map((c, i) => (
            <Copy key={c.id} index={i} onActive={setActive} />
          ))}
        </div>
        <div className="hidden lg:block">
          <div className="sticky top-0 flex h-screen items-center">
            <div className="relative h-[min(36rem,82vh)] w-full [perspective:1600px]">
              {CHAPTERS.map((c, i) => (
                <motion.div
                  key={c.id}
                  className="absolute inset-0"
                  initial={false}
                  inert={i !== active}
                  animate={
                    i === active
                      ? { opacity: 1, y: 0, rotateX: 0, scale: 1 }
                      : { opacity: 0, y: i < active ? -70 : 70, rotateX: i < active ? -14 : 14, scale: 0.94 }
                  }
                  transition={{ type: "spring", stiffness: 170, damping: 24 }}
                >
                  <Panel index={i} active={visible && i === active} />
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
