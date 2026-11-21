import type { ColumnProfile } from "@nodomics/protocol";
import { formatNumber } from "@nodomics/ui";
import { MESSAGES } from "../messages.ts";

export type ColumnSummary = {
  readonly name: string;
  readonly type: string;
  readonly summary: string;
};

const RANGED_TYPES: ReadonlyArray<ColumnProfile["type"]> = ["number", "date"];

/** One line per column: its range when it has one, otherwise how varied it is. */
export function summarizeColumn(profile: ColumnProfile): ColumnSummary {
  return {
    name: profile.name,
    type: MESSAGES.preview.columnTypes[profile.type],
    summary: describeValues(profile),
  };
}

function describeValues({ type, min, max, distinct }: ColumnProfile): string {
  if (!RANGED_TYPES.includes(type) || min === undefined || max === undefined)
    return MESSAGES.preview.distinctValues(formatNumber(distinct));
  const format = type === "number" ? formatNumericText : (text: string) => text;
  return MESSAGES.preview.range(format(min), format(max));
}

function formatNumericText(text: string): string {
  const value = Number(text);
  return Number.isFinite(value) ? formatNumber(value) : text;
}
