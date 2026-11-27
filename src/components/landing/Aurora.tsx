const GLOWS = [
  "radial-gradient(42% 62% at 8% 12%, var(--aura1), transparent 70%)",
  "radial-gradient(36% 56% at 96% 24%, var(--aura2), transparent 70%)",
  "radial-gradient(40% 56% at 52% 96%, var(--aura3), transparent 70%)",
].join(", ");

/**
 * Soft light in the scheme's colours over the shared-canvas dot grid. It is
 * still on purpose: large moving gradients are costly to draw on big screens.
 * The movement on the page comes from the people.
 */
export function Aurora({ dots = true }: { dots?: boolean }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <span className="absolute inset-0 block" style={{ background: GLOWS, opacity: "calc(var(--glow) * 0.85)" }} />
      {dots && <span className="dots absolute inset-0 opacity-70" />}
    </div>
  );
}
