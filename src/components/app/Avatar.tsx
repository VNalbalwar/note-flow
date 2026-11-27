import { initials, onInk } from "@/lib/people";

export function Avatar({ name, ink, size = 32, ring = false }: { name: string; ink: string; size?: number; ring?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`tag grid shrink-0 place-items-center font-bold ${ring ? "ring-2 ring-[var(--sheet)]" : ""}`}
      style={{ width: size, height: size, background: ink, color: onInk(ink), fontSize: size * 0.36 }}
    >
      {initials(name)}
    </span>
  );
}
