import { CHART_AXIS_MESSAGES } from "./chart-axis-messages.ts";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export function prepareChartAxes(encoding: unknown): unknown {
  if (!isRecord(encoding)) return encoding;
  return Object.fromEntries(
    Object.entries(encoding).map(([channel, definition]) => [
      channel,
      channel === "x" || channel === "y" ? prepareAxis(channel, definition) : definition,
    ]),
  );
}

function prepareAxis(channel: string, definition: unknown): unknown {
  if (!isRecord(definition)) return definition;
  return {
    ...definition,
    title: "title" in definition ? definition["title"] : axisTitle(definition),
    ...(channel === "x" && definition["axis"] !== null
      ? {
          axis: {
            ...(isRecord(definition["axis"]) ? definition["axis"] : {}),
            labelAngle: 0,
            labelLimit: { expr: "width / max(1, length(domain('x')))" },
            labelOverlap: true,
          },
        }
      : {}),
  };
}

function axisTitle(definition: Record<string, unknown>) {
  const field = definition["field"];
  const aggregate = definition["aggregate"];
  if (typeof field !== "string") return undefined;
  return typeof aggregate === "string" && CHART_AXIS_MESSAGES[aggregate] !== undefined
    ? `${CHART_AXIS_MESSAGES[aggregate]} ${field}`
    : field;
}
