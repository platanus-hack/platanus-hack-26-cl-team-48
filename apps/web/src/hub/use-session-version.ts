import { useEffect, useState } from "react";
import { useHub } from "./hub-context.ts";

/**
 * A counter that grows on every change of the hub session. Used as a `key`, it discards what
 * belongs to the previous session even when a sign-out and a sign-in batch into one identical render.
 */
export function useSessionVersion(): number {
  const hub = useHub();
  const [version, setVersion] = useState(0);
  useEffect(
    () =>
      hub.onProfileChange(() => {
        setVersion((current) => current + 1);
      }),
    [hub],
  );
  return version;
}
