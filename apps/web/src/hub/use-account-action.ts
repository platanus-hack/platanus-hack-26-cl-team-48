import { useEffect, useRef, useState } from "react";
import { useHubProfile } from "./hub-context.ts";
import {
  keepPendingHubAction,
  peekPendingHubAction,
  takePendingHubAction,
  type PendingHubAction,
} from "./pending-hub-action.ts";

type Kind = PendingHubAction["kind"];
type Target = Omit<PendingHubAction, "kind">;

/**
 * Copying or installing needs an account: signed out, the action waits for sign-in, kept in
 * this tab so it survives the provider's redirect, and then runs once.
 */
export function useAccountAction(target: Target, run: (kind: Kind) => void) {
  const isSignedIn = useHubProfile() !== undefined;
  const [isAsking, setAsking] = useState(false);
  const latestRun = useRef(run);
  latestRun.current = run;
  const { handle, slug, version } = target;
  useEffect(() => {
    if (!isSignedIn) return;
    const publication = { handle, slug };
    if (peekPendingHubAction(window.sessionStorage, publication)?.version !== version) return;
    const pending = takePendingHubAction(window.sessionStorage, publication);
    setAsking(false);
    if (pending !== undefined) latestRun.current(pending.kind);
  }, [isSignedIn, handle, slug, version]);
  const request = (kind: Kind) => {
    if (isSignedIn) {
      run(kind);
      return;
    }
    keepPendingHubAction(window.sessionStorage, { kind, ...target });
    setAsking(true);
  };
  const cancel = () => {
    takePendingHubAction(window.sessionStorage, { handle, slug });
    setAsking(false);
  };
  return { request, isAsking, cancel };
}
