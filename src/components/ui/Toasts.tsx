"use client";

import { useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CircleAlert, CircleCheck } from "lucide-react";

type Toast = { id: number; text: string; bad: boolean };

let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function push(text: string, bad: boolean) {
  const id = nextId++;
  toasts = [...toasts.slice(-2), { id, text, bad }];
  emit();
  window.setTimeout(
    () => {
      toasts = toasts.filter((t) => t.id !== id);
      emit();
    },
    bad ? 7000 : 3800,
  );
}

export const toast = {
  done: (text: string) => push(text, false),
  error: (text: string) => push(text, true),
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const EMPTY: Toast[] = [];

export function Toaster() {
  const list = useSyncExternalStore(subscribe, () => toasts, () => EMPTY);
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-3 bottom-4 z-[70] flex flex-col items-center gap-2">
      <AnimatePresence>
        {list.map((t) => (
          <motion.p
            key={t.id}
            layout
            role={t.bad ? "alert" : "status"}
            initial={{ opacity: 0, y: 26, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
            className="raised tag pointer-events-auto flex max-w-md items-center gap-2.5 py-2.5 pl-3.5 pr-5 text-sm font-semibold"
          >
            {t.bad ? (
              <CircleAlert className="size-5 shrink-0 text-danger" aria-hidden="true" />
            ) : (
              <CircleCheck className="size-5 shrink-0 text-brand" aria-hidden="true" />
            )}
            {t.text}
          </motion.p>
        ))}
      </AnimatePresence>
    </div>
  );
}
