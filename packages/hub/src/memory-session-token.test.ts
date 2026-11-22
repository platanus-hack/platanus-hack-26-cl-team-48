import { describe, expect, it } from "vitest";
import type { HubProfile } from "./hub.ts";
import { createMemoryHub } from "./memory-hub.ts";

const ana: HubProfile = { id: "u-ana", handle: "ana", displayName: "Ana Pérez" };

const newHub = () => createMemoryHub({ profiles: [ana], now: () => "2026-11-21T00:00:00.000Z" });

describe("memory hub session token", () => {
  it("resolves no access token when signed out", async () => {
    const hub = newHub();

    const token = await hub.accessToken();

    expect(token).toBeUndefined();
  });

  it("resolves no access token after signing in because it has no real auth", async () => {
    const hub = newHub();
    await hub.signIn({ kind: "email", email: ana.handle });

    const token = await hub.accessToken();

    expect(token).toBeUndefined();
  });
});
