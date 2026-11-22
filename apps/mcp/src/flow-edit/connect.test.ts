import { describe, expect, it } from "vitest";
import { applyOp } from "./index.ts";
import {
  deepFreeze,
  edge,
  edgeEnds,
  errorOf,
  flowOf,
  node,
  pipelineFlow,
  testCatalog,
  unwrap,
  VALID_ID,
} from "./test-fixtures.ts";

const connect = (from: string, to: string) => ({ op: "connect", args: { from, to } }) as const;
const disconnect = (from: string, to: string) =>
  ({ op: "disconnect", args: { from, to } }) as const;

const unconnectedFlow = () =>
  flowOf([node("src", "t.source"), node("tr", "t.transform"), node("j", "t.join")]);

describe("connect", () => {
  it("adds a connection from an output port to an input port", () => {
    const flow = unconnectedFlow();

    const result = unwrap(applyOp(flow, connect("src.out", "tr.in"), testCatalog));

    expect(result.edges).toHaveLength(1);
    expect(result.edges[0]).toMatchObject({
      from: { node: "src", port: "out" },
      to: { node: "tr", port: "in" },
    });
  });

  it("gives the connection a valid id", () => {
    const flow = unconnectedFlow();

    const result = unwrap(applyOp(flow, connect("src.out", "tr.in"), testCatalog));

    expect(result.edges[0]?.id).toMatch(VALID_ID);
  });

  it("gives the same id to the same pair of ports in different flows", () => {
    const other = flowOf([node("tr", "t.transform"), node("src", "t.source")]);

    const first = unwrap(applyOp(unconnectedFlow(), connect("src.out", "tr.in"), testCatalog));
    const second = unwrap(applyOp(other, connect("src.out", "tr.in"), testCatalog));

    expect(first.edges[0]?.id).toBe(second.edges[0]?.id);
  });

  it("gives different ids to connections between different ports", () => {
    const flow = unconnectedFlow();

    const result = [connect("src.out", "j.left"), connect("tr.out", "j.right")].reduce(
      (current, op) => unwrap(applyOp(current, op, testCatalog)),
      flow,
    );

    expect(new Set(result.edges.map((e) => e.id)).size).toBe(2);
  });

  it("gives a valid id when the node ids are long", () => {
    const [source, target] = ["s".repeat(60), "t".repeat(60)];
    const flow = flowOf([node(source, "t.source"), node(target, "t.transform")]);

    const result = unwrap(applyOp(flow, connect(`${source}.out`, `${target}.in`), testCatalog));

    expect(result.edges[0]?.id).toMatch(VALID_ID);
  });

  it("leaves the flow unchanged when the connection already exists", () => {
    const flow = pipelineFlow();

    const result = unwrap(applyOp(flow, connect("src.out", "tr.in"), testCatalog));

    expect(result).toEqual(pipelineFlow());
  });

  it("connects to a port declared by the node's params", () => {
    const flow = flowOf([
      node("src", "t.source"),
      node("dyn", "t.dynamic", { ports: [{ name: "Ventas", type: "table" }] }),
    ]);

    const result = unwrap(applyOp(flow, connect("src.out", "dyn.ventas"), testCatalog));

    expect(edgeEnds(result)).toEqual(["src.out->dyn.ventas"]);
  });

  it("returns an error when the source node does not exist", () => {
    const flow = unconnectedFlow();

    const message = errorOf(applyOp(flow, connect("ghost.out", "tr.in"), testCatalog));

    expect(message).toContain("ghost");
  });

  it("returns an error when the target node does not exist", () => {
    const flow = unconnectedFlow();

    const message = errorOf(applyOp(flow, connect("src.out", "ghost.in"), testCatalog));

    expect(message).toContain("ghost");
  });

  it("returns an error when the source port does not exist", () => {
    const flow = unconnectedFlow();

    const message = errorOf(applyOp(flow, connect("src.nope", "tr.in"), testCatalog));

    expect(message).toContain("nope");
  });

  it("returns an error when the target port does not exist", () => {
    const flow = unconnectedFlow();

    const message = errorOf(applyOp(flow, connect("src.out", "tr.nope"), testCatalog));

    expect(message).toContain("nope");
  });

  it("returns an error when the source is an input port", () => {
    const flow = unconnectedFlow();

    const result = applyOp(flow, connect("tr.in", "j.left"), testCatalog);

    expect(result.ok).toBe(false);
  });

  it("returns an error when the target is an output port", () => {
    const flow = unconnectedFlow();

    const result = applyOp(flow, connect("src.out", "tr.out"), testCatalog);

    expect(result.ok).toBe(false);
  });

  it("returns an error for a port reference without a port", () => {
    const flow = unconnectedFlow();

    const result = applyOp(flow, connect("src", "tr.in"), testCatalog);

    expect(result.ok).toBe(false);
  });

  it("rejects a connection that closes a cycle", () => {
    const flow = flowOf(
      [node("a", "t.transform"), node("b", "t.transform"), node("c", "t.transform")],
      [edge("a.out", "b.in"), edge("b.out", "c.in")],
    );

    const message = errorOf(applyOp(flow, connect("c.out", "a.in"), testCatalog));

    expect(message).toMatch(/cycle|ciclo/i);
  });

  it("rejects a connection from a node to itself", () => {
    const flow = unconnectedFlow();

    const message = errorOf(applyOp(flow, connect("tr.out", "tr.in"), testCatalog));

    expect(message).toMatch(/cycle|ciclo/i);
  });

  it("does not mutate the input flow", () => {
    const flow = deepFreeze(unconnectedFlow());

    const result = applyOp(flow, connect("src.out", "tr.in"), testCatalog);

    expect(result.ok).toBe(true);
    expect(flow).toEqual(unconnectedFlow());
  });
});

describe("disconnect", () => {
  it("removes the connection between the two ports", () => {
    const flow = pipelineFlow();

    const result = unwrap(applyOp(flow, disconnect("src.out", "tr.in"), testCatalog));

    expect(result.edges).toEqual([]);
  });

  it("keeps the other connections", () => {
    const flow = flowOf(
      [node("a", "t.source"), node("b", "t.source"), node("j", "t.join")],
      [edge("a.out", "j.left"), edge("b.out", "j.right")],
    );

    const result = unwrap(applyOp(flow, disconnect("a.out", "j.left"), testCatalog));

    expect(edgeEnds(result)).toEqual(["b.out->j.right"]);
  });

  it("returns an error when the connection does not exist", () => {
    const flow = unconnectedFlow();

    const result = applyOp(flow, disconnect("src.out", "tr.in"), testCatalog);

    expect(result.ok).toBe(false);
  });

  it("does not mutate the input flow", () => {
    const flow = deepFreeze(pipelineFlow());

    const result = applyOp(flow, disconnect("src.out", "tr.in"), testCatalog);

    expect(result.ok).toBe(true);
    expect(flow).toEqual(pipelineFlow());
  });
});
