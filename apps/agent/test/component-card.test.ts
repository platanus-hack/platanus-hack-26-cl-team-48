import { describe, expect, it } from "vitest";
import { Type } from "@sinclair/typebox";
import {
  buildComponentCard,
  cardToEmbeddingText,
  type ComponentCardInput,
} from "../src/memory/component-card.ts";
import type { Catalog } from "../src/mcp/fake-flow.ts";
import type { ComponentCard } from "../src/contracts/component-card.ts";

const CONTEXT = {
  domain: "agronomía",
  crop: "fresa",
  region: "Zamora, Michoacán",
};

const CATALOG: Catalog = {
  "calc.harvest": {
    type: "calc.harvest",
    title: "Harvest model",
    inputs: ["table"],
    outputs: ["table"],
    params: {
      harvest_window: {
        title: "Ventana de cosecha",
        unit: "h",
        schema: Type.Number(),
      },
    },
  },
};

const SAMPLE_CARD: ComponentCard = {
  id: "flow_cosecha_fresa_v2",
  kind: "flow",
  name: "Calculadora de cosecha (fresa)",
  summary: "Estima la temperatura de la fruta al ingresar a cámara",
  inputs: [{ name: "toneladas", type: "value", unit: "t" }],
  outputs: [{ name: "temperatura_fruta", type: "value", unit: "°C" }],
  params: [{ id: "harvest_window", title: "Ventana de cosecha", value: 2, unit: "h" }],
  process: "Aplica modelo de temperatura a fruta cosechada",
  connections: [{ from: "clima.temperatura", to: "modelo.ambiente" }],
  assumptions: ["La fruta entra a temperatura ambiente"],
  context: CONTEXT,
  lineage: {
    parent: "flow_cosecha_arandano_v1",
    author: "camila",
    adapted_by: "valeria",
  },
  history: [{ at: "2026-11-22T11:40:00Z", by: "valeria", change: "harvest_window 4 -> 2 h" }],
};

describe("buildComponentCard", () => {
  it("card lists inputs, outputs and params with units", () => {
    const input: ComponentCardInput = {
      flow: {
        id: "flow-1",
        name: "Flow 1",
        summary: "Summary 1",
        process: "Process 1",
        inputs: [{ name: "toneladas", type: "value", unit: "t" }],
        outputs: [{ name: "temperatura", type: "value", unit: "°C" }],
        nodes: {
          node1: {
            id: "node1",
            type: "calc.harvest",
            params: { harvest_window: 2 },
          },
        },
      },
      manifests: CATALOG,
      context: CONTEXT,
      history: [],
    };

    const result = buildComponentCard(input);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.inputs).toEqual([{ name: "toneladas", type: "value", unit: "t" }]);
    expect(result.value.outputs).toEqual([{ name: "temperatura", type: "value", unit: "°C" }]);
    expect(result.value.params).toEqual([
      { id: "harvest_window", title: "Ventana de cosecha", value: 2, unit: "h" },
    ]);
  });

  it("card lists connections as from/to", () => {
    const input: ComponentCardInput = {
      flow: {
        id: "flow-1",
        edges: [{ from: "clima.temperatura", to: "modelo.ambiente" }],
      },
      context: CONTEXT,
    };

    const result = buildComponentCard(input);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.connections).toEqual([
      { from: "clima.temperatura", to: "modelo.ambiente" },
    ]);
  });

  it("card includes lineage when flow has a parent", () => {
    const input: ComponentCardInput = {
      flow: {
        id: "flow-2",
        parent: "flow_cosecha_arandano_v1",
        author: "camila",
        adapted_by: "valeria",
      },
      context: CONTEXT,
    };

    const result = buildComponentCard(input);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.lineage).toEqual({
      parent: "flow_cosecha_arandano_v1",
      author: "camila",
      adapted_by: "valeria",
    });
  });

  it("invalid input yields CardError, never a partial card", () => {
    const invalidInput = {
      flow: {
        id: "flow-bad",
        inputs: [{ name: "bad", type: "not_a_valid_data_type", unit: "" }],
      },
      context: CONTEXT,
    } as unknown as ComponentCardInput;

    const result = buildComponentCard(invalidInput);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("INVALID_CARD");
  });
});

describe("cardToEmbeddingText", () => {
  it("embedding text is deterministic", () => {
    const text1 = cardToEmbeddingText(SAMPLE_CARD);
    const text2 = cardToEmbeddingText({
      ...SAMPLE_CARD,
      inputs: [{ name: "toneladas", type: "value", unit: "t" }],
      params: [{ id: "harvest_window", title: "Ventana de cosecha", value: 2, unit: "h" }],
    });

    expect(text1).toBe(text2);
    expect(text1).toContain("Calculadora de cosecha (fresa)");
  });

  it("embedding text includes params with units", () => {
    const text = cardToEmbeddingText(SAMPLE_CARD);

    expect(text).toContain("Ventana de cosecha: 2 h");
  });
});
