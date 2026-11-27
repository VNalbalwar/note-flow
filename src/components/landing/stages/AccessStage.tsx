"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { PEOPLE_INKS } from "@/lib/people";
import { CursorMark } from "@/components/presence/CursorMark";

const KENJI = PEOPLE_INKS[6].ink;
const ROLES = [
  { id: "editor", label: "Editor", note: "Kenji can type, format and comment." },
  { id: "viewer", label: "Viewer", note: "Kenji can read. The server drops any edit." },
  { id: "removed", label: "Removed", note: "Kenji is disconnected at once, mid-sentence." },
] as const;

type Role = (typeof ROLES)[number]["id"];

export function AccessStage() {
  const [role, setRole] = useState<Role>("editor");
  const active = ROLES.find((r) => r.id === role)!;

  return (
    <div className="flex h-full flex-col justify-center gap-6 p-5 sm:p-8">
      <fieldset>
        <legend className="mb-3 text-sm font-semibold">Try it: choose what Kenji is allowed to do</legend>
        <div className="flex flex-wrap gap-2">
          {ROLES.map((r) => (
            <label key={r.id} className="relative">
              <input
                type="radio"
                name="demo-role"
                value={r.id}
                checked={role === r.id}
                onChange={() => setRole(r.id)}
                className="peer sr-only"
              />
              <span className="tag block cursor-pointer border-[1.5px] border-line px-4 py-2 text-sm font-semibold transition-colors peer-checked:border-brand peer-checked:bg-brand peer-checked:text-on-brand peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand">
                {r.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="sheet relative min-h-[11rem] border border-line bg-wash p-5">
        <p className="text-lg leading-relaxed">
          Budget for the fest stall
          {role === "editor" && (
            <motion.span
              key="typing"
              initial={{ clipPath: "inset(0 100% 0 0)" }}
              animate={{ clipPath: "inset(0 0% 0 0)" }}
              transition={{ duration: 1.8, ease: "linear" }}
              className="inline-block whitespace-nowrap"
            >
              , including paper cups.
            </motion.span>
          )}
        </p>
        <motion.div
          className="absolute left-0 top-0"
          animate={
            role === "editor"
              ? { x: 190, y: 62, opacity: 1, scale: 1 }
              : role === "viewer"
                ? { x: [110, 96, 124, 100, 118, 110], y: 92, opacity: 1, scale: 1 }
                : { x: 280, y: 190, opacity: 0, scale: 0.4 }
          }
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <CursorMark ink={KENJI} name={role === "viewer" ? "Kenji, view only" : "Kenji"} />
        </motion.div>
      </div>

      <p className="min-h-[1.5rem] text-base font-semibold" aria-live="polite">
        {active.note}
      </p>
    </div>
  );
}
