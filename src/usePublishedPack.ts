import { useEffect, useState } from "react";
import { validateSnapshot, type PackState, type PublishedSnapshot } from "./pack.ts";

export function usePublishedPack(
  requestKey: string,
  load: (signal: AbortSignal) => Promise<PublishedSnapshot>,
): PackState {
  const [stored, setStored] = useState<{ key: string; state: PackState }>({
    key: requestKey, state: { status: "loading" },
  });

  useEffect(() => {
    const controller = new AbortController();
    let expiryTimer: ReturnType<typeof setTimeout> | undefined;
    setStored({ key: requestKey, state: { status: "loading" } });
    void load(controller.signal).then(snapshot => {
      if (controller.signal.aborted) return;
      const state = validateSnapshot(snapshot, Date.now());
      setStored({ key: requestKey, state });
      if (state.status === "ready") {
        expiryTimer = setTimeout(() => {
          setStored({ key: requestKey, state: { status: "unavailable", reason: "Configuration expired" } });
        }, Math.min(state.pack.expiresAt - Date.now(), 2_147_483_647));
      }
    }).catch(() => {
      if (!controller.signal.aborted) {
        setStored({ key: requestKey, state: { status: "unavailable", reason: "Could not load configuration" } });
      }
    });
    return () => {
      controller.abort();
      clearTimeout(expiryTimer);
    };
  }, [requestKey, load]);

  // A change of pack/version must not briefly render the previous request.
  return stored.key === requestKey ? stored.state : { status: "loading" };
}
