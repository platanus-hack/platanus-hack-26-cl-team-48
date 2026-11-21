import { createMemoryHub, createSupabaseHub, type Hub } from "@nodomics/hub";

type HubEnvironment = {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
};

/**
 * The real hub when Supabase is configured (ADR 0018); otherwise an empty in-memory hub, so the
 * editor still runs for anyone who clones the repository without the hub's keys.
 */
export function createAppHub(environment: HubEnvironment): Hub {
  const url = environment.VITE_SUPABASE_URL;
  const publishableKey = environment.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (url === undefined || url === "" || publishableKey === undefined || publishableKey === "")
    return createMemoryHub({ profiles: [], now: () => new Date().toISOString() });
  return createSupabaseHub({
    url,
    publishableKey,
    redirectTo: () => `${window.location.origin}${window.location.pathname}`,
  });
}
