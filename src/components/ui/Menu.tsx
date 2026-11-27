"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

export type MenuItem =
  | { label: string; icon?: React.ReactNode; onSelect: () => void; danger?: boolean }
  | "divider";

/** A button that opens a small list of actions, with arrow-key movement. */
export function Menu({
  label,
  trigger,
  items,
  align = "right",
  triggerClassName,
  up = false,
}: {
  label: string;
  trigger: React.ReactNode;
  items: MenuItem[];
  align?: "left" | "right";
  triggerClassName?: string;
  up?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
      root.current?.querySelector("button")?.focus();
      return;
    }
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const buttons = Array.from(list.current?.querySelectorAll("button") ?? []);
    const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const step = e.key === "ArrowDown" ? 1 : -1;
    buttons[(at + step + buttons.length) % buttons.length]?.focus();
  };

  return (
    <div ref={root} className="relative" onKeyDown={onKeyDown}>
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        className={triggerClassName ?? "tag grid size-9 place-items-center hover:bg-wash"}
      >
        {trigger}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            ref={list}
            id={id}
            role="menu"
            initial={{ opacity: 0, scale: 0.92, y: up ? 6 : -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.12 } }}
            transition={{ type: "spring", stiffness: 500, damping: 32 }}
            className={`raised sheet absolute z-40 min-w-52 p-1.5 ${align === "right" ? "right-0" : "left-0"} ${up ? "bottom-full mb-2 origin-bottom" : "top-full mt-2 origin-top"}`}
          >
            {items.map((item, i) =>
              item === "divider" ? (
                <div key={`d${i}`} role="separator" className="mx-2 my-1.5 border-t border-line" />
              ) : (
                <button
                  key={item.label}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    item.onSelect();
                  }}
                  className={`tag flex w-full items-center gap-3 whitespace-nowrap px-3 py-2.5 text-left text-sm font-medium hover:bg-wash focus-visible:bg-wash ${item.danger ? "text-danger" : ""}`}
                >
                  {item.icon}
                  {item.label}
                </button>
              ),
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
