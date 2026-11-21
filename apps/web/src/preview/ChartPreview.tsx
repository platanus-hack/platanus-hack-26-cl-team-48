import type { View } from "vega";
import type { EmbedOptions, VisualizationSpec } from "vega-embed";
import { useEffect, useRef, useState } from "react";
import { useEngineQuery } from "../engine/use-engine-query.ts";
import { MESSAGES } from "../messages.ts";
import "./chart-preview.css";
import { QueryStatus } from "./QueryStatus.tsx";

import { prepareChartAxes } from "./chart-axes.ts";
import { CHART_LOCALE } from "./chart-locale.ts";
import { ChartExport } from "./ChartExport.tsx";

/** Height of each band of a discrete vertical axis, the same as a compact grid row. */
export const DISCRETE_ROW_STEP = 24;
const DISCRETE_TYPES: ReadonlyArray<unknown> = ["nominal", "ordinal"];

type ChartPreviewProps = {
  readonly nodeId: string;
  /** Changes whenever the chart may have changed, so the view is asked for again. */
  readonly version: string | undefined;
  /** False where the chart is too small to also hold the export menu, such as inside a node. */
  readonly canExport?: boolean;
};

/** A view node drawn from the aggregated data the engine returns (`data.view`). */
export function ChartPreview({ nodeId, version, canExport = true }: ChartPreviewProps) {
  const view = useEngineQuery(
    version === undefined ? undefined : `view:${nodeId}:${version}`,
    (session) => session.view(nodeId),
  );
  if (view.status !== "ready") return <QueryStatus state={view} />;
  return (
    <>
      <VegaChart spec={view.value.spec} canExport={canExport} />
      {view.value.sampled && <p className="web-panel-hint">{MESSAGES.preview.sampled}</p>}
    </>
  );
}

function VegaChart({ spec, canExport }: { readonly spec: unknown; readonly canExport: boolean }) {
  const container = useRef<HTMLDivElement>(null);
  const [chartView, setChartView] = useState<View | undefined>(undefined);
  const [hasFailed, setFailed] = useState(false);
  useEffect(() => {
    const element = container.current;
    if (element === null || !isSpec(spec)) return;
    return mountChart({
      element,
      spec,
      onReady: setChartView,
      onFailure: () => {
        setFailed(true);
      },
    });
  }, [spec]);
  return (
    <>
      {hasFailed && <p role="status">{MESSAGES.preview.failed}</p>}
      {canExport && <ChartExport view={chartView} />}
      <div
        ref={container}
        className="web-chart web-interactive-chart"
        role="img"
        aria-label={MESSAGES.preview.tabs.chart}
      />
    </>
  );
}

type ChartLifecycle = {
  isCurrent: boolean;
  generation: number;
  finalize: () => void;
  resize: () => void;
};

type ChartRequest = {
  readonly element: HTMLDivElement;
  readonly spec: VisualizationSpec;
  readonly onFailure: () => void;
  readonly onReady: (view: View | undefined) => void;
};

function mountChart(request: ChartRequest) {
  const chart: ChartLifecycle = { isCurrent: true, generation: 0, finalize: noop, resize: noop };
  const fail = () => {
    if (chart.isCurrent) request.onFailure();
  };
  const draw = () => {
    void drawChart(request, chart, fail).catch(fail);
  };
  const resize = new ResizeObserver(() => {
    chart.resize();
  });
  const theme = new MutationObserver(draw);
  const colorScheme = matchMedia("(prefers-color-scheme: dark)");
  resize.observe(request.element);
  theme.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme", "class", "style"],
  });
  colorScheme.addEventListener("change", draw);
  draw();
  return () => {
    chart.isCurrent = false;
    request.onReady(undefined);
    resize.disconnect();
    theme.disconnect();
    colorScheme.removeEventListener("change", draw);
    chart.finalize();
  };
}

