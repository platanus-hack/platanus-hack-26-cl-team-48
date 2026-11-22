import { describe, expect, it } from "vitest";
import { SIDE_SECTIONS } from "../layout/workspace-preferences.ts";
import { reachableSection, sectionsFor } from "./account-sections.ts";

describe("SIDE_SECTIONS", () => {
  it("has no saved flows section, since saved flows live in the hub", () => {
    expect(SIDE_SECTIONS).toEqual(["nodes", "my-nodes", "data", "secrets", "agent"]);
  });
});

describe("sectionsFor", () => {
  it("offers every section but Mis flujos when signed in", () => {
    const sections = sectionsFor(true);

    expect(sections).toEqual(["nodes", "my-nodes", "data", "secrets", "agent"]);
  });

  it("leaves out the agent when signed out", () => {
    const sections = sectionsFor(false);

    expect(sections).toEqual(["nodes", "my-nodes", "data", "secrets"]);
  });
});

describe("reachableSection", () => {
  it("shows Nodos instead of the agent when signed out", () => {
    const section = reachableSection("agent", false);

    expect(section).toBe("nodes");
  });

  it("keeps the agent when signed in", () => {
    const section = reachableSection("agent", true);

    expect(section).toBe("agent");
  });
});
