import { parse } from "@nodomics/protocol";
import { expect, it } from "vitest";
import { ComponentCard } from "../src/contracts/component-card.ts";
import { DomainCard } from "../src/contracts/domain-card.ts";

it("accepts a domain card with no comparison values or unit", () => {
  const card = { changeId: "change-1", title: "Harvest window", reason: "Match the schedule" };

  expect(parse(DomainCard, card)).toEqual({ ok: true, value: card });
});

const COMPONENT = {
  id: "flow_cosecha_fresa_v2",
  kind: "flow",
  name: "Calculadora de cosecha (fresa)",
  summary: "Estima la temperatura de la fruta al ingresar a cámara según la hora de cosecha",
  inputs: [{ name: "toneladas", type: "value", unit: "t" }],
  outputs: [{ name: "temperatura_fruta", type: "value", unit: "°C" }],
  params: [{ id: "ventana_cosecha", title: "Ventana de cosecha", value: 2, unit: "h" }],
  process: "Toma la temperatura ambiente por hora y aplica el modelo de calentamiento de la fruta",
  connections: [{ from: "clima.temperatura", to: "modelo.ambiente" }],
  assumptions: ["La fruta entra a la temperatura ambiente de la hora de cosecha"],
  context: { domain: "agronomía", crop: "fresa", region: "Zamora, Michoacán" },
  lineage: { parent: "flow_cosecha_arandano_v1", author: "camila", adapted_by: "valeria" },
  history: [{ at: "2026-11-22T11:40:00Z", by: "valeria", change: "ventana_cosecha 4 → 2 h" }],
};

it("accepts the component card from the specification", () => {
  expect(parse(ComponentCard, COMPONENT)).toEqual({ ok: true, value: COMPONENT });
});

it("rejects malformed component history", () => {
  const result = parse(ComponentCard, { ...COMPONENT, history: [{ at: 42 }] });

  expect(result.ok ? [] : result.error.map(({ path }) => path)).toContain("/history/0/at");
});
