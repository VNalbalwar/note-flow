"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion, useInView } from "motion/react";
import { Check, Code2, Heading1, ListChecks, Quote, Table2, type LucideIcon } from "lucide-react";
import { useLoop } from "./useLoop";
import { SlashHeading } from "./headings/SlashHeading";

const KINDS: { id: string; label: string; hint: string; Icon: LucideIcon }[] = [
  { id: "heading", label: "Heading", hint: "Section title", Icon: Heading1 },
  { id: "check", label: "Checklist", hint: "Tasks you can tick", Icon: ListChecks },
  { id: "table", label: "Table", hint: "Rows and columns", Icon: Table2 },
  { id: "code", label: "Code block", hint: "With highlighting", Icon: Code2 },
  { id: "quote", label: "Quote", hint: "Someone else's words", Icon: Quote },
];
const DURATIONS = [2600, 2600, 2600, 2600, 2600] as const;

const rise = {
  hidden: { opacity: 0, y: 22 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, type: "spring" as const, stiffness: 320, damping: 26 } }),
};

function Preview({ id }: { id: string }) {
  if (id === "heading") {
    return (
      <motion.p variants={rise} custom={0} className="display text-[clamp(2.5rem,6vw,5rem)]">
        Week four findings
      </motion.p>
    );
  }
  if (id === "check") {
    return (
      <ul className="space-y-4 text-xl sm:text-2xl">
        {["Book the seminar hall", "Print the posters", "Send the sign-up form"].map((t, i) => (
          <motion.li key={t} variants={rise} custom={i} className="flex items-center gap-4">
            <span className={`tag grid size-7 shrink-0 place-items-center border-2 border-ink ${i < 2 ? "!border-brand bg-brand text-on-brand" : ""}`}>
              {i < 2 && <Check className="size-4" strokeWidth={3} aria-hidden="true" />}
            </span>
            <span className={i < 2 ? "text-ink-3 line-through" : ""}>{t}</span>
          </motion.li>
        ))}
      </ul>
    );
  }
  if (id === "table") {
    const rows = [
      ["Method", "Runs", "Median"],
      ["Merge sort", "10", "14 ms"],
      ["Quick sort", "10", "11 ms"],
      ["Heap sort", "10", "19 ms"],
    ];
    return (
      <table className="w-full border-collapse text-left text-base tabular-nums sm:text-xl">
        <caption className="sr-only">Example table with made-up timings</caption>
        <tbody>
          {rows.map((row, i) => (
            <motion.tr key={row[0]} variants={rise} custom={i} className={i === 0 ? "font-bold" : ""}>
              {row.map((cell) => (
                <td key={cell} className="border border-line px-4 py-3">
                  {cell}
                </td>
              ))}
            </motion.tr>
          ))}
        </tbody>
      </table>
    );
  }
  if (id === "code") {
    const lines = ["def median(runs):", "    ordered = sorted(runs)", "    middle = len(ordered) // 2", "    return ordered[middle]"];
    return (
      <pre className="sheet overflow-x-auto bg-[var(--code-bg)] p-6 font-mono text-sm leading-8 text-[var(--code-ink)] sm:text-lg">
        {lines.map((l, i) => (
          <motion.code key={l} variants={rise} custom={i} className="block">
            {l}
          </motion.code>
        ))}
      </pre>
    );
  }
  return (
    <motion.blockquote variants={rise} custom={0} className="display-tight text-3xl sm:text-4xl">
      &ldquo;Write down what you expected before you look at the result.&rdquo;
      <footer className="mt-4 font-sans text-base font-normal text-ink-3">Note to the team</footer>
    </motion.blockquote>
  );
}

export function Blocks() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { amount: 0.4 });
  const [picked, setPicked] = useState<number | null>(null);
  const auto = useLoop(DURATIONS, inView && picked === null);
  const index = picked ?? auto % KINDS.length;
  const current = KINDS[index];

  return (
    <section ref={ref} className="px-5 py-24 md:px-10 md:py-36">
      <SlashHeading />
      <p className="mt-6 max-w-[44ch] text-xl leading-relaxed text-ink-2">
        Type <kbd className="tag border border-line bg-wash px-2.5 py-0.5 font-mono text-base">/</kbd> on any line to add a
        block. Drag blocks to reorder them. Pick one below to see it.
      </p>

      <div className="mt-12 grid items-start gap-8 lg:grid-cols-[20rem_1fr] lg:gap-16">
        <ul className="raised sheet p-2">
          {KINDS.map((k, i) => (
            <li key={k.id}>
              <button
                type="button"
                onClick={() => setPicked(i)}
                aria-pressed={i === index}
                className="relative flex w-full items-center gap-3 px-3 py-3 text-left"
              >
                {i === index && (
                  <motion.span
                    layoutId="slash-active"
                    className="tag absolute inset-0 bg-brand"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <k.Icon className={`relative size-5 ${i === index ? "text-on-brand" : "text-brand"}`} aria-hidden="true" />
                <span className={`relative ${i === index ? "text-on-brand" : ""}`}>
                  <span className="block font-semibold">{k.label}</span>
                  <span className={`block text-sm ${i === index ? "opacity-75" : "text-ink-3"}`}>{k.hint}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>

        <div className="raised sheet flex min-h-[22rem] items-center px-6 py-10 md:px-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, y: -18, transition: { duration: 0.18 } }}
              className="w-full max-w-3xl"
            >
              <Preview id={current.id} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
