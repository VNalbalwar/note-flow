import { onInk } from "@/lib/people";

/** A person's pointer with their name tag. Used on the landing page and in documents. */
export function CursorMark({ ink, name }: { ink: string; name: string }) {
  return (
    <span className="pointer-events-none flex flex-col items-start">
      <svg width="20" height="22" viewBox="0 0 20 22" aria-hidden="true">
        <path
          d="M1.5 1.5 18 11.2l-7.6 1.5-4.1 7.6z"
          fill={ink}
          stroke="var(--sheet)"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
      <span
        className="tag -mt-0.5 ml-3.5 whitespace-nowrap px-2.5 py-1 text-xs font-semibold leading-none shadow-[0_0_0_1.5px_var(--sheet),0_6px_16px_-6px_rgb(6_22_10/0.45)]"
        style={{ background: ink, color: onInk(ink) }}
      >
        {name}
      </span>
    </span>
  );
}
