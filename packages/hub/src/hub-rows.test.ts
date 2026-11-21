import { describe, expect, it } from "vitest";
import { FLOW_FORMAT, type Flow, type NodeManifest } from "@nodomics/protocol";
import { toProfile, toSummaries, toVersion, toVersionSummaries } from "./hub-rows.ts";

const flow: Flow = {
  format: FLOW_FORMAT,
  nodes: [{ id: "n1", type: "source.csv", version: "0.1.0", params: {}, position: { x: 0, y: 0 } }],
  edges: [],
};

const manifest: NodeManifest = {
  id: "hub.ana.limpiar",
  version: "0.1.0",
  name: "Limpiar",
  category: "Transformar",
  inputs: [{ id: "in", type: "table" }],
  outputs: [{ id: "out", type: "table" }],
  params: { type: "object", properties: {} },
  impl: { kind: "sql", template: "select * from {{in}}" },
};

const publicationRow = {
  id: "p1",
  owner_id: "u-ana",
  slug: "ventas",
  kind: "flow",
  title: "Ventas",
  description: "Suma",
  tags: ["ventas", "mapa"],
  license: "MIT",
  latest_version: "0.2.0",
  created_at: "2026-11-20T10:00:00Z",
  updated_at: "2026-11-21T10:00:00Z",
  owner_handle: "ana",
  owner_name: "Ana",
  owner_avatar: "https://example.com/ana.png",
};

function expectInvalid(result: { ok: boolean; error?: unknown }): void {
  expect(result.ok).toBe(false);
  const error = result.error as { kind?: unknown; detail?: unknown } | undefined;
  expect(error?.kind).toBe("invalid");
  expect(typeof error?.detail).toBe("string");
  expect(Object.keys(error ?? {}).sort()).toEqual(["detail", "kind"]);
}

describe("toProfile", () => {
  it("maps a profile row with an avatar", () => {
    const row = { id: "u1", handle: "ana", display_name: "Ana", avatar_url: "https://a/x.png" };

    const result = toProfile(row);

    expect(result).toEqual({
      ok: true,
      value: { id: "u1", handle: "ana", displayName: "Ana", avatarUrl: "https://a/x.png" },
    });
  });

  it("omits the avatar when it is null", () => {
    const row = { id: "u1", handle: "ana", display_name: "Ana", avatar_url: null };

    const result = toProfile(row);

    expect(result.ok).toBe(true);
    expect(result.ok && result.value).toEqual({ id: "u1", handle: "ana", displayName: "Ana" });
    expect(result.ok && result.value).not.toHaveProperty("avatarUrl");
  });

  it("rejects a row without a handle", () => {
    const row = { id: "u1", display_name: "Ana", avatar_url: null };

    const result = toProfile(row);

    expectInvalid(result);
  });

  it("rejects a row with a wrongly typed field", () => {
    const row = { id: 1, handle: "ana", display_name: "Ana", avatar_url: null };

    const result = toProfile(row);

    expectInvalid(result);
  });

  it("rejects values that are not rows", () => {
    const values: unknown[] = [null, undefined, "ana", 3, []];

    const results = values.map(toProfile);

    results.forEach(expectInvalid);
  });
});

describe("toSummaries", () => {
  it("maps rows of the publications view, tolerating extra columns", () => {
    const rows: unknown[] = [publicationRow];

    const result = toSummaries(rows);

    expect(result).toEqual({
      ok: true,
      value: [
        {
          id: "p1",
          slug: "ventas",
          kind: "flow",
          title: "Ventas",
          description: "Suma",
          tags: ["ventas", "mapa"],
          license: "MIT",
          latestVersion: "0.2.0",
          updatedAt: "2026-11-21T10:00:00Z",
          owner: { handle: "ana", displayName: "Ana", avatarUrl: "https://example.com/ana.png" },
        },
      ],
    });
  });

  it("omits the latest version and owner avatar when they are null", () => {
    const rows: unknown[] = [{ ...publicationRow, latest_version: null, owner_avatar: null }];

    const result = toSummaries(rows);

    expect(result.ok).toBe(true);
    const summary = result.ok ? result.value[0] : undefined;
    expect(summary).not.toHaveProperty("latestVersion");
    expect(summary?.owner).toEqual({ handle: "ana", displayName: "Ana" });
  });

  it("accepts a node publication", () => {
    const rows: unknown[] = [{ ...publicationRow, kind: "node" }];

    const result = toSummaries(rows);

    expect(result.ok && result.value[0]?.kind).toBe("node");
  });

  it("keeps the order of the rows", () => {
    const rows: unknown[] = [
      { ...publicationRow, id: "p1", slug: "a" },
      { ...publicationRow, id: "p2", slug: "b" },
    ];

    const result = toSummaries(rows);

    expect(result.ok && result.value.map((s) => s.slug)).toEqual(["a", "b"]);
  });

  it("returns an empty list for no rows", () => {
    const rows: unknown[] = [];

    const result = toSummaries(rows);

    expect(result).toEqual({ ok: true, value: [] });
  });

  it("rejects an unknown kind", () => {
    const rows: unknown[] = [{ ...publicationRow, kind: "dataset" }];

    const result = toSummaries(rows);

    expectInvalid(result);
  });

  it("rejects tags that are not a list of strings", () => {
    const rows: unknown[] = [{ ...publicationRow, tags: "ventas" }];

    const result = toSummaries(rows);

    expectInvalid(result);
  });

  it("rejects a row missing the owner handle", () => {
    const row = Object.fromEntries(
      Object.entries(publicationRow).filter(([key]) => key !== "owner_handle"),
    );

    const result = toSummaries([row]);

    expectInvalid(result);
  });

  it("rejects the whole list when any row is invalid", () => {
    const rows: unknown[] = [publicationRow, { ...publicationRow, title: null }];

    const result = toSummaries(rows);

    expectInvalid(result);
  });
});

