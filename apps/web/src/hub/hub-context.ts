import type { Hub, HubProfile } from "@nodomics/hub";
import { createContext, useContext, useEffect, useState } from "react";

/** The hub of this app instance (ADR 0018), injected by the composition root. */
export const HubContext = createContext<Hub | undefined>(undefined);

export function useHub(): Hub {
  const hub = useContext(HubContext);
  if (hub === undefined) throw new Error("useHub must be used inside a HubContext provider");
  return hub;
}

/** The signed-in profile, following sign in and sign out; undefined while unknown or signed out. */
export function useHubProfile(): HubProfile | undefined {
  const hub = useHub();
  const [profile, setProfile] = useState<HubProfile | undefined>(undefined);
  useEffect(() => {
    let isCurrent = true;
    void hub.currentProfile().then((current) => {
      if (isCurrent) setProfile(current);
    });
    const unsubscribe = hub.onProfileChange(setProfile);
    return () => {
      isCurrent = false;
      unsubscribe();
    };
  }, [hub]);
  return profile;
}
