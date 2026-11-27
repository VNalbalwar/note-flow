"use client";

import { useSyncExternalStore } from "react";

const query = "(prefers-color-scheme: dark)";

function subscribe(onChange: () => void) {
  const media = window.matchMedia(query);
  media.addEventListener("change", onChange);
  window.addEventListener("huddle:theme", onChange);
  return () => {
    media.removeEventListener("change", onChange);
    window.removeEventListener("huddle:theme", onChange);
  };
}

function read(): "light" | "dark" {
  const chosen = document.documentElement.dataset.theme;
  if (chosen === "light" || chosen === "dark") return chosen;
  return window.matchMedia(query).matches ? "dark" : "light";
}

/** The theme actually on screen, whether chosen or following the system. */
export function useTheme() {
  return useSyncExternalStore(subscribe, read, () => "light" as const);
}
