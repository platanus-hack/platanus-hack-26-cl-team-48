import { describe, expect, it } from "vitest";
import { createHubOnClient, type HubClient } from "./supabase-hub.ts";

type AnonymousReply = { data: unknown; error: { message: string } | null };

function clientReplying(reply: AnonymousReply): { client: HubClient; calls: number[] } {
  const calls: number[] = [];
  const auth = {
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    signInAnonymously: () => {
      calls.push(calls.length + 1);
      return Promise.resolve(reply);
    },
  };
  // A partial stub: the guest session only touches auth, the full Supabase client is out of scope.
  return { client: { auth } as unknown as HubClient, calls };
}

const redirectTo = () => "https://nodomics.test/";

describe("supabase hub guest session", () => {
  it("opens an anonymous supabase session", async () => {
    const { client, calls } = clientReplying({
      data: { session: { access_token: "anon-tok", user: { id: "g1", is_anonymous: true } } },
      error: null,
    });
    const hub = createHubOnClient(client, redirectTo);

    const result = await hub.startGuestSession();

    expect(result.ok).toBe(true);
    expect(calls).toHaveLength(1);
  });

  it("reports a failed anonymous sign in as an error value", async () => {
    const { client } = clientReplying({
      data: { session: null, user: null },
      error: { message: "anonymous sign-ins are disabled" },
    });
    const hub = createHubOnClient(client, redirectTo);

    const result = await hub.startGuestSession();

    expect(result.ok).toBe(false);
  });
});
