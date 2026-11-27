"use client";

import { forwardRef, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CursorMark } from "@/components/presence/CursorMark";
import { PEOPLE_INKS, initials, onInk } from "@/lib/people";
import { VOICE, voiceSettings } from "@/lib/voice";

/**
 * The signature: two lines of type that always fill the full width exactly.
 * When a person comes near a letter it swells and takes their colour, and the
 * rest of the line squeezes to make room. Width is shared, never added.
 */

const LINES = ["Write it", "together."];
const PROBE_PX = 200;
const SPACE_EM = 0.24;
const LINE_RATIO = 0.94;

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
  glyph: HTMLSpanElement;
  line: number;
  space: boolean;
  /** table[weightStop][widthStop] = advance in em */
  table: number[][];
  restX: number;
  restY: number;
  width: number;
  influence: number;
  owner: string | null;
};

type Walker = { x: number; y: number; vx: number; vy: number; tx: number; ty: number; wait: number; delay: number };

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

type Voice = typeof VOICE;

/** Advance (em) of a glyph at any weight and width, from the measured table. */
function advance(voice: Voice, table: number[][], weight: number, width: number) {
  const WIDTH_STOPS: readonly number[] = voice.widths;
  const WEIGHT_STOPS: readonly number[] = voice.weights;
  const wt = Math.min(1, Math.max(0, (weight - WEIGHT_STOPS[0]) / (WEIGHT_STOPS[1] - WEIGHT_STOPS[0])));
  let i = 0;
  while (i < WIDTH_STOPS.length - 2 && width > WIDTH_STOPS[i + 1]) i++;
  const t = (width - WIDTH_STOPS[i]) / (WIDTH_STOPS[i + 1] - WIDTH_STOPS[i]);
  const light = lerp(table[0][i], table[0][i + 1], t);
  const heavy = lerp(table[1][i], table[1][i + 1], t);
  return lerp(light, heavy, wt);
}

