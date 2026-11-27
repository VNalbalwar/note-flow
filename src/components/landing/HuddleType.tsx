"use client";

import { forwardRef, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CursorMark } from "@/components/presence/CursorMark";
import { PEOPLE_INKS, initials, onInk } from "@/lib/people";

/**
 * The signature headline. Letters keep their natural shapes. When a person comes
 * near one, it grows and takes their colour while its neighbours move aside, so
 * each line keeps the same width.
 *
 * Performance: letters are laid out once. After that every frame only moves and
 * scales them, which the graphics card does without redrawing or re-laying-out.
 * All motion is timed by the clock, so it runs at the same speed at 60 or 240 Hz.
 */

const LINES = ["Write it", "together."];
/** How much bigger a letter gets directly under someone. */
const SWELL = 0.13;

const TEAMMATES = [
  { name: "Priya", ink: PEOPLE_INKS[1].ink },
  { name: "Leo", ink: PEOPLE_INKS[2].ink },
  { name: "Amara", ink: PEOPLE_INKS[3].ink },
  { name: "Kenji", ink: PEOPLE_INKS[5].ink },
  { name: "Sofia", ink: PEOPLE_INKS[4].ink },
  { name: "Omar", ink: PEOPLE_INKS[6].ink },
];
const VISITOR_INK = PEOPLE_INKS[0].ink;

type Letter = {
  el: HTMLSpanElement;
  line: number;
  space: boolean;
  /** position at rest, in pixels from the headline's top-left corner */
  x: number;
  y: number;
  width: number;
  influence: number;
  owner: string | null;
  shift: number;
  scaleX: number;
  scaleY: number;
};

type Walker = { x: number; y: number; vx: number; vy: number; tx: number; ty: number; wait: number; delay: number };

/** The glow a person casts on the page. It sits behind the letters. */
const Light = forwardRef<HTMLSpanElement, { ink: string; on: boolean }>(function Light({ ink, on }, ref) {
  return (
    <span ref={ref} aria-hidden="true" className={`pointer-events-none absolute left-0 top-0 will-change-transform ${on ? "" : "hidden"}`}>
      <span
        className="absolute -left-[16rem] -top-[16rem] block size-[32rem]"
        style={{ background: `radial-gradient(closest-side, ${ink}, transparent)`, opacity: "var(--glow)" }}
      />
    </span>
  );
});

