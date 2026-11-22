import { describe, expect, it } from "vitest";
import { applyOp, emptyFlow, type CodeNodeArgs } from "./index.ts";
import {
  deepFreeze,
  edge,
  edgeEnds,
  errorOf,
  flowOf,
  node,
  nodeById,
  pipelineFlow,
  testCatalog,
  unwrap,
} from "./test-fixtures.ts";

const PYTHON_CODE = 'def run(inputs, params):\n    return {"out": inputs["in"]}\n';
const SQL_CODE = "SELECT * FROM in";

const pythonArgs: CodeNodeArgs = {
  nodeId: "py",
  language: "python",
  code: PYTHON_CODE,
  inputs: ["in"],
  outputs: ["out"],
};

const createCode = (args: CodeNodeArgs) => ({ op: "create_code_node", args }) as const;
const updateCode = (args: CodeNodeArgs) => ({ op: "update_code_node", args }) as const;

const customNode = (flow: ReturnType<typeof pipelineFlow>, id: string) =>
  flow.customNodes?.find((m) => m.id === id);

const withPythonNode = () => unwrap(applyOp(pipelineFlow(), createCode(pythonArgs), testCatalog));

describe("create_code_node", () => {
  it("adds a python manifest to the flow's custom nodes", () => {
    const flow = pipelineFlow();

    const result = unwrap(applyOp(flow, createCode(pythonArgs), testCatalog));

    expect(customNode(result, "code.py")).toEqual({
      id: "code.py",
      version: "0.1.0",
      name: "py",
      category: "Código",
      inputs: [{ id: "in", type: "table" }],
      outputs: [{ id: "out", type: "table" }],
      params: { type: "object", properties: {} },
      impl: { kind: "python", code: PYTHON_CODE, entry: "run" },
      requires: { runtime: "python" },
    });
  });

  it("adds a sql manifest without runtime requirements", () => {
    const flow = pipelineFlow();
    const args: CodeNodeArgs = {
      nodeId: "q",
      language: "sql",
      code: SQL_CODE,
      inputs: ["left", "right"],
      outputs: ["out"],
    };

    const result = unwrap(applyOp(flow, createCode(args), testCatalog));

    expect(customNode(result, "code.q")).toEqual({
      id: "code.q",
      version: "0.1.0",
      name: "q",
      category: "Código",
      inputs: [
        { id: "left", type: "table" },
        { id: "right", type: "table" },
      ],
      outputs: [{ id: "out", type: "table" }],
      params: { type: "object", properties: {} },
      impl: { kind: "sql", template: SQL_CODE },
    });
  });

  it("adds a node of the code type at the end of the flow", () => {
    const flow = pipelineFlow();

    const result = unwrap(applyOp(flow, createCode(pythonArgs), testCatalog));

    expect(result.nodes.at(-1)).toMatchObject({
      id: "py",
      type: "code.py",
      version: "0.1.0",
      params: {},
    });
  });

  it("keeps the existing nodes and custom nodes", () => {
    const flow = pipelineFlow();

    const result = [createCode(pythonArgs), createCode({ ...pythonArgs, nodeId: "py2" })].reduce(
      (current, op) => unwrap(applyOp(current, op, testCatalog)),
      flow,
    );

    expect(result.nodes.map((n) => n.id)).toEqual(["src", "tr", "py", "py2"]);
    expect(result.customNodes?.map((m) => m.id)).toEqual(["code.py", "code.py2"]);
  });

  it("creates a node whose ports can be connected", () => {
    const flow = withPythonNode();

    const result = unwrap(
      applyOp(flow, { op: "connect", args: { from: "tr.out", to: "py.in" } }, testCatalog),
    );

    expect(edgeEnds(result)).toContain("tr.out->py.in");
  });

  it("returns an error when the node id already exists", () => {
    const flow = pipelineFlow();

    const message = errorOf(
      applyOp(flow, createCode({ ...pythonArgs, nodeId: "tr" }), testCatalog),
    );

    expect(message).toContain("tr");
  });

  it("returns an error for an invalid node id", () => {
    const flow = pipelineFlow();

    const result = applyOp(flow, createCode({ ...pythonArgs, nodeId: "no válido" }), testCatalog);

    expect(result.ok).toBe(false);
  });

  it("does not mutate the input flow", () => {
    const flow = deepFreeze(pipelineFlow());

    const result = applyOp(flow, createCode(pythonArgs), testCatalog);

    expect(result.ok).toBe(true);
    expect(flow).toEqual(pipelineFlow());
  });
});

describe("update_code_node", () => {
  it("replaces the code, language and ports of the manifest", () => {
    const flow = withPythonNode();
    const args: CodeNodeArgs = {
      nodeId: "py",
      language: "sql",
      code: SQL_CODE,
      inputs: ["a"],
      outputs: ["b"],
    };

    const result = unwrap(applyOp(flow, updateCode(args), testCatalog));

    expect(customNode(result, "code.py")).toMatchObject({
      id: "code.py",
      inputs: [{ id: "a", type: "table" }],
      outputs: [{ id: "b", type: "table" }],
      impl: { kind: "sql", template: SQL_CODE },
    });
    expect(customNode(result, "code.py")?.requires?.runtime).toBeUndefined();
  });

  it("keeps a single manifest for the code node", () => {
    const flow = withPythonNode();

    const result = unwrap(applyOp(flow, updateCode({ ...pythonArgs, code: "x = 1" }), testCatalog));

    expect(result.customNodes?.filter((m) => m.id === "code.py")).toHaveLength(1);
  });

  it("removes the connections that used ports that no longer exist", () => {
    const created = unwrap(applyOp(emptyFlow(), createCode(pythonArgs), testCatalog));
    const flow = flowOf(
      [node("src", "t.source"), ...created.nodes, node("tr", "t.transform")],
      [edge("src.out", "py.in"), edge("py.out", "tr.in")],
      created.customNodes,
    );

    const result = unwrap(
      applyOp(flow, updateCode({ ...pythonArgs, outputs: ["result"] }), testCatalog),
    );

    expect(edgeEnds(result)).toEqual(["src.out->py.in"]);
  });

  it("keeps the node in the flow", () => {
    const flow = withPythonNode();

    const result = unwrap(applyOp(flow, updateCode({ ...pythonArgs, code: "x = 1" }), testCatalog));

    expect(nodeById(result, "py")?.type).toBe("code.py");
  });

  it("returns an error for a node that is not a code node", () => {
    const flow = pipelineFlow();

    const result = applyOp(flow, updateCode({ ...pythonArgs, nodeId: "tr" }), testCatalog);

    expect(result.ok).toBe(false);
  });

  it("returns an error for a node that does not exist", () => {
    const flow = pipelineFlow();

    const result = applyOp(flow, updateCode({ ...pythonArgs, nodeId: "ghost" }), testCatalog);

    expect(result.ok).toBe(false);
  });

  it("does not mutate the input flow", () => {
    const flow = deepFreeze(withPythonNode());

    const result = applyOp(flow, updateCode({ ...pythonArgs, code: "x = 1" }), testCatalog);

    expect(result.ok).toBe(true);
    expect(flow).toEqual(withPythonNode());
  });
});
