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
  return useProfileOf(useHub());
}

/** Like useHubProfile, but also undefined where no hub is provided (a panel rendered on its own). */
export function useOptionalHubProfile(): HubProfile | undefined {
  return useProfileOf(useContext(HubContext));
}

function useProfileOf(hub: Hub | undefined): HubProfile | undefined {
  const [profile, setProfile] = useState<HubProfile | undefined>(undefined);
  useEffect(() => {
    if (hub === undefined) return;
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