async function drawChart(request: ChartRequest, chart: ChartLifecycle, fail: () => void) {
  const generation = ++chart.generation;
  // Loaded on demand: Vega is large and only view nodes need it.
  const { default: embed } = await import("vega-embed");
  if (!chart.isCurrent || generation !== chart.generation) return;
  request.onReady(undefined);
  chart.finalize();
  const prepared = prepareChartSpec(request.spec);
  if (!isSpec(prepared)) return;
  const result = await embed(request.element, prepared, {
    renderer: "svg",
    defaultStyle: false,
    actions: false,
    config: themeFromTokens(request.element),
    // Copies: vega-embed types these as plain records, which Vega's locale interfaces are not.
    formatLocale: { ...CHART_LOCALE.formatLocale },
    timeFormatLocale: { ...CHART_LOCALE.timeFormatLocale },
  });
  request.element.setAttribute("role", "img");
  retainChart(chart, {
    generation,
    result,
    fail,
    element: request.element,
    onReady: request.onReady,
  });
}

function retainChart(
  chart: ChartLifecycle,
  rendered: {
    readonly element: HTMLElement;
    readonly generation: number;
    readonly result: Awaited<ReturnType<typeof import("vega-embed").default>>;
    readonly fail: () => void;
    readonly onReady: (view: View) => void;
  },
) {
  if (!chart.isCurrent || rendered.generation !== chart.generation) {
    rendered.result.finalize();
    return;
  }
  chart.finalize = rendered.result.finalize;
  rendered.onReady(rendered.result.view);
  const sizing = { isStepHeight: hasDiscreteRows(rendered.result.spec) };
  chart.resize = () => {
    void resizeChart(rendered.result.view, rendered.element, sizing).catch(rendered.fail);
  };
}

const noop = () => undefined;

// data.view carries a Vega-Lite spec by contract; vega-embed validates it when compiling.
const isSpec = (spec: unknown): spec is VisualizationSpec =>
  typeof spec === "object" && spec !== null && !Array.isArray(spec);

/** Vega needs literal colors and fonts, so they are read from the design system's tokens. */
export function themeFromTokens(
  element: Element,
): Exclude<NonNullable<EmbedOptions["config"]>, string> {
  const styles = getComputedStyle(element);
  const token = (name: string) => styles.getPropertyValue(name).trim();
  return {
    background: "transparent",
    font: token("--font-sans"),
    mark: { color: token("--accent") },
    bar: { fill: token("--accent") },
    text: { fill: token("--ink") },
    range: {
      category: ["--accent", "--type-chart", "--type-table", "--type-geo", "--type-model"].map(
        token,
      ),
    },
    legend: { labelColor: token("--ink-muted"), titleColor: token("--ink") },
    axis: {
      labelColor: token("--ink-muted"),
      titleColor: token("--ink"),
      gridColor: token("--line-subtle"),
      domainColor: token("--line"),
      tickColor: token("--line"),
    },
    view: { stroke: "transparent" },
  };
}

export function prepareChartSpec(spec: unknown): unknown {
  if (!isRecord(spec)) return spec;
  return {
    ...spec,
    description:
      spec["description"] ??
      (typeof spec["title"] === "string" ? spec["title"] : MESSAGES.preview.tabs.chart),
    ...(spec["encoding"] === undefined ? {} : { encoding: prepareChartAxes(spec["encoding"]) }),
    ...fitToContainer(hasDiscreteRows(spec)),
    ...(spec["mark"] === undefined ? {} : { mark: withTooltip(spec["mark"]) }),
  };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Discrete rows (a table, horizontal bars) keep a readable height and the panel scrolls. */
function fitToContainer(isStepHeight: boolean) {
  return isStepHeight
    ? {
        width: "container",
        height: { step: DISCRETE_ROW_STEP },
        autosize: { type: "fit-x", contains: "padding" },
      }
    : { width: "container", height: "container", autosize: { type: "fit", contains: "padding" } };
}

function hasDiscreteRows(spec: unknown): boolean {
  const y = isRecord(spec) && isRecord(spec["encoding"]) ? spec["encoding"]["y"] : undefined;
  return isRecord(y) && DISCRETE_TYPES.includes(y["type"]);
}

function withTooltip(mark: unknown) {
  return typeof mark === "string"
    ? { type: mark, tooltip: true }
    : isRecord(mark)
      ? { ...mark, tooltip: true }
      : mark;
}

export async function resizeChart(
  view: View,
  element: HTMLElement,
  { isStepHeight = false }: { readonly isStepHeight?: boolean } = {},
) {
  const resized = view.width(element.clientWidth);
  await (isStepHeight ? resized : resized.height(element.clientHeight)).resize().runAsync();
}
