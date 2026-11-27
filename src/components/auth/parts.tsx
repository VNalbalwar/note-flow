"use client";

import { useId, useState } from "react";
import { motion } from "motion/react";
import { CircleAlert, Eye, EyeOff, MailCheck } from "lucide-react";

export function Heading({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 220, damping: 22 }}>
      <h1 className="display text-5xl">{title}</h1>
      {children && <p className="mt-3 leading-relaxed text-ink-2">{children}</p>}
    </motion.div>
  );
}

export function Field({ label, hint, ...input }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: React.ReactNode }) {
  const id = useId();
  const [shown, setShown] = useState(false);
  const secret = input.type === "password";
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">
        {label}
      </label>
      <div className="relative">
        <input id={id} {...input} type={secret && shown ? "text" : input.type} className={`field ${secret ? "!pr-12" : ""}`} aria-describedby={hint ? `${id}-hint` : undefined} />
        {secret && (
          <button type="button" onClick={() => setShown((v) => !v)} aria-label={shown ? "Hide password" : "Show password"} className="tag absolute right-1.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center text-ink-3 hover:bg-wash">
            {shown ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
          </button>
        )}
      </div>
      {hint && (
        <div id={`${id}-hint`} className="mt-1.5 text-xs leading-relaxed text-ink-3">
          {hint}
        </div>
      )}
    </div>
  );
}

export function FormError({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return (
    <motion.p role="alert" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: [0, -6, 5, -3, 0] }} className="sheet flex items-start gap-2.5 border border-danger bg-sheet p-3 text-sm leading-relaxed text-danger">
      <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </motion.p>
  );
}

export function CheckInbox({ children, mailEnabled }: { children: React.ReactNode; mailEnabled: boolean }) {
  return (
    <motion.div role="status" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} className="raised sheet mt-7 p-6">
      <motion.span className="tag grid size-14 place-items-center bg-brand text-on-brand" initial={{ rotate: -30, y: -10 }} animate={{ rotate: 0, y: 0 }} transition={{ type: "spring", stiffness: 260, damping: 11 }}>
        <MailCheck className="size-7" aria-hidden="true" />
      </motion.span>
      <p className="mt-4 leading-relaxed">{children}</p>
      {!mailEnabled && (
        <p className="mt-3 text-sm leading-relaxed text-ink-3">
          This copy has no email service set up, so the link is printed in the terminal running the web app.
        </p>
      )}
    </motion.div>
  );
}
