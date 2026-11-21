import { describe, expect, it } from "vitest";
import { NepNotifications, NepRequests } from "./nep.ts";
import { parse } from "./parse.ts";

describe("NEP requests", () => {
  it("declares params and result for every method in the protocol", () => {
    expect(Object.keys(NepRequests).sort()).toEqual(
      [
        "code.complete",
        "data.display",
        "data.page",
        "data.profile",
        "data.view",
        "engine.hello",
        "flow.run",
        "flow.set",
        "nodes.list",
        "nodes.register",
        "run.cancel",
        "schema.infer",
        "source.add",
      ].sort(),
    );
  });

  it("accepts engine capabilities", () => {
    const capabilities = {
      protocol: "0.1",
      engine: "browser",
      runtimes: ["sql", "python"],
      sources: ["upload", "url"],
    };

    expect(parse(NepRequests["engine.hello"].result, capabilities).ok).toBe(true);
  });

  it("tells whether the engine completes code", () => {
    const capabilities = {
      protocol: "0.1",
      engine: "local",
      runtimes: ["python"],
      sources: ["path"],
      codeCompletion: true,
    };

    expect(parse(NepRequests["engine.hello"].result, capabilities).ok).toBe(true);
  });

  it("completes the code of a node, which may differ from the code in the flow", () => {
    const params = { nodeId: "n1", code: "inputs[", line: 1, column: 7 };

    expect(parse(NepRequests["code.complete"].params, params).ok).toBe(true);
    expect(parse(NepRequests["code.complete"].result, { items: [] }).ok).toBe(true);
  });

  it("serves a figure's bytes by its reference", () => {
    const content = { mime: "image/png", bytes: new Uint8Array([137]) };

    expect(parse(NepRequests["data.display"].params, { ref: "d_1" }).ok).toBe(true);
    expect(parse(NepRequests["data.display"].result, content).ok).toBe(true);
  });

  it("rejects a negative flow revision", () => {
    const params = { rev: -1, flow: { format: "nodomics/flow@0", nodes: [], edges: [] } };

    expect(parse(NepRequests["flow.set"].params, params).ok).toBe(false);
  });

  it("limits data pages to at most 1000 rows", () => {
    expect(parse(NepRequests["data.page"].params, { ref: "r1", offset: 0, limit: 1001 }).ok).toBe(
      false,
    );
  });

  it("returns schema inference failures as node errors, not protocol errors", () => {
    const failure = { ok: false, error: { code: "COLUMN_NOT_FOUND", message: "No existe" } };

    expect(parse(NepRequests["schema.infer"].result, failure).ok).toBe(true);
  });
});

describe("NEP notifications", () => {
  it("accepts a node status with a user-facing error", () => {
    const event = {
      rev: 3,
      runId: "run_1",
      nodeId: "n4",
      state: "error",
      error: { code: "PYTHON_EXCEPTION", message: "La columna no existe", detail: "KeyError" },
    };

    expect(parse(NepNotifications["node.status"], event).ok).toBe(true);
  });

  it("carries a result reference, never the data itself", () => {
    const event = {
      rev: 3,
      runId: "run_1",
      nodeId: "n1",
      port: "out",
      ref: { id: "r_1", rowCount: 10, schema: [{ name: "monto", type: "number" }] },
    };

    expect(parse(NepNotifications["node.result"], event).ok).toBe(true);
    expect(parse(NepNotifications["node.result"], { ...event, rows: [[1]] }).ok).toBe(false);
  });

  it("announces a node's figures as references", () => {
    const event = {
      rev: 3,
      runId: "run_1",
      nodeId: "n1",
      displays: [{ id: "d_1", mime: "image/png", width: 640, height: 480 }],
    };

    expect(parse(NepNotifications["node.display"], event).ok).toBe(true);
    expect(
      parse(NepNotifications["node.display"], {
        ...event,
        displays: [{ id: "d_1", mime: "text/html", width: 1, height: 1 }],
      }).ok,
    ).toBe(false);
  });
});
