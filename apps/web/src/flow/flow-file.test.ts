import { FLOW_FORMAT, type Flow } from "@nodomics/protocol";
import { describe, expect, it } from "vitest";
import { decodeSharedFlow, encodeSharedFlow, parseFlowFile, serializeFlow } from "./flow-file.ts";

const FLOW: Flow = {
  format: FLOW_FORMAT,
  name: "Ventas por región",
  nodes: [
    {
      id: "n1",
      type: "core.source.sample",
      version: "0.1.0",
      params: { dataset: "ventas" },
      position: { x: 10, y: 20 },
    },
  ],
  edges: [],
};

describe("flow files", () => {
  it("reads back a serialized flow", () => {
    expect(parseFlowFile(serializeFlow(FLOW))).toEqual({ ok: true, value: FLOW });
  });

  it("rejects text that is not JSON", () => {
    expect(parseFlowFile("{nope")).toEqual({ ok: false, error: { kind: "not-json" } });
  });

  it("rejects JSON that is not a flow, listing the problems", () => {
    const result = parseFlowFile(JSON.stringify({ format: "otro", nodes: [] }));

    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.kind).toBe("invalid");
  });
});

describe("shared flows", () => {
  it("round-trips a flow through the URL hash", () => {
    expect(decodeSharedFlow(encodeSharedFlow(FLOW))).toEqual({ ok: true, value: FLOW });
  });

  it("produces a hash that is safe inside a URL", () => {
    expect(encodeSharedFlow(FLOW)).toMatch(/^#flow=[A-Za-z0-9+\-$]+$/);
  });

  it("reports that there is nothing to load when the hash has no flow", () => {
    expect(decodeSharedFlow("")).toBeUndefined();
    expect(decodeSharedFlow("#otra-cosa")).toBeUndefined();
  });

  it("rejects a hash that does not decompress into a flow", () => {
    expect(decodeSharedFlow("#flow=basura")).toMatchObject({ ok: false });
  });
});
