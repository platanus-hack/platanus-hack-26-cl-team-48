import type { NodeManifest } from "@nodomics/protocol";
import { describe, expect, it } from "vitest";
import { manifestOf, nodeOf } from "../canvas/canvas-fixtures.ts";
import { manifestsToInstall } from "./hub-install.ts";

const flowNode = (id: string, uses: ReadonlyArray<string>): NodeManifest =>
  manifestOf(id, {
    impl: {
      kind: "flow",
      graph: { nodes: uses.map((type, index) => nodeOf(`n${String(index)}`, type)), edges: [] },
    },
  });

const idsOf = (manifests: ReadonlyArray<NodeManifest>) => manifests.map(({ id }) => id);

describe("manifestsToInstall", () => {
  it("installs only the published node when it uses no custom nodes", () => {
    const published = flowNode("hub.ana.solo", ["core.filter"]);

    const manifests = manifestsToInstall(published, [flowNode("hub.ana.otro", [])]);

    expect(manifests).toEqual([published]);
  });

  it("installs a node that is not a flow on its own", () => {
    const published = manifestOf("hub.ana.sql");

    const manifests = manifestsToInstall(published, [flowNode("hub.ana.otro", [])]);

    expect(manifests).toEqual([published]);
  });

  it("installs the custom nodes the published node uses after it", () => {
    const a = flowNode("hub.ana.a", ["core.filter"]);
    const b = flowNode("hub.ana.b", []);
    const published = flowNode("hub.ana.top", ["hub.ana.a", "core.join", "hub.ana.b"]);

    const manifests = manifestsToInstall(published, [b, a]);

    expect(manifests).toEqual([published, a, b]);
  });

  it("installs the custom nodes used by the custom nodes, depth first in order of use", () => {
    const deep = flowNode("hub.ana.deep", []);
    const a = flowNode("hub.ana.a", ["hub.ana.deep"]);
    const b = flowNode("hub.ana.b", []);
    const published = flowNode("hub.ana.top", ["hub.ana.a", "hub.ana.b"]);

    const manifests = manifestsToInstall(published, [b, deep, a]);

    expect(idsOf(manifests)).toEqual(["hub.ana.top", "hub.ana.a", "hub.ana.deep", "hub.ana.b"]);
  });

  it("installs each custom node once although several nodes use it", () => {
    const shared = flowNode("hub.ana.shared", []);
    const a = flowNode("hub.ana.a", ["hub.ana.shared"]);
    const published = flowNode("hub.ana.top", ["hub.ana.shared", "hub.ana.a", "hub.ana.shared"]);

    const manifests = manifestsToInstall(published, [a, shared]);

    expect(idsOf(manifests)).toEqual(["hub.ana.top", "hub.ana.shared", "hub.ana.a"]);
  });

  it("leaves out the custom nodes it does not use", () => {
    const used = flowNode("hub.ana.used", []);
    const published = flowNode("hub.ana.top", ["hub.ana.used"]);

    const manifests = manifestsToInstall(published, [flowNode("hub.ana.unused", []), used]);

    expect(idsOf(manifests)).toEqual(["hub.ana.top", "hub.ana.used"]);
  });

  it("stops at custom nodes that use each other", () => {
    const a = flowNode("hub.ana.a", ["hub.ana.b"]);
    const b = flowNode("hub.ana.b", ["hub.ana.a", "hub.ana.top"]);
    const published = flowNode("hub.ana.top", ["hub.ana.a"]);

    const manifests = manifestsToInstall(published, [a, b, published]);

    expect(idsOf(manifests)).toEqual(["hub.ana.top", "hub.ana.a", "hub.ana.b"]);
  });
});
