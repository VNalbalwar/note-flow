"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import YProvider from "y-partyserver/provider";
import * as Y from "yjs";
import { CLOSE } from "@/shared/sync";

export type RoomStatus = "connecting" | "live" | "offline" | "denied" | "deleted";

export type Room = {
  doc: Y.Doc;
  provider: YProvider;
};

function syncHost() {
  return process.env.NEXT_PUBLIC_SYNC_HOST || "localhost:8787";
}

/**
 * One live connection to a page. Every (re)connection asks the web app for a
 * fresh pass, so access is re-checked each time.
 */
export function useRoom(docId: string, onRefresh: () => void) {
  const [room, setRoom] = useState<Room | null>(null);
  const [status, setStatus] = useState<RoomStatus>("connecting");
  /** True once the page's content has arrived at least once. */
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const doc = new Y.Doc();
    const host = syncHost();
    let disposed = false;
    let stopped = false;
    let recheck = false;

    const stop = (why: "denied" | "deleted") => {
      stopped = true;
      provider.shouldConnect = false;
      provider.disconnect();
      if (!disposed) setStatus(why);
    };

    const fetchPass = async () => {
      const res = await fetch("/api/sync-token", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ docId }),
      });
      if (res.status === 401 || res.status === 403 || res.status === 404) {
        stop("denied");
        return { token: "" };
      }
      if (!res.ok) throw new Error(`pass ${res.status}`);
      return (await res.json()) as { token: string };
    };

    const provider: YProvider = new YProvider(host, docId, doc, {
      party: "doc",
      protocol: /^(localhost|127\.0\.0\.1|\[::1\])(:|$)/.test(host) ? "ws" : "wss",
      // Every change goes through the server, which enforces who may write.
      disableBc: true,
      maxBackoffTime: 8000,
      params: fetchPass,
      connect: false,
    });

    provider.on("status", ({ status: next }: { status: string }) => {
      if (disposed || stopped) return;
      if (next === "disconnected") setStatus("offline");
    });
    provider.on("sync", (synced: boolean) => {
      if (disposed || stopped || !synced) return;
      setReady(true);
      setStatus("live");
      // The server asked us to be checked again, so the page's own permissions may have changed.
      // (A notice sent while we were disconnected would have been missed.)
      if (recheck) {
        recheck = false;
        onRefresh();
      }
    });
    provider.on("connection-close", (event: CloseEvent | null) => {
      if (event?.code === CLOSE.deleted) stop("deleted");
      if (event?.code === CLOSE.recheck) recheck = true;
    });
    provider.on("custom-message", (message: string) => {
      if (message === "refresh") onRefresh();
    });

    queueMicrotask(() => {
      if (!disposed) setRoom({ doc, provider });
    });
    void provider.connect();

    return () => {
      disposed = true;
      provider.destroy();
      doc.destroy();
      setRoom(null);
      setReady(false);
      setStatus("connecting");
    };
  }, [docId, onRefresh]);

  return { room, status, ready };
}

export type Peer = {
  clientId: number;
  id: string;
  name: string;
  color: string;
  pointer: { x: number; y: number } | null;
};

const NO_PEERS: Peer[] = [];

/** Everyone else on the page. Identities are written by the server, not by them. */
export function usePeers(provider: YProvider | undefined): Peer[] {
  const latest = useRef(NO_PEERS);
  // Must stay the same function between renders, or React resubscribes forever.
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!provider) return () => {};
      const read = () => {
        const peers: Peer[] = [];
        provider.awareness.getStates().forEach((state, clientId) => {
          if (clientId === provider.awareness.clientID) return;
          const user = state.user as { id?: string; name?: string; color?: string } | undefined;
          if (!user?.id) return;
          peers.push({
            clientId,
            id: user.id,
            name: user.name ?? "Someone",
            color: user.color ?? "#1f66db",
            pointer: (state.pointer as Peer["pointer"]) ?? null,
          });
        });
        const same = JSON.stringify(peers) === JSON.stringify(latest.current);
        if (same) return;
        latest.current = peers;
        // The editor publishes presence while it renders, so tell React afterwards.
        queueMicrotask(onChange);
      };
      provider.awareness.on("change", read);
      read();
      return () => {
        provider.awareness.off("change", read);
        latest.current = NO_PEERS;
      };
    },
    [provider],
  );
  return useSyncExternalStore(
    subscribe,
    () => latest.current,
    () => NO_PEERS,
  );
}
