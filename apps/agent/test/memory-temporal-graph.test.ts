import { expect, it } from "vitest";
import type { Edge } from "../src/memory/memory-port.ts";
import { changeRelation, edgesValidAt } from "../src/memory/temporal-graph.ts";

const T1 = "2026-11-21T10:00:00.000Z";
const T2 = "2026-11-21T11:40:00.000Z";
const T3 = "2026-11-21T12:00:00.000Z";

const OLD: Edge = {
  id: "e1",
  src: "node-a",
  dst: "param-4h",
  relation: "uses",
  validFrom: T1,
  validTo: null,
};

it("changing a param closes the old edge and opens a new one", () => {
  const next = changeRelation([OLD], {
    src: "node-a",
    relation: "uses",
    newDst: "param-2h",
    at: T2,
  });
  expect(next).toHaveLength(2);
  expect(next[0]).toEqual({ ...OLD, validTo: T2 });
  expect(next[1]).toMatchObject({
    src: "node-a",
    dst: "param-2h",
    relation: "uses",
    validFrom: T2,
    validTo: null,
  });
  expect(OLD.validTo).toBeNull();
});

it("changing a relation that does not exist opens it without closing anything", () => {
  const next = changeRelation([], { src: "node-a", relation: "uses", newDst: "x", at: T1 });
  expect(next).toHaveLength(1);
  expect(next[0]).toMatchObject({ dst: "x", validFrom: T1, validTo: null });
});

it("edgesValidAt returns the state at that time", () => {
  const edges = changeRelation([OLD], {
    src: "node-a",
    relation: "uses",
    newDst: "param-2h",
    at: T2,
  });
  expect(edgesValidAt(edges, T1).map((e) => e.dst)).toEqual(["param-4h"]);
  expect(edgesValidAt(edges, T3).map((e) => e.dst)).toEqual(["param-2h"]);
  expect(edgesValidAt(edges, "2026-11-21T09:00:00.000Z")).toEqual([]);
});

it("an edge closed at time t is no longer valid at t", () => {
  const edges = changeRelation([OLD], { src: "node-a", relation: "uses", newDst: "z", at: T2 });
  expect(edgesValidAt(edges, T2).map((e) => e.dst)).toEqual(["z"]);
});
