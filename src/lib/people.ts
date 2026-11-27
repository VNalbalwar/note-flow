/**
 * Huddle's colour idea: the page is calm until people arrive, and each person
 * brings a colour that shows on their cursor, their marks and the light around
 * them. `on` is the text colour that stays readable on top of each ink.
 */
export const PEOPLE_INKS = [
  { name: "Tangerine", ink: "#ff6b2c", on: "#2a0d00" },
  { name: "Cobalt", ink: "#1f66db", on: "#ffffff" },
  { name: "Emerald", ink: "#12ac74", on: "#01180f" },
  { name: "Berry", ink: "#cf2f66", on: "#ffffff" },
  { name: "Pink", ink: "#ff7dad", on: "#35001a" },
  { name: "Sunflower", ink: "#ffbe0b", on: "#2b1d00" },
  { name: "Sky", ink: "#17b6d9", on: "#01202a" },
  { name: "Lime", ink: "#98c621", on: "#152000" },
] as const;

export type PersonInk = (typeof PEOPLE_INKS)[number];

/** Stable ink for a user id, so a person keeps their colour everywhere. */
export function inkIndex(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % PEOPLE_INKS.length;
}

export function inkFor(seed: string): PersonInk {
  return PEOPLE_INKS[inkIndex(seed)];
}

export function onInk(ink: string): string {
  return PEOPLE_INKS.find((p) => p.ink === ink)?.on ?? "#000000";
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? "") : "";
  return (first + last).toUpperCase();
}
