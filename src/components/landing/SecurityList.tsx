"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Plus } from "lucide-react";
import { PEOPLE_INKS } from "@/lib/people";
import { DialHeading } from "./headings/DialHeading";

const ITEMS = [
  {
    title: "Passkeys",
    body: "Sign in with your fingerprint, face or device PIN. There is no password to steal or forget.",
  },
  {
    title: "Two-step codes",
    body: "Add a six-digit code from any authenticator app, with one-time backup codes for the day you lose your phone.",
  },
  {
    title: "Leaked-password check",
    body: "A password that has appeared in a known data breach is refused. Only a short fragment of its fingerprint is sent to check.",
  },
  {
    title: "Your signed-in devices",
    body: "See every place your account is open and sign any of them out.",
  },
  {
    title: "Permissions on the server",
    body: "Who may read or write is checked by the server on every request and every live connection, never only by the screen.",
  },
];

export function SecurityList() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section
      className="relative isolate mx-2 overflow-hidden rounded-[10px_44px_44px_44px] border border-white/10 px-3 py-24 text-white md:mx-4 md:px-8 md:py-36"
      style={{ background: "linear-gradient(165deg, var(--band-a), var(--band-b) 62%)" }}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        {[
          { at: "right-[-14vw] top-[-18vw]", ink: "var(--aura1)" },
          { at: "bottom-[-24vw] left-[-10vw]", ink: "var(--aura2)" },
        ].map((g) => (
          <span
            key={g.ink}
            className={`absolute block size-[56vw] rounded-full opacity-45 ${g.at}`}
            style={{ background: `radial-gradient(closest-side, ${g.ink}, transparent)`, animation: "drift 20s ease-in-out infinite" }}
          />
        ))}
        {/* Rings closing around the account. */}
        {[18, 28, 38].map((r, i) => (
          <span
            key={r}
            className="absolute right-[-8vw] top-[-8vw] block rounded-full border border-dashed border-white/20"
            style={{
              width: `${r * 1.2}vw`,
              height: `${r * 1.2}vw`,
              translate: `${(38 - r) * -0.6}vw ${(38 - r) * 0.6}vw`,
              animation: `spin ${50 + i * 25}s linear ${i % 2 ? "reverse" : ""} infinite`,
            }}
          />
        ))}
      </div>
      <DialHeading />
      <p className="mt-6 max-w-[44ch] text-xl leading-relaxed text-white/75">
        Every account gets all of this. None of it is held back for a paid plan, because there is no paid plan.
      </p>
      <ul className="mt-14">
        {ITEMS.map((item, i) => {
          const expanded = open === i;
          const person = PEOPLE_INKS[i];
          return (
            <li key={item.title} className="relative border-t border-white/15 last:border-b">
              <motion.span
                aria-hidden="true"
                className="tag absolute inset-0 origin-left !rounded-[6px_28px_28px_28px]"
                style={{ background: person.ink }}
                initial={false}
                animate={{ scaleX: expanded ? 1 : 0 }}
                transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              />
              <div className="relative transition-colors duration-300" style={{ color: expanded ? person.on : undefined }}>
                <h3>
                  <button
                    type="button"
                    aria-expanded={expanded}
                    onClick={() => setOpen(expanded ? null : i)}
                    onPointerEnter={(e) => e.pointerType === "mouse" && setOpen(i)}
                    className="flex w-full items-center justify-between gap-6 px-2 py-6 text-left focus-visible:outline-white md:px-4 md:py-8"
                  >
                    <span className="display-tight text-3xl sm:text-5xl lg:text-6xl">{item.title}</span>
                    <motion.span animate={{ rotate: expanded ? 45 : 0 }} className="shrink-0">
                      <Plus className="size-8" aria-hidden="true" />
                    </motion.span>
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {expanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <p className="max-w-[56ch] px-2 pb-8 text-lg leading-relaxed md:px-4">{item.body}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
