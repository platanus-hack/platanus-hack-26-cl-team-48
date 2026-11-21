import { describe, expect, it } from "vitest";
import type { NodeManifest } from "@nodomics/protocol";
import {
  SNAPSHOT_FORMAT,
  decodeFigure,
  encodeFigure,
  parseSnapshot,
  type Snapshot,
} from "./snapshot.ts";

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

const columns = [
  { name: "region", type: "text" as const },
  { name: "total", type: "number" as const },
];

const fullState: NonNullable<Snapshot["state"]> = {
  nodes: {
    n1: { state: "done" },
    n2: { state: "error", error: { code: "SQL_ERROR", message: "Falló la consulta" } },
  },
  results: { n1: { out: { id: "r1", rowCount: 2, schema: columns } } },
  displays: { n1: [{ id: "d1", mime: "image/png", width: 640, height: 480, title: "Ventas" }] },
  schemas: { n1: { out: columns } },
  pages: {
    r1: {
      columns,
      rows: [
        ["norte", 10],
        ["sur", null],
      ],
      total: 2,
    },
  },
  profiles: {
    r1: {
      columns: [
        { name: "total", type: "number", count: 2, nulls: 1, distinct: 1, mean: 10, bins: [1] },
      ],
    },
  },
  views: { n3: { spec: { mark: "bar" }, rowCount: 2, sampled: false } },
  figures: { d1: { mime: "image/png", base64: "iVBORw0KGgo=" } },
};

const fullSnapshot: Snapshot = { format: SNAPSHOT_FORMAT, catalog: [manifest], state: fullState };

describe("SNAPSHOT_FORMAT", () => {
  it("names the snapshot format version", () => {
    const format = SNAPSHOT_FORMAT;

    expect(format).toBe("nodomics/snapshot@0");
  });
});

describe("parseSnapshot", () => {
  it("accepts a snapshot with state", () => {
    const value: unknown = fullSnapshot;

    const result = parseSnapshot(value);

    expect(result).toEqual({ ok: true, value: fullSnapshot });
  });

  it("accepts a snapshot after a JSON round trip", () => {
    const value: unknown = JSON.parse(JSON.stringify(fullSnapshot));

    const result = parseSnapshot(value);

    expect(result.ok).toBe(true);
    expect(result.ok && result.value).toEqual(fullSnapshot);
  });

  it("accepts a snapshot without state", () => {
    const value: unknown = { format: SNAPSHOT_FORMAT, catalog: [manifest] };

    const result = parseSnapshot(value);

    expect(result.ok).toBe(true);
    expect(result.ok && result.value.state).toBeUndefined();
  });

  it("accepts a snapshot with an empty catalog and empty state", () => {
    const value: unknown = {
      format: SNAPSHOT_FORMAT,
      catalog: [],
      state: {
        nodes: {},
        results: {},
        displays: {},
        schemas: {},
        pages: {},
        profiles: {},
        views: {},
        figures: {},
      },
    };

    const result = parseSnapshot(value);

    expect(result.ok).toBe(true);
  });

  it("rejects another format", () => {
    const value: unknown = { format: "nodomics/snapshot@1", catalog: [] };

    const result = parseSnapshot(value);

    expect(result.ok).toBe(false);
  });

  it("rejects a flow document", () => {
    const value: unknown = { format: "nodomics/flow@0", nodes: [], edges: [] };

    const result = parseSnapshot(value);

    expect(result.ok).toBe(false);
  });

  it("rejects values that are not objects", () => {
    const values: unknown[] = [null, undefined, "snapshot", 42, []];

    const results = values.map(parseSnapshot);

    expect(results.map((r) => r.ok)).toEqual([false, false, false, false, false]);
  });

  it("rejects a snapshot without a catalog", () => {
    const value: unknown = { format: SNAPSHOT_FORMAT };

    const result = parseSnapshot(value);

    expect(result.ok).toBe(false);
  });

  it("rejects an invalid manifest in the catalog", () => {
    const value: unknown = { format: SNAPSHOT_FORMAT, catalog: [{ ...manifest, version: "uno" }] };

    const result = parseSnapshot(value);

    expect(result.ok).toBe(false);
  });

  it("rejects an unknown node state", () => {
    const value: unknown = {
      ...fullSnapshot,
      state: { ...fullState, nodes: { n1: { state: "exploded" } } },
    };

    const result = parseSnapshot(value);

    expect(result.ok).toBe(false);
  });

  it("rejects a state with a missing section", () => {
    const withoutFigures = Object.fromEntries(
      Object.entries(fullState).filter(([key]) => key !== "figures"),
    );
    const value: unknown = { ...fullSnapshot, state: withoutFigures };

    const result = parseSnapshot(value);

    expect(result.ok).toBe(false);
  });

  it("rejects a figure with another mime type", () => {
    const value: unknown = {
      ...fullSnapshot,
      state: { ...fullState, figures: { d1: { mime: "image/jpeg", base64: "AAAA" } } },
    };

    const result = parseSnapshot(value);

    expect(result.ok).toBe(false);
  });

  it("rejects a page with a negative total", () => {
    const value: unknown = {
      ...fullSnapshot,
      state: { ...fullState, pages: { r1: { columns, rows: [], total: -1 } } },
    };

    const result = parseSnapshot(value);

    expect(result.ok).toBe(false);
  });

  it("rejects a view without a row count", () => {
    const value: unknown = {
      ...fullSnapshot,
      state: { ...fullState, views: { n3: { spec: {}, sampled: true } } },
    };

    const result = parseSnapshot(value);

    expect(result.ok).toBe(false);
  });

  it("reports the problems as validation issues", () => {
    const value: unknown = { format: "otro", catalog: [] };

    const result = parseSnapshot(value);

    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.length).toBeGreaterThan(0);
    const issue = result.ok ? undefined : result.error[0];
    expect(typeof issue?.path).toBe("string");
    expect(typeof issue?.message).toBe("string");
  });
});

