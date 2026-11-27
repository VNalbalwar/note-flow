const BLOBS = [
  { ink: "var(--aura1)", className: "left-[-12vw] top-[-14vh] size-[62vw]", delay: "0s" },
  { ink: "var(--aura2)", className: "right-[-16vw] top-[4vh] size-[52vw]", delay: "-7s" },
  { ink: "var(--aura3)", className: "bottom-[-24vh] left-[22vw] size-[56vw]", delay: "-13s" },
];

/** Slow ambient light in the scheme's colours, with the shared-canvas dot grid. */
export function Aurora({ dots = true }: { dots?: boolean }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {BLOBS.map((b) => (
        <span
          key={b.ink}
          className={`absolute block rounded-full ${b.className}`}
          style={{
            background: `radial-gradient(closest-side, ${b.ink}, transparent)`,
            opacity: "calc(var(--glow) * 0.8)",
            animation: `drift 22s ease-in-out ${b.delay} infinite`,
          }}
        />
      ))}
      {dots && <span className="dots absolute inset-0" />}
    </div>
  );
}
