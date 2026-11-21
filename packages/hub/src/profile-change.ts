import type { HubProfile } from "./hub.ts";

/**
 * What an auth event means for `onProfileChange` listeners. Only a session that ends signs out:
 * a profile lookup that fails while the session is alive changes nothing.
 */
export function profileChangeOf(
  hasSession: boolean,
  profile: HubProfile | undefined,
): { readonly profile: HubProfile | undefined } | undefined {
  if (!hasSession) return { profile: undefined };
  return profile === undefined ? undefined : { profile };
}
