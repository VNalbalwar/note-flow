"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CursorMark } from "@/components/presence/CursorMark";
import type { Peer, Room } from "./useRoom";

const SEND_EVERY_MS = 50;

/**
 * Shows other people's mouse pointers over the page, and shares yours.
 * x travels as a fraction of the page width, so it lands on the same words
 * on screens of different sizes.
 */
export function LivePointers({ room, peers, surface }: { room: Room; peers: Peer[]; surface: React.RefObject<HTMLElement | null> }) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = surface.current;
    if (!el) return;
    const resize = new ResizeObserver(() => setWidth(el.clientWidth));
    resize.observe(el);

    let last = 0;
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.timeStamp - last < SEND_EVERY_MS) return;
      last = e.timeStamp;
      const box = el.getBoundingClientRect();
      room.provider.awareness.setLocalStateField("pointer", {
        x: (e.clientX - box.left) / box.width,
        y: e.clientY - box.top,
      });
    };
    const leave = () => room.provider.awareness.setLocalStateField("pointer", null);

    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      resize.disconnect();
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
    };
  }, [room, surface]);

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-30 overflow-hidden print:hidden">
      <AnimatePresence>
        {peers.map(
          (p) =>
            p.pointer && (
              <motion.div
                key={p.clientId}
                className="absolute left-0 top-0"
                initial={{ opacity: 0, scale: 0.4, x: p.pointer.x * width, y: p.pointer.y }}
                animate={{ opacity: 1, scale: 1, x: p.pointer.x * width, y: p.pointer.y }}
                exit={{ opacity: 0, scale: 0.4 }}
                transition={{ type: "spring", stiffness: 500, damping: 40, mass: 0.5 }}
              >
                <CursorMark ink={p.color} name={p.name} />
              </motion.div>
            ),
        )}
      </AnimatePresence>
    </div>
  );
}