describe("encodeFigure and decodeFigure", () => {
  it("encodes a figure as base64 with its mime type", () => {
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);

    const stored = encodeFigure({ mime: "image/png", bytes });

    expect(stored).toEqual({ mime: "image/png", base64: "iVBORw==" });
  });

  it("round trips every byte value including 0 and 255", () => {
    const bytes = Uint8Array.from({ length: 256 }, (_, i) => i);

    const decoded = decodeFigure(encodeFigure({ mime: "image/png", bytes }));

    expect(decoded.mime).toBe("image/png");
    expect(Array.from(decoded.bytes)).toEqual(Array.from(bytes));
  });

  it("round trips an empty figure", () => {
    const bytes = new Uint8Array();

    const decoded = decodeFigure(encodeFigure({ mime: "image/png", bytes }));

    expect(decoded.bytes.length).toBe(0);
  });

  it("round trips a figure larger than 100 KB", () => {
    const bytes = Uint8Array.from({ length: 300_000 }, (_, i) => (i * 31 + 7) % 256);

    const decoded = decodeFigure(encodeFigure({ mime: "image/png", bytes }));

    expect(decoded.bytes.length).toBe(bytes.length);
    expect(Buffer.from(decoded.bytes).equals(Buffer.from(bytes))).toBe(true);
  });

  it("stores a figure that survives a JSON round trip and parses inside a snapshot", () => {
    const bytes = Uint8Array.from([0, 255, 128, 1]);
    const stored = encodeFigure({ mime: "image/png", bytes });
    const snapshot = {
      ...fullSnapshot,
      state: { ...fullState, figures: { d1: stored } },
    };

    const parsed = parseSnapshot(JSON.parse(JSON.stringify(snapshot)));

    expect(parsed.ok).toBe(true);
    const figure = parsed.ok ? parsed.value.state?.figures["d1"] : undefined;
    expect(figure && Array.from(decodeFigure(figure).bytes)).toEqual([0, 255, 128, 1]);
  });
});
