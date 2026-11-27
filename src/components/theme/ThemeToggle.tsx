"use client";

import { flushSync } from "react-dom";
import { Moon, Sun } from "lucide-react";

function currentTheme(): "light" | "dark" {
  const chosen = document.documentElement.dataset.theme;
  if (chosen === "light" || chosen === "dark") return chosen;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function apply(theme: "light" | "dark") {
  document.documentElement.dataset.theme = theme;
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `huddle-theme=${theme}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
  window.dispatchEvent(new Event("huddle:theme"));
}

/** Switches theme, spreading the new one out from the button where supported. */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const toggle = (event: React.MouseEvent<HTMLButtonElement>) => {
    const next = currentTheme() === "dark" ? "light" : "dark";
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!("startViewTransition" in document) || reduced) {
      apply(next);
      return;
    }
    const box = event.currentTarget.getBoundingClientRect();
    const x = box.left + box.width / 2;
    const y = box.top + box.height / 2;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const transition = document.startViewTransition(() => flushSync(() => apply(next)));
    transition.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 620, easing: "cubic-bezier(0.16, 1, 0.3, 1)", pseudoElement: "::view-transition-new(root)" },
      );
    });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Switch between light and dark"
      className={`raised tag relative grid size-10 shrink-0 place-items-center ${className}`}
    >
      {/* Both icons render; CSS shows the one that fits the active theme. */}
      <Sun className="theme-icon-sun size-[1.1rem]" aria-hidden="true" />
      <Moon className="theme-icon-moon size-[1.1rem]" aria-hidden="true" />
    </button>
  );
}
