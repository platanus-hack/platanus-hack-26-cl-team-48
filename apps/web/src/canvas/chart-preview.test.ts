import { View, parse } from "vega";
import { compile, type TopLevelSpec } from "vega-lite";
import { describe, expect, it } from "vitest";
import {
  DISCRETE_ROW_STEP,
  prepareChartSpec,
  resizeChart,
  themeFromTokens,
} from "../preview/ChartPreview.tsx";

describe("chart presentation", () => {
  it("enables values on hover and fits the available panel", () => {
    expect(prepareChartSpec({ mark: "bar", data: { values: [] } })).toMatchObject({
      width: "container",
      height: "container",
      autosize: { type: "fit", contains: "padding" },
      mark: { type: "bar", tooltip: true },
    });
  });

  it("updates the Vega dimensions when the panel resizes without a window resize", async () => {
    const element = document.createElement("div");
    Object.defineProperties(element, { clientWidth: { value: 320 }, clientHeight: { value: 240 } });
    const view = new View(parse({ width: 20, height: 20 }), { renderer: "none" }).initialize();

    await resizeChart(view, element);

    expect(view.width()).toBe(320);
    expect(view.height()).toBe(240);
    view.finalize();
  });

  it("preserves mark properties and explicit tooltips", () => {
    expect(
      prepareChartSpec({
        mark: { type: "bar", opacity: 0.5 },
        encoding: { tooltip: { field: "total" } },
      }),
    ).toMatchObject({
      mark: { type: "bar", opacity: 0.5, tooltip: true },
      encoding: { tooltip: { field: "total" } },
    });
  });

  it("reads the current theme tokens for marks, axes and categorical colors", () => {
    const element = document.createElement("div");
    document.body.append(element);
    element.style.setProperty("--accent", "royalblue");
    element.style.setProperty("--ink", "navy");
    element.style.setProperty("--type-chart", "teal");

    expect(themeFromTokens(element)).toMatchObject({
      bar: { fill: "royalblue" },
      axis: { titleColor: "navy" },
    });
    expect(themeFromTokens(element).range?.category).toContain("teal");
    expect(themeFromTokens(element)).toMatchObject({ text: { fill: "navy" } });
    element.style.setProperty("--accent", "skyblue");
    expect(themeFromTokens(element)).toMatchObject({ mark: { color: "skyblue" } });
    element.remove();
  });
});

it.each([
  [{ mark: "bar" }, "Gráfico"],
  [{ mark: "bar", title: "Ventas por región" }, "Ventas por región"],
  [{ mark: "bar", description: "Total por región" }, "Total por región"],
])("prepares an accessible chart name while preserving its description", (spec, name) => {
  expect(prepareChartSpec(spec)).toMatchObject({ description: name });
});

it("translates aggregate axis titles and keeps category labels horizontal and limited", () => {
  expect(
    prepareChartSpec({
      mark: "bar",
      encoding: {
        x: { field: "region", type: "nominal" },
        y: { field: "total", type: "quantitative", aggregate: "sum" },
      },
    }),
  ).toMatchObject({
    encoding: {
      x: {
        field: "region",
        title: "region",
        axis: {
          labelAngle: 0,
          labelLimit: { expr: "width / max(1, length(domain('x')))" },
          labelOverlap: true,
        },
      },
      y: { field: "total", aggregate: "sum", title: "Suma de total" },
    },
  });
});

it.each([
  ["mean", "Promedio de total"],
  ["count", "Recuento de total"],
  ["min", "Mínimo de total"],
  ["max", "Máximo de total"],
  ["median", "Mediana de total"],
])("translates the %s aggregation", (aggregate, title) => {
  expect(prepareChartSpec({ encoding: { y: { field: "total", aggregate } } })).toMatchObject({
    encoding: { y: { title } },
  });
});

it("preserves explicit axis titles and disabled axes", () => {
  expect(
    prepareChartSpec({
      encoding: {
        x: { field: "region", axis: null },
        y: { field: "total", aggregate: "sum", title: "Ventas", axis: { grid: false } },
      },
    }),
  ).toMatchObject({
    encoding: { x: { axis: null }, y: { title: "Ventas", axis: { grid: false } } },
  });
});

it("renders localized axes and responsive label limits through Vega", async () => {
  const spec = prepareChartSpec({
    mark: "bar",
    data: {
      values: [
        { region: "Centro", total: 12 },
        { region: "Norte", total: 20 },
      ],
    },
    encoding: {
      x: { field: "region", type: "nominal" },
      y: { field: "total", type: "quantitative", aggregate: "sum" },
    },
  });
  // The external compiler validates the unknown presentation spec at this boundary.
  const view = new View(parse(compile(spec as TopLevelSpec).spec), {
    renderer: "none",
  }).initialize();

  await view.width(600).height(300).runAsync();
  const svg = await view.toSVG();

  expect(svg).toContain("Suma de total");
  expect(svg).toContain("Centro");
  expect(svg).not.toContain("rotate(270)");
  view.finalize();
});

it("preserves an explicitly suppressed axis title", () => {
  expect(
    prepareChartSpec({ encoding: { y: { field: "total", aggregate: "sum", title: null } } }),
  ).toMatchObject({ encoding: { y: { title: null } } });
});

it("gives every row of a discrete vertical axis its own height instead of squeezing it", () => {
  expect(
    prepareChartSpec({
      mark: "text",
      encoding: { y: { field: "fila", type: "ordinal", axis: null }, text: { field: "valor" } },
    }),
  ).toMatchObject({
    width: "container",
    height: { step: DISCRETE_ROW_STEP },
    autosize: { type: "fit-x", contains: "padding" },
  });
});

it("keeps the height of a step-sized chart when the panel resizes", async () => {
  const element = document.createElement("div");
  Object.defineProperties(element, { clientWidth: { value: 320 }, clientHeight: { value: 90 } });
  const view = new View(parse({ width: 20, height: 400 }), { renderer: "none" }).initialize();

  await resizeChart(view, element, { isStepHeight: true });

  expect(view.width()).toBe(320);
  expect(view.height()).toBe(400);
  view.finalize();
});
