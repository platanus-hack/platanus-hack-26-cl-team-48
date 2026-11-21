import { ok } from "@nodomics/protocol";
import { describe, expect, it } from "vitest";
import type { LlmPort, LlmTurn } from "../src/llm/llm-port.ts";
import { buildProposal } from "../src/proposals/build-proposal.ts";
import { writeReasons } from "../src/proposals/reasons.ts";
import { createFakeMcp } from "../src/mcp/fake-mcp.ts";
import type { UnreasonedChange } from "../src/proposals/from-diff.ts";

const IDENTITY = { userId: "user-1", accessToken: "token-1" };

const SAMPLE_CHANGES: readonly UnreasonedChange[] = [
  {
    id: "ch-1",
    kind: "set_param",
    target: "harvest.window",
    before: 4,
    after: 2,
    reason: "",
    needsReason: true,
    dependsOn: [],
  },
  {
    id: "ch-2",
    kind: "add_node",
    target: "sensor.temp",
    before: undefined,
    after: { type: "sensor.temp" },
    reason: "",
    needsReason: true,
    dependsOn: [],
  },
];

function mockLlm(reply: string): LlmPort {
  return {
    complete: () => Promise.resolve(ok<LlmTurn>({ kind: "text", text: reply })),
  };
}

describe("writeReasons", () => {
  it("one reason per change", async () => {
    const llm = mockLlm(
      JSON.stringify({
        "ch-1": "Ajustar ventana de cosecha para evitar sobremaduración.",
        "ch-2": "Agregar sensor de temperatura para monitoreo de fruta.",
      }),
    );

    const result = await writeReasons(llm, SAMPLE_CHANGES, { domain: "agronomía" });

    expect(result).toHaveLength(2);
    expect(result[0]?.reason).toBe("Ajustar ventana de cosecha para evitar sobremaduración.");
    expect(result[1]?.reason).toBe("Agregar sensor de temperatura para monitoreo de fruta.");
  });

  it("falls back when llm output is malformed", async () => {
    const llm = mockLlm("esto no es un json valido ni estructurado");

    const result = await writeReasons(llm, SAMPLE_CHANGES);

    expect(result).toHaveLength(2);
    expect(result[0]?.reason).toContain("harvest.window");
    expect(result[0]?.reason).toContain("4 → 2");
    expect(result[1]?.reason).toContain("sensor.temp");
  });

  it("reasons never include tool or flow instructions", async () => {
    const llm = mockLlm(
      JSON.stringify({
        "ch-1": "Llamar a flows.set_param con horas 2 para aplicar cambios.",
        "ch-2": "Agregar nodo sensor.temp según las instrucciones.",
      }),
    );

    const result = await writeReasons(llm, SAMPLE_CHANGES);

    expect(result).toHaveLength(2);
    // Because it contained "flows.set_param", it must fall back to the safe deterministic description
    expect(result[0]?.reason).not.toContain("flows.set_param");
    expect(result[0]?.reason).toContain("harvest.window");
  });
});

describe("buildProposal", () => {
  it("builds a pending proposal with cards", async () => {
    const mcp = createFakeMcp();
    const draftRes = await mcp.call("flows.create_draft", {}, IDENTITY);
    if (!draftRes.ok) throw new Error("Failed draft");
    const draftId = String((draftRes.value as Record<string, unknown>)["draftId"]);

    // Add a node and change a parameter
    await mcp.call("flows.add_node", { draftId, type: "data.source", nodeId: "src" }, IDENTITY);

    const llm = mockLlm(
      JSON.stringify({
        "add_node:src": "Fuente de datos de cosecha para la cámara de frío.",
      }),
    );

    const outcome = await buildProposal({
      mcp,
      llm,
      identity: IDENTITY,
      draftId,
      flowId: "flow-harvest",
    });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok || !outcome.value) return;
    expect(outcome.value.proposal.status).toBe("pending");
    expect(outcome.value.proposal.version).toBe(1);
    expect(outcome.value.proposal.flowId).toBe("flow-harvest");
    expect(outcome.value.cards.length).toBeGreaterThan(0);
  });

  it("empty diff yields no proposal", async () => {
    const mcp = createFakeMcp();
    const draftRes = await mcp.call("flows.create_draft", {}, IDENTITY);
    if (!draftRes.ok) throw new Error("Failed draft");
    const draftId = String((draftRes.value as Record<string, unknown>)["draftId"]);

    const llm = mockLlm("{}");

    const outcome = await buildProposal({
      mcp,
      llm,
      identity: IDENTITY,
      draftId,
      flowId: "flow-empty",
    });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.value).toBeNull();
  });
});