/** The width-axis value whose advance is closest to `target` em. */
function widthFor(voice: Voice, table: number[][], weight: number, target: number) {
  let low: number = voice.widths[0];
  let high: number = voice.widths[voice.widths.length - 1];
  for (let i = 0; i < 12; i++) {
    const mid = (low + high) / 2;
    if (advance(voice, table, weight, mid) < target) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}

/** The glow a person casts on the page. It sits behind the letters. */
const Light = forwardRef<HTMLSpanElement, { ink: string; on: boolean }>(function Light({ ink, on }, ref) {
  return (
    <span ref={ref} aria-hidden="true" className="pointer-events-none absolute left-0 top-0">
      <span
        className="absolute -left-[19rem] -top-[19rem] block size-[38rem] rounded-full transition-opacity duration-700"
        style={{ background: `radial-gradient(closest-side, ${ink}, transparent)`, opacity: on ? "var(--glow)" : 0 }}
      />
    </span>
  );
});

export function HuddleType({ rond = VOICE.rond, children }: { rond?: number; children?: React.ReactNode }) {
  const voice = VOICE;
  const settings = (wght: number, wdth: number) => voiceSettings(wght, wdth, rond);
  const reduced = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const cursorRefs = useRef<(HTMLDivElement | null)[]>([]);
  const visitorRef = useRef<HTMLDivElement>(null);
  const lightRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const visitorLightRef = useRef<HTMLSpanElement>(null);
  const [crowd, setCrowd] = useState(2);
  const [visitorHere, setVisitorHere] = useState(false);
  const crowdRef = useRef(crowd);
  useEffect(() => {
    crowdRef.current = crowd;
  }, [crowd]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let raf = 0;
    let disposed = false;
    let visible = true;
    let letters: Letter[] = [];
    let fontSize = 100;
    let stageWidth = 0;
    let stageHeight = 0;
    let lineHeight = 0;
    const visitor = { x: 0, y: 0, here: false };
    const walkers: Walker[] = [];

    const randomTarget = () => {
      const pool = letters.filter((l) => !l.space);
      const pick = pool[Math.floor(Math.random() * pool.length)];
      return pick
        ? { tx: pick.restX + (Math.random() - 0.5) * 30, ty: pick.restY + (Math.random() - 0.3) * lineHeight * 0.4 }
        : { tx: stageWidth / 2, ty: stageHeight / 2 };
    };

    const measure = () => {
      const family = getComputedStyle(root).getPropertyValue(voice.cssVar).trim() || "sans-serif";
      const probe = document.createElement("span");
      probe.style.cssText = `position:absolute;visibility:hidden;white-space:pre;font-family:${family};font-size:${PROBE_PX}px;line-height:1;`;
      document.body.appendChild(probe);
      const cache = new Map<string, number[][]>();
      const tableFor = (char: string) => {
        let table = cache.get(char);
        if (!table) {
          table = voice.weights.map((wght) =>
            voice.widths.map((wdth) => {
              probe.style.fontVariationSettings = settings(wght, wdth);
              probe.textContent = char;
              return probe.getBoundingClientRect().width / PROBE_PX;
            }),
          );
          cache.set(char, table);
        }
        return table;
      };

      letters = [];
      lineRefs.current.forEach((lineEl, line) => {
        if (!lineEl) return;
        lineEl.querySelectorAll<HTMLSpanElement>("[data-letter]").forEach((el) => {
          const glyph = el.firstElementChild as HTMLSpanElement;
          const space = el.dataset.letter === " ";
          letters.push({
            el,
            glyph,
            line,
            space,
            table: space ? [] : tableFor(el.dataset.letter ?? ""),
            restX: 0,
            restY: 0,
            width: 0,
            influence: 0,
            owner: null,
          });
        });
      });
      probe.remove();
    };

    const restEm = (l: Letter) => (l.space ? SPACE_EM : advance(voice, l.table, voice.base.wght, voice.base.wdth));

    const layout = () => {
      stageWidth = root.clientWidth;
      // Both lines share one size so their cap heights match; the height budget caps it.
      const naturalEm = LINES.map((_, line) =>
        letters
          .filter((l) => l.line === line)
          .reduce((sum, l) => sum + restEm(l), 0),
      );
      const widest = Math.max(...naturalEm);
      const budget = Math.max(200, window.innerHeight * 0.52);
      fontSize = Math.min(stageWidth / widest, budget / (LINES.length * LINE_RATIO));
      lineHeight = fontSize * LINE_RATIO;
      stageHeight = lineHeight * LINES.length;

      lineRefs.current.forEach((el) => {
        if (!el) return;
        el.style.fontSize = `${fontSize}px`;
        el.style.height = `${lineHeight}px`;
      });

      LINES.forEach((_, line) => {
        const row = letters.filter((l) => l.line === line);
        const total = row.reduce((sum, l) => sum + restEm(l), 0);
        let x = 0;
        for (const l of row) {
          const w = (restEm(l) / total) * stageWidth;
          l.restX = x + w / 2;
          l.restY = line * lineHeight + lineHeight / 2;
          l.width = w;
          x += w;
        }
      });

      while (walkers.length < TEAMMATES.length) {
        const { tx, ty } = randomTarget();
        const fromLeft = walkers.length % 2 === 0;
        walkers.push({
          x: fromLeft ? -140 : stageWidth + 140,
          y: stageHeight * (0.2 + Math.random() * 0.9),
          vx: 0,
          vy: 0,
          tx,
          ty,
          wait: 60,
          delay: 70 + walkers.length * 45,
        });
      }
    };

    const place = (cursor: HTMLElement | null, light: HTMLElement | null, x: number, y: number) => {
      const at = `translate3d(${x}px, ${y}px, 0)`;
      if (cursor) cursor.style.transform = at;
      if (light) light.style.transform = at;
    };

    const paint = (settle: boolean) => {
      const active: { x: number; y: number; ink: string }[] = walkers
        .slice(0, crowdRef.current)
        .map((w, i) => ({ x: w.x, y: w.y, ink: TEAMMATES[i].ink }));
      if (visitor.here) active.push({ x: visitor.x, y: visitor.y, ink: VISITOR_INK });

      const sigma = Math.max(30, fontSize * 0.2);

      LINES.forEach((_, line) => {
        const row = letters.filter((l) => l.line === line);
        let cursorX = 0;
        const shares = row.map((l) => {
          // Measure from where the letter is now, so what you point at is what answers.
          const centre = cursorX + l.width / 2;
          cursorX += l.width;
          if (l.space) return { share: SPACE_EM, target: 0, owner: null as string | null };
          let best = 0;
          let owner: string | null = null;
          for (const a of active) {
            const dx = Math.max(0, Math.abs(a.x - centre) - l.width * 0.38);
            const dy = (a.y - l.restY) * 1.25;
            const v = Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
            if (v > best) {
              best = v;
              owner = a.ink;
            }
          }
          return { share: restEm(l) * (1 + best * voice.swell), target: best, owner };
        });
        const total = shares.reduce((s, v) => s + v.share, 0);

        row.forEach((l, i) => {
          const wanted = (shares[i].share / total) * stageWidth;
          const ease = settle ? 1 : 0.14;
          l.width += (wanted - l.width) * ease;
          l.influence += (shares[i].target - l.influence) * ease;
          l.el.style.width = `${l.width}px`;
          if (l.space) return;

          const weight = lerp(voice.base.wght, voice.peak, l.influence);
          // Keep a hair of side bearing between glyphs.
          const targetEm = (l.width * 0.985) / fontSize;
          const wdth = widthFor(voice, l.table, weight, targetEm);
          const scale = targetEm / advance(voice, l.table, weight, wdth);
          l.glyph.style.fontVariationSettings = settings(weight, wdth);
          l.glyph.style.transform = `scaleX(${scale.toFixed(4)})`;

          const owner = l.influence > 0.42 ? shares[i].owner : null;
          if (owner !== l.owner) {
            l.owner = owner;
            l.glyph.style.color = owner ?? "";
          }
        });
      });
    };

    const step = () => {
      walkers.forEach((w, i) => {
        if (i >= crowdRef.current) return;
        if (w.delay > 0) {
          w.delay -= 1;
          place(cursorRefs.current[i], lightRefs.current[i], w.x, w.y);
          return;
        }
        const dx = w.tx - w.x;
        const dy = w.ty - w.y;
        w.vx = (w.vx + dx * 0.0042) * 0.9;
        w.vy = (w.vy + dy * 0.0042) * 0.9;
        w.x += w.vx;
        w.y += w.vy;
        if (Math.hypot(dx, dy) < 12) {
          w.wait -= 1;
          if (w.wait <= 0) {
            Object.assign(w, randomTarget());
            w.wait = 40 + Math.random() * 90;
          }
        }
        place(cursorRefs.current[i], lightRefs.current[i], w.x, w.y);
      });
      paint(false);
      raf = visible && !disposed ? requestAnimationFrame(step) : 0;
    };

    const settleStill = () => {
      // Reduced motion: teammates rest on letters and nothing moves.
      const spots = [2, 11, 6, 13, 0, 9];
      walkers.forEach((w, i) => {
        const l = letters[spots[i]];
        if (!l) return;
        w.x = l.restX;
        w.y = l.restY;
        place(cursorRefs.current[i], lightRefs.current[i], w.x, w.y);
      });
      paint(true);
    };

    const onMove = (event: PointerEvent) => {
      const box = root.getBoundingClientRect();
      visitor.x = event.clientX - box.left;
      visitor.y = event.clientY - box.top;
      if (!visitor.here) {
        visitor.here = true;
        setVisitorHere(true);
      }
      place(visitorRef.current, visitorLightRef.current, visitor.x, visitor.y);
      if (reduced) paint(true);
    };
    const onLeave = () => {
      visitor.here = false;
      setVisitorHere(false);
      if (reduced) paint(true);
    };

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !raf && !reduced && letters.length) raf = requestAnimationFrame(step);
    });
    const resize = new ResizeObserver(() => {
      if (!letters.length) return;
      layout();
      if (reduced) settleStill();
      else paint(true);
    });

    document.fonts.ready.then(() => {
      if (disposed) return;
      measure();
      layout();
      root.dataset.ready = "true";
      observer.observe(root);
      resize.observe(root);
      if (reduced) settleStill();
      else raf = requestAnimationFrame(step);
    });

    const crowdListener = () => {
      if (reduced) settleStill();
    };
    root.addEventListener("huddle:crowd", crowdListener);
    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerdown", onMove);
    root.addEventListener("pointerleave", onLeave);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      resize.disconnect();
      root.removeEventListener("huddle:crowd", crowdListener);
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerdown", onMove);
      root.removeEventListener("pointerleave", onLeave);
    };
    // `settings` only depends on `rond`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced, rond]);

  useEffect(() => {
    rootRef.current?.dispatchEvent(new Event("huddle:crowd"));
  }, [crowd]);

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

        <h1 className="relative z-[1]" aria-label="Write it together." style={{ fontFamily: `var(${voice.cssVar})`, letterSpacing: 0 }}>
          {LINES.map((text, line) => (
            <span
              key={text}
              aria-hidden="true"
              ref={(el) => {
                lineRefs.current[line] = el;
              }}
              className="flex w-full whitespace-nowrap text-[17vw] leading-[0.94]"
            >
              {Array.from(text).map((char, i) => (
                <span key={i} data-letter={char} className="flex shrink-0 justify-center">
                  <span
                    className="inline-block translate-y-[0.35em] whitespace-pre opacity-0 transition-[color,opacity,translate] ease-[var(--ease-out-expo)] group-data-[ready=true]:translate-y-0 group-data-[ready=true]:opacity-100"
                    style={{
                      fontVariationSettings: settings(voice.base.wght, voice.base.wdth),
                      transitionDuration: "160ms, 900ms, 900ms",
                      transitionDelay: `0ms, ${(line * 9 + i) * 38}ms, ${(line * 9 + i) * 38}ms`,
                    }}
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
            className="pointer-events-none absolute left-0 top-0 z-[3] opacity-0 group-data-[ready=true]:opacity-100"
          >
            <CursorMark ink={mate.ink} name={mate.name} />
          </div>
        ))}
        <div
          ref={visitorRef}
          aria-hidden="true"
          className={`pointer-events-none absolute left-0 top-0 z-[4] ${visitorHere ? "opacity-100" : "opacity-0"}`}
        >
          <CursorMark ink={VISITOR_INK} name="You" />
        </div>
      </div>

      <div className="mt-7 flex flex-col gap-6 md:mt-9 md:flex-row md:items-end md:justify-between md:gap-12">
        <p className="max-w-[34ch] text-xl leading-snug text-ink-2 md:text-2xl">
          One page, everyone in it at once. Quiet until your people arrive, then it lights up.
        </p>
        <div className="flex flex-col gap-4 md:items-end">
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
          <div className="flex flex-wrap items-center gap-3">
            {children}
            <button type="button" className="btn btn-line" onClick={() => setCrowd((n) => (full ? 0 : n + 1))}>
              {full ? "Send everyone home" : "Add a demo teammate"}
            </button>
          </div>
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {crowd} demo teammates on the headline.
      </p>
    </>
  );
}
