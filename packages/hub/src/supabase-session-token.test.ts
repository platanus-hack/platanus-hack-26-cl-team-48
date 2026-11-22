import { describe, expect, it } from "vitest";
import { createHubOnClient, type HubClient } from "./supabase-hub.ts";

type StubSession = { access_token: string; user: { id: string } } | null;

function clientWithSession(session: StubSession): HubClient {
  const auth = {
    getSession: () => Promise.resolve({ data: { session }, error: null }),
  };
  // A partial stub: the hub only reads the session here, the full Supabase client is out of scope.
  return { auth } as unknown as HubClient;
}

const redirectTo = () => "https://nodomics.test/";

describe("supabase hub session token", () => {
  it("resolves the access token of the current session", async () => {
    const hub = createHubOnClient(
      clientWithSession({ access_token: "tok-1", user: { id: "u1" } }),
      redirectTo,
    );

    const token = await hub.accessToken();

    expect(token).toBe("tok-1");
  });

  it("resolves no access token when there is no session", async () => {
    const hub = createHubOnClient(clientWithSession(null), redirectTo);

    const token = await hub.accessToken();

    expect(token).toBeUndefined();
  });
});
