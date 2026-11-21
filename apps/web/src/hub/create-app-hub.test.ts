import type { FlowStore, Hub } from "@nodomics/hub";
import { describe, expect, it } from "vitest";
import { createAppHub } from "./create-app-hub.ts";

const LOCAL_ACCOUNT = { id: "local", handle: "local", displayName: "Cuenta local" };

const hubWithoutKeys = (): Hub & FlowStore => createAppHub({});

describe("createAppHub without Supabase keys", () => {
  it("signs in to the local account with a provider", async () => {
    const hub = hubWithoutKeys();

    await hub.signIn({ kind: "provider", provider: "github" });

    expect(await hub.currentProfile()).toEqual(LOCAL_ACCOUNT);
  });

  it("signs in to the local account with the email local", async () => {
    const hub = hubWithoutKeys();

    const signedIn = await hub.signIn({ kind: "email", email: "local" });

    expect({ signedIn, profile: await hub.currentProfile() }).toEqual({
      signedIn: { ok: true, value: undefined },
      profile: LOCAL_ACCOUNT,
    });
  });

  it("treats empty keys as missing", async () => {
    const hub: Hub & FlowStore = createAppHub({
      VITE_SUPABASE_URL: "",
      VITE_SUPABASE_PUBLISHABLE_KEY: "",
    });

    await hub.signIn({ kind: "provider", provider: "google" });

    expect(await hub.currentProfile()).toEqual(LOCAL_ACCOUNT);
  });

  it("saves and lists flows of the local account", async () => {
    const hub = hubWithoutKeys();
    await hub.signIn({ kind: "provider", provider: "github" });

    await hub.saveOwnFlow({ id: "one", visibility: "private", document: { name: "Ventas" } });

    expect(await hub.listOwnFlows()).toMatchObject({
      ok: true,
      value: [{ id: "one", ownerId: "local", visibility: "private" }],
    });
  });
});
