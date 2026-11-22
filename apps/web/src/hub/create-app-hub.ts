import {
  createMemoryHub,
  createSupabaseHub,
  type FlowStore,
  type Hub,
  type HubProfile,
  type SessionToken,
} from "@nodomics/hub";
import { DEMO_INITIAL_DRAFTS, DEMO_PROFILES } from "../demo/demo-seeds.ts";
import { shareLocalSession } from "./local-session.ts";

type HubEnvironment = {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
};

/** Without Supabase, one account to sign in with, so saving flows works locally (ADR 0023). */
const LOCAL_PROFILE: HubProfile = { id: "local", handle: "local", displayName: "Cuenta local" };

/**
 * The real hub when Supabase is configured (ADR 0018); otherwise an in-memory hub with one local account, so the
 * editor still runs for anyone who clones the repository without the hub's keys.
 */
export function createAppHub(environment: HubEnvironment): Hub & FlowStore & SessionToken {
  const url = environment.VITE_SUPABASE_URL;
  const publishableKey = environment.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (url === undefined || url === "" || publishableKey === undefined || publishableKey === "")
    return createLocalHub();
  return createSupabaseHub({
    url,
    publishableKey,
    redirectTo: () => `${window.location.origin}${window.location.pathname}`,
  });
}

/** The in-memory hub, with its session shared between the hub tab and the editor tab. */
function createLocalHub(): Hub & FlowStore & SessionToken {
  const hub = createMemoryHub({
    profiles: [LOCAL_PROFILE, ...DEMO_PROFILES],
    now: () => new Date().toISOString(),
    initialDrafts: DEMO_INITIAL_DRAFTS,
  });
  if (typeof window !== "undefined") shareLocalSession(hub, () => window.localStorage, window);
  return hub;
}
