"use client";

import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

/** Built on the native dialog element, which traps focus and closes on Escape. */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  wide = false,
  side = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  wide?: boolean;
  /** Slide in from the right as a panel instead of centring. */
  side?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className={`huddle-dialog ${side ? "huddle-dialog-side" : "sheet"} ${wide ? "w-[min(46rem,calc(100vw-1.5rem))]" : "w-[min(30rem,calc(100vw-1.5rem))]"}`}
    >
      {open && (
        <div className="flex max-h-[inherit] flex-col">
          <header className="flex items-start justify-between gap-4 px-5 pb-3 pt-5 sm:px-6">
            <div>
              <h2 id={titleId} className="display-tight text-2xl">
                {title}
              </h2>
              {description && <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{description}</p>}
            </div>
            <button type="button" onClick={onClose} aria-label="Close" className="tag grid size-9 shrink-0 place-items-center hover:bg-wash">
              <X className="size-5" aria-hidden="true" />
            </button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6 sm:px-6">{children}</div>
        </div>
      )}
    </dialog>
  );
}