describe("toVersionSummaries", () => {
  it("maps version rows", () => {
    const rows: unknown[] = [
      { version: "0.1.0", created_at: "2026-11-21T00:00:00Z", has_state: true },
    ];

    const result = toVersionSummaries(rows);

    expect(result).toEqual({
      ok: true,
      value: [{ version: "0.1.0", createdAt: "2026-11-21T00:00:00Z", hasState: true }],
    });
  });

  it("sorts versions newest first by semver", () => {
    const rows: unknown[] = [
      { version: "0.1.9", created_at: "2026-11-21T00:00:01Z", has_state: false },
      { version: "0.1.10", created_at: "2026-11-21T00:00:02Z", has_state: false },
      { version: "0.2.0", created_at: "2026-11-21T00:00:03Z", has_state: true },
      { version: "0.1.2", created_at: "2026-11-21T00:00:00Z", has_state: false },
    ];

    const result = toVersionSummaries(rows);

    expect(result.ok && result.value.map((v) => v.version)).toEqual([
      "0.2.0",
      "0.1.10",
      "0.1.9",
      "0.1.2",
    ]);
  });

  it("rejects a row whose has_state is not a boolean", () => {
    const rows: unknown[] = [
      { version: "0.1.0", created_at: "2026-11-21T00:00:00Z", has_state: "yes" },
    ];

    const result = toVersionSummaries(rows);

    expectInvalid(result);
  });

  it("rejects a row without a version", () => {
    const rows: unknown[] = [{ created_at: "2026-11-21T00:00:00Z", has_state: false }];

    const result = toVersionSummaries(rows);

    expectInvalid(result);
  });
});

describe("toVersion", () => {
  it("maps a flow version without a manifest", () => {
    const row = { version: "0.1.0", created_at: "2026-11-21T00:00:00Z", flow, manifest: null };

    const result = toVersion(row);

    expect(result.ok).toBe(true);
    expect(result.ok && result.value).toEqual({
      version: "0.1.0",
      createdAt: "2026-11-21T00:00:00Z",
      flow,
    });
    expect(result.ok && result.value).not.toHaveProperty("manifest");
  });

  it("maps a node version with its manifest", () => {
    const row = { version: "0.1.0", created_at: "2026-11-21T00:00:00Z", flow, manifest };

    const result = toVersion(row);

    expect(result.ok && result.value).toEqual({
      version: "0.1.0",
      createdAt: "2026-11-21T00:00:00Z",
      flow,
      manifest,
    });
  });

  it("accepts a flow that went through JSON", () => {
    const row: unknown = JSON.parse(
      JSON.stringify({ version: "0.1.0", created_at: "2026-11-21T00:00:00Z", flow, manifest }),
    );

    const result = toVersion(row);

    expect(result.ok).toBe(true);
  });

  it("rejects a flow with another format", () => {
    const row = {
      version: "0.1.0",
      created_at: "2026-11-21T00:00:00Z",
      flow: { ...flow, format: "nodomics/flow@1" },
      manifest: null,
    };

    const result = toVersion(row);

    expectInvalid(result);
  });

  it("rejects a flow with an invalid node", () => {
    const row = {
      version: "0.1.0",
      created_at: "2026-11-21T00:00:00Z",
      flow: { ...flow, nodes: [{ id: "n1" }] },
      manifest: null,
    };

    const result = toVersion(row);

    expectInvalid(result);
  });

  it("rejects an invalid manifest", () => {
    const row = {
      version: "0.1.0",
      created_at: "2026-11-21T00:00:00Z",
      flow,
      manifest: { ...manifest, version: "uno" },
    };

    const result = toVersion(row);

    expectInvalid(result);
  });

  it("rejects a row without a flow", () => {
    const row = { version: "0.1.0", created_at: "2026-11-21T00:00:00Z", manifest: null };

    const result = toVersion(row);

    expectInvalid(result);
  });
});
