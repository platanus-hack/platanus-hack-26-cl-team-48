import { coreNodes } from "@nodomics/nodes-core";
import { describe, expect, it } from "vitest";
import { validateFlow } from "./index.ts";
import {
  edge,
  flowOf,
  node,
  pipelineFlow,
  transformManifest,
  testCatalog,
} from "./test-fixtures.ts";

const issueNodeIds = (flow: Parameters<typeof validateFlow>[0]) =>
  validateFlow(flow, testCatalog).issues.map((issue) => issue.nodeId);

describe("validateFlow", () => {
  it("reports a correct flow as valid with no issues", () => {
    const flow = pipelineFlow();

    const report = validateFlow(flow, testCatalog);

    expect(report).toEqual({ valid: true, issues: [] });
  });

  it("reports a correct flow of core nodes as valid", () => {
    const flow = flowOf(
      [
        node("ventas", "core.source.sample", { dataset: "ventas" }),
        node("primeras", "core.limit", { n: 10 }),
        node("tabla", "core.view.table", { columns: ["producto"], rows: 20 }),
      ],
      [edge("ventas.out", "primeras.in"), edge("primeras.out", "tabla.in")],
    );

    const report = validateFlow(flow, coreNodes);

    expect(report).toEqual({ valid: true, issues: [] });
  });

  it("reports the empty flow as valid", () => {
    const flow = flowOf([]);

    const report = validateFlow(flow, testCatalog);

    expect(report).toEqual({ valid: true, issues: [] });
  });

  it("accepts nodes whose type is declared in the flow's custom nodes", () => {
    const flow = flowOf(
      [node("src", "t.source"), node("py", "code.py", { name: "x" })],
      [edge("src.out", "py.in")],
      [{ ...transformManifest, id: "code.py" }],
    );

    const report = validateFlow(flow, testCatalog);

    expect(report.valid).toBe(true);
  });

  it("reports a node of unknown type", () => {
    const flow = flowOf([node("m", "t.missing")]);

    const report = validateFlow(flow, testCatalog);

    expect(report.valid).toBe(false);
    expect(report.issues.map((issue) => issue.nodeId)).toContain("m");
  });

  it("reports a required input that is not connected", () => {
    const flow = flowOf([node("tr", "t.transform", { name: "x" })]);

    const nodeIds = issueNodeIds(flow);

    expect(nodeIds).toEqual(["tr"]);
  });

  it("does not report an optional input that is not connected", () => {
    const flow = flowOf(
      [node("src", "t.source"), node("j", "t.join")],
      [edge("src.out", "j.left")],
    );

    const report = validateFlow(flow, testCatalog);

    expect(report).toEqual({ valid: true, issues: [] });
  });

  it("reports a missing required param", () => {
    const flow = flowOf(
      [node("src", "t.source"), node("tr", "t.transform")],
      [edge("src.out", "tr.in")],
    );

    const report = validateFlow(flow, testCatalog);

    expect(report.valid).toBe(false);
    expect(report.issues).toHaveLength(1);
    expect(report.issues[0]?.nodeId).toBe("tr");
    expect(report.issues[0]?.message).toContain("name");
  });

  it("reports a param that does not satisfy its schema", () => {
    const flow = flowOf(
      [node("src", "t.source"), node("tr", "t.transform", { name: "x", n: 50 })],
      [edge("src.out", "tr.in")],
    );

    const report = validateFlow(flow, testCatalog);

    expect(report.valid).toBe(false);
    expect(report.issues).toHaveLength(1);
    expect(report.issues[0]?.nodeId).toBe("tr");
  });

  it("reports a connection to a node that does not exist", () => {
    const flow = flowOf([node("src", "t.source")], [edge("src.out", "ghost.in")]);

    const report = validateFlow(flow, testCatalog);

    expect(report.valid).toBe(false);
    expect(report.issues.length).toBeGreaterThan(0);
    expect(report.issues.every((issue) => ["src", "ghost"].includes(issue.nodeId))).toBe(true);
  });

  it("reports a connection to a port that does not exist", () => {
    const flow = flowOf(
      [node("src", "t.source"), node("tr", "t.transform", { name: "x" })],
      [edge("src.out", "tr.in"), edge("src.nope", "tr.in")],
    );

    const report = validateFlow(flow, testCatalog);

    expect(report.valid).toBe(false);
    expect(report.issues.some((issue) => issue.message.includes("nope"))).toBe(true);
  });

  it("accepts a connection to a port declared by the node's params", () => {
    const flow = flowOf(
      [
        node("src", "t.source"),
        node("dyn", "t.dynamic", { ports: [{ name: "datos", type: "table" }] }),
      ],
      [edge("src.out", "dyn.datos")],
    );

    const report = validateFlow(flow, testCatalog);

    expect(report).toEqual({ valid: true, issues: [] });
  });

  it("reports one issue per problem across nodes", () => {
    const flow = flowOf([node("m", "t.missing"), node("tr", "t.transform", { name: "x" })]);

    const nodeIds = issueNodeIds(flow);

    expect([...nodeIds].sort()).toEqual(["m", "tr"]);
  });
});