export function HuddleType({ children }: { children?: React.ReactNode }) {
  const reduced = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const cursorRefs = useRef<(HTMLDivElement | null)[]>([]);
  const lightRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const visitorRef = useRef<HTMLDivElement>(null);
  const visitorLightRef = useRef<HTMLSpanElement>(null);
  const [crowd, setCrowd] = useState(2);
  const [visitorHere, setVisitorHere] = useState(false);
  const crowdRef = useRef(crowd);
  useEffect(() => {
    crowdRef.current = crowd;
    rootRef.current?.dispatchEvent(new Event("huddle:crowd"));
  }, [crowd]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let raf = 0;
    let last = 0;
    let disposed = false;
    let visible = true;
    let letters: Letter[] = [];
    let rows: Letter[][] = [];
    let stageWidth = 0;
    let stageHeight = 0;
    let lineHeight = 0;
    let fontSize = 100;
    let origin = { left: 0, top: 0 };
    const visitor = { x: 0, y: 0, here: false };
    const walkers: Walker[] = [];

    const randomTarget = () => {
      const pool = letters.filter((l) => !l.space);
      const pick = pool[Math.floor(Math.random() * pool.length)];
      return pick
        ? { tx: pick.x + (Math.random() - 0.5) * 24, ty: pick.y + (Math.random() - 0.3) * lineHeight * 0.35 }
        : { tx: stageWidth / 2, ty: stageHeight / 2 };
    };

    /** Read the natural layout once; nothing is measured again until a resize. */
    const measure = () => {
      const box = root.getBoundingClientRect();
      stageWidth = box.width;
      const lines = Array.from(root.querySelectorAll<HTMLElement>("[data-line]"));
      stageHeight = lines.reduce((sum, l) => sum + l.offsetHeight, 0);
      lineHeight = stageHeight / Math.max(1, lines.length);
      fontSize = parseFloat(getComputedStyle(lines[0]).fontSize);
      letters = [];
      rows = lines.map((lineEl, line) =>
        Array.from(lineEl.querySelectorAll<HTMLSpanElement>("[data-letter]")).map((el) => {
          el.style.transform = "";
          const letter: Letter = {
            el,
            line,
            space: el.dataset.letter === " ",
            x: el.offsetLeft + el.offsetWidth / 2,
            y: lineEl.offsetTop + lineHeight / 2,
            width: el.offsetWidth,
            influence: 0,
            owner: null,
            shift: 0,
            scaleX: 1,
            scaleY: 1,
          };
          el.style.color = "";
          letters.push(letter);
          return letter;
        }),
      );
    };

    const place = (cursor: HTMLElement | null, light: HTMLElement | null, x: number, y: number) => {
      const at = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      if (cursor) cursor.style.transform = at;
      if (light) light.style.transform = at;
    };

    /** `ease` is how far to move towards the goal this frame (1 = jump there). */
    const paint = (ease: number) => {
      const count = crowdRef.current;
      const sigma = Math.max(12, fontSize * 0.2);
      const spread = 2 * sigma * sigma;

      for (const row of rows) {
        let extra = 0;
        let total = 0;
        for (const l of row) {
          total += l.width;
          if (l.space) continue;
          let best = 0;
          let owner: string | null = null;
          const near = (ax: number, ay: number, ink: string) => {
            const dx = Math.max(0, Math.abs(ax - l.x - l.shift) - l.width * 0.34);
            const dy = (ay - l.y) * 1.2;
            const v = Math.exp(-(dx * dx + dy * dy) / spread);
            if (v > best) {
              best = v;
              owner = ink;
            }
          };
          for (let i = 0; i < count; i++) if (walkers[i].delay <= 0) near(walkers[i].x, walkers[i].y, TEAMMATES[i].ink);
          if (visitor.here) near(visitor.x, visitor.y, VISITOR_INK);

          l.influence += (best - l.influence) * ease;
          extra += l.width * SWELL * l.influence;
          const claim = l.influence > 0.42 ? owner : null;
          if (claim !== l.owner) {
            l.owner = claim;
            l.el.style.color = claim ?? "";
          }
        }

        // Share the growth out so the line stays exactly as wide as before.
        const squeeze = total / (total + extra);
        let at = row[0] ? row[0].x - row[0].width / 2 : 0;
        for (const l of row) {
          const grow = l.space ? 1 : 1 + SWELL * l.influence;
          const width = l.width * grow * squeeze;
          const shift = at + width / 2 - l.x;
          at += width;
          if (l.space) continue;
          const scaleX = grow * squeeze;
          if (Math.abs(shift - l.shift) < 0.05 && Math.abs(scaleX - l.scaleX) < 0.0004 && Math.abs(grow - l.scaleY) < 0.0004) continue;
          l.shift = shift;
          l.scaleX = scaleX;
          l.scaleY = grow;
          l.el.style.transform = `translate3d(${shift.toFixed(2)}px,0,0) scale(${scaleX.toFixed(4)},${grow.toFixed(4)})`;
        }
      }
    };

    const step = (now: number) => {
      // Time since the last frame, measured in sixtieths of a second.
      const dt = last ? Math.min(3, (now - last) / (1000 / 60)) : 1;
      last = now;
      for (let i = 0; i < crowdRef.current; i++) {
        const w = walkers[i];
        if (w.delay > 0) {
          w.delay -= dt;
          place(cursorRefs.current[i], lightRefs.current[i], w.x, w.y);
          continue;
        }
        const dx = w.tx - w.x;
        const dy = w.ty - w.y;
        const damping = Math.pow(0.9, dt);
        w.vx = (w.vx + dx * 0.0042 * dt) * damping;
        w.vy = (w.vy + dy * 0.0042 * dt) * damping;
        w.x += w.vx * dt;
        w.y += w.vy * dt;
        if (Math.abs(dx) < 12 && Math.abs(dy) < 12) {
          w.wait -= dt;
          if (w.wait <= 0) {
            Object.assign(w, randomTarget());
            w.wait = 40 + Math.random() * 90;
          }
        }
        place(cursorRefs.current[i], lightRefs.current[i], w.x, w.y);
      }
      paint(1 - Math.pow(0.86, dt));
      raf = visible && !disposed ? requestAnimationFrame(step) : 0;
    };

    const start = () => {
      if (raf || reduced || !visible || !letters.length) return;
      last = 0;
      raf = requestAnimationFrame(step);
    };

    const settleStill = () => {
      // Reduced motion: teammates rest on letters and nothing moves.
      const spots = [2, 11, 6, 13, 0, 9];
      walkers.forEach((w, i) => {
        const l = letters[spots[i]];
        if (!l) return;
        w.x = l.x;
        w.y = l.y;
        w.delay = 0;
        place(cursorRefs.current[i], lightRefs.current[i], w.x, w.y);
      });
      paint(1);
    };

    const layout = () => {
      measure();
      if (!walkers.length) {
        for (let i = 0; i < TEAMMATES.length; i++) {
          const fromLeft = i % 2 === 0;
          walkers.push({
            x: fromLeft ? -140 : stageWidth + 140,
            y: stageHeight * (0.2 + Math.random() * 0.8),
            vx: 0,
            vy: 0,
            ...randomTarget(),
            wait: 60,
            delay: 70 + i * 45,
          });
        }
      } else {
        for (const w of walkers) Object.assign(w, randomTarget());
      }
      if (reduced) settleStill();
    };

    const onEnter = () => {
      // Read the position once per visit rather than on every mouse move.
      const box = root.getBoundingClientRect();
      origin = { left: box.left + window.scrollX, top: box.top + window.scrollY };
    };
    const onMove = (event: PointerEvent) => {
      if (!visitor.here) {
        onEnter();
        visitor.here = true;
        setVisitorHere(true);
      }
      visitor.x = event.pageX - origin.left;
      visitor.y = event.pageY - origin.top;
      place(visitorRef.current, visitorLightRef.current, visitor.x, visitor.y);
      if (reduced) paint(1);
    };
    const onLeave = () => {
      visitor.here = false;
      setVisitorHere(false);
      if (reduced) paint(1);
    };
    const onCrowd = () => {
      if (reduced) settleStill();
    };

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
    });
    let resizeTimer = 0;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(layout, 120);
    };

    document.fonts.ready.then(() => {
      if (disposed) return;
      layout();
      root.dataset.ready = "true";
      observer.observe(root);
      window.addEventListener("resize", onResize);
      start();
    });

    root.addEventListener("huddle:crowd", onCrowd);
    root.addEventListener("pointerenter", onEnter);
    root.addEventListener("pointermove", onMove, { passive: true });
    root.addEventListener("pointerdown", onMove, { passive: true });
    root.addEventListener("pointerleave", onLeave);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(resizeTimer);
      observer.disconnect();
      window.removeEventListener("resize", onResize);
      root.removeEventListener("huddle:crowd", onCrowd);
      root.removeEventListener("pointerenter", onEnter);
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerdown", onMove);
      root.removeEventListener("pointerleave", onLeave);
    };
  }, [reduced]);

  const full = crowd >= TEAMMATES.length;
  const present = TEAMMATES.slice(0, crowd);

  return (
    <>
      <div ref={rootRef} className="group relative touch-pan-y select-none">
        {TEAMMATES.map((mate, i) => (
          <Light
            key={mate.name}
            ref={(el) => {
              lightRefs.current[i] = el;
            }}
            ink={mate.ink}
            on={i < crowd}
          />
        ))}
        <Light ref={visitorLightRef} ink={VISITOR_INK} on={visitorHere} />

        <h1 className="hero-type relative z-[1] text-center" aria-label="Write it together.">
          {LINES.map((text, line) => (
            <span key={text} data-line aria-hidden="true" className="relative mx-auto block w-max whitespace-nowrap">
              {Array.from(text).map((char, i) => (
                <span key={i} data-letter={char} className="hero-letter">
                  <span
                    className="inline-block translate-y-[0.3em] whitespace-pre opacity-0 transition-[opacity,translate] duration-[800ms] ease-[var(--ease-out-expo)] group-data-[ready=true]:translate-y-0 group-data-[ready=true]:opacity-100"
                    style={{ transitionDelay: `${(line * 9 + i) * 32}ms` }}
                  >
                    {char}
                  </span>
                </span>
              ))}
            </span>
          ))}
        </h1>

        {present.map((mate, i) => (
          <div
            key={mate.name}
            ref={(el) => {
              cursorRefs.current[i] = el;
            }}
            aria-hidden="true"
            className="pointer-events-none absolute left-0 top-0 z-[3] opacity-0 will-change-transform group-data-[ready=true]:opacity-100"
          >
            <CursorMark ink={mate.ink} name={mate.name} />
          </div>
        ))}
        <div
          ref={visitorRef}
          aria-hidden="true"
          className={`pointer-events-none absolute left-0 top-0 z-[4] will-change-transform ${visitorHere ? "opacity-100" : "opacity-0"}`}
        >
          <CursorMark ink={VISITOR_INK} name="You" />
        </div>
      </div>

      <div className="relative z-[5] mt-[3.5svh] flex flex-col items-center gap-5 text-center">
        <p className="max-w-[46ch] text-xl leading-snug text-ink-2 md:text-2xl">
          One page, everyone in it at once. Quiet until your people arrive, then it lights up.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {children}
          <button type="button" className="btn btn-line" onClick={() => setCrowd((n) => (full ? 0 : n + 1))}>
            {full ? "Send everyone home" : "Add a demo teammate"}
          </button>
        </div>
        <div className="flex h-8 items-center gap-3 text-sm text-ink-3">
          <span className="flex -space-x-1.5">
            <AnimatePresence initial={false}>
              {present.map((mate) => (
                <motion.span
                  key={mate.name}
                  initial={{ scale: 0, y: -16 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0, y: 16 }}
                  transition={{ type: "spring", stiffness: 460, damping: 24 }}
                  className="tag grid size-8 place-items-center text-[11px] font-bold ring-2 ring-[var(--ground)]"
                  style={{ background: mate.ink, color: onInk(mate.ink) }}
                >
                  {initials(mate.name)}
                </motion.span>
              ))}
            </AnimatePresence>
          </span>
          <span>{crowd === 0 ? "Nobody here yet. All quiet." : `${crowd} demo teammate${crowd > 1 ? "s" : ""} here`}</span>
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {crowd} demo teammates on the headline.
      </p>
    </>
  );
}
