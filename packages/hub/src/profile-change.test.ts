import { describe, expect, it } from "vitest";
import { profileChangeOf, type HubProfile } from "./index.ts";

const ana: HubProfile = { id: "u-ana", handle: "ana", displayName: "Ana Pérez" };

describe("profileChangeOf", () => {
  it("reports a sign-out when there is no session", () => {
    const change = profileChangeOf(false, undefined);

    expect(change).toEqual({ profile: undefined });
  });

  it("reports a sign-out when there is no session even if a profile is given", () => {
    const change = profileChangeOf(false, ana);

    expect(change).toEqual({ profile: undefined });
  });

  it("reports the profile when there is a session and a profile", () => {
    const change = profileChangeOf(true, ana);

    expect(change).toEqual({ profile: ana });
  });

  it("reports nothing when there is a session but the profile lookup failed", () => {
    const change = profileChangeOf(true, undefined);

    expect(change).toBeUndefined();
  });
});
