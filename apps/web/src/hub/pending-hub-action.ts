/** An action on a publication waiting for sign-in, kept across the provider redirect. */
export type PendingHubAction = {
  readonly kind: "copy" | "install";
  readonly handle: string;
  readonly slug: string;
  readonly version: string;
};
type Publication = { readonly handle: string; readonly slug: string };

const PENDING_ACTION_KEY = "nodomics.pendingHubAction";

export function keepPendingHubAction(
  storage: Pick<Storage, "setItem">,
  action: PendingHubAction,
): void {
  storage.setItem(PENDING_ACTION_KEY, JSON.stringify(action));
}

/** The kept action, only when it is for this publication; an unreadable one is dropped. */
export function peekPendingHubAction(
  storage: Pick<Storage, "getItem" | "removeItem">,
  { handle, slug }: Publication,
): PendingHubAction | undefined {
  const kept = storage.getItem(PENDING_ACTION_KEY);
  if (kept === null) return undefined;
  const action = parsePendingHubAction(kept);
  if (action === undefined) storage.removeItem(PENDING_ACTION_KEY);
  return action?.handle === handle && action.slug === slug ? action : undefined;
}

export function takePendingHubAction(
  storage: Pick<Storage, "getItem" | "removeItem">,
  publication: Publication,
): PendingHubAction | undefined {
  const action = peekPendingHubAction(storage, publication);
  if (action !== undefined) storage.removeItem(PENDING_ACTION_KEY);
  return action;
}

function parsePendingHubAction(text: string): PendingHubAction | undefined {
  const value = parseJson(text);
  if (!isRecord(value)) return undefined;
  const { kind, handle, slug, version } = value;
  return (kind === "copy" || kind === "install") &&
    typeof handle === "string" &&
    typeof slug === "string" &&
    typeof version === "string"
    ? { kind, handle, slug, version }
    : undefined;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
