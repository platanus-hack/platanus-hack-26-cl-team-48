import type { Hub } from "@nodomics/hub";

export const LOCAL_SESSION_KEY = "nodomics.local-session.v1";
const SIGNED_IN = "signed-in";
const LOCAL_SIGN_IN = { kind: "provider", provider: "github" } as const;

type SessionStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
type StorageEvents = Pick<Window, "addEventListener">;
type LocalAuth = Pick<Hub, "signIn" | "signOut" | "onProfileChange">;

/**
 * The in-memory hub lives in one tab, so the hub tab and the editor tab would each ask to sign in.
 * This keeps the local account signed in across reloads and tabs. Supabase does this on its own.
 */
export function shareLocalSession(
  hub: LocalAuth,
  getStorage: () => SessionStorage,
  events: StorageEvents,
) {
  if (read(getStorage) === SIGNED_IN) void hub.signIn(LOCAL_SIGN_IN);
  hub.onProfileChange((profile) => {
    write(getStorage, profile === undefined ? undefined : SIGNED_IN);
  });
  events.addEventListener("storage", (event) => {
    if (event.key !== LOCAL_SESSION_KEY) return;
    void (event.newValue === SIGNED_IN ? hub.signIn(LOCAL_SIGN_IN) : hub.signOut());
  });
}

function read(getStorage: () => SessionStorage): string | null {
  try {
    return getStorage().getItem(LOCAL_SESSION_KEY);
  } catch {
    return null;
  }
}

function write(getStorage: () => SessionStorage, value: string | undefined) {
  try {
    if (value === undefined) getStorage().removeItem(LOCAL_SESSION_KEY);
    else getStorage().setItem(LOCAL_SESSION_KEY, value);
  } catch {
    /* Storage can be disabled; the session then lasts only in this tab. */
  }
}
