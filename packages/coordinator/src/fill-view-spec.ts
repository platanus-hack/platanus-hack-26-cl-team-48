import type { Column, ColumnType } from "@nodomics/protocol";

type Params = Readonly<Record<string, unknown>>;
type Row = Readonly<Record<string, unknown>>;

/** The data a view draws: its rows and the columns they have. */
export type ViewData = {
  readonly rows: ReadonlyArray<Row>;
  readonly columns: ReadonlyArray<Column>;
};

type Scope = { readonly params: Params; readonly columns: ReadonlyArray<Column> };

const WHOLE_PLACEHOLDER = /^\{\{\s*(?:(vegaType)\s+)?([\w.-]+)\s*\}\}$/;
const INNER_PLACEHOLDER = /\{\{\s*([\w.-]+)\s*\}\}/g;
const ANY_PLACEHOLDER = /\{\{[^}]*\}\}/;

/** Marks a value that uses a param without value, so the property holding it is left out. */
const OMITTED = Symbol("omitted");
type Filled = unknown;

const VEGA_TYPES: Readonly<Record<ColumnType, string>> = {
  date: "temporal",
  number: "quantitative",
  text: "nominal",
  bool: "nominal",
  geo: "nominal",
  other: "nominal",
};

/**
 * Fills a view spec (Vega-Lite) with the node params and the rows to draw. A string that is exactly
 * `{{param}}` becomes the param value with its own type, `{{vegaType param}}` the Vega-Lite type of
 * the column the param names, and placeholders inside longer text become text. A property that
 * uses a param without value is left out, and so is an object that loses all such properties.
 */
export const fillViewSpec = (
  spec: unknown,
  params: Params,
  data: ViewData,
): Readonly<Record<string, unknown>> => ({
  ...asRecord(fillPlaceholders(spec, { params, columns: data.columns })),
  data: { values: data.rows },
});

function fillPlaceholders(value: unknown, scope: Scope): Filled {
  if (typeof value === "string") return fillText(value, scope);
  if (Array.isArray(value))
    return value.map((item) => fillPlaceholders(item, scope)).filter((item) => item !== OMITTED);
  if (value === null || typeof value !== "object") return value;
  return fillObject(Object.entries(value), scope);
}

// An object goes away when the params written directly in it all lacked a value and only plain
// values remain, as `{ "field": "{{series}}", "type": "nominal" }` without a series.
function fillObject(entries: ReadonlyArray<[string, unknown]>, scope: Scope): Filled {
  const filled = entries.map(([key, entry]) => [key, fillPlaceholders(entry, scope)] as const);
  const kept = filled.filter(([, entry]) => entry !== OMITTED);
  const ownParams = entries.filter(
    ([, entry]) => typeof entry === "string" && hasPlaceholder(entry),
  );
  const keptParams = ownParams.filter(([key]) => kept.some(([name]) => name === key));
  const keepsOnlyScalars = kept.every(([, entry]) => entry === null || typeof entry !== "object");
  return ownParams.length > 0 && keptParams.length === 0 && keepsOnlyScalars
    ? OMITTED
    : Object.fromEntries(kept);
}

function fillText(text: string, { params, columns }: Scope): Filled {
  const whole = WHOLE_PLACEHOLDER.exec(text);
  if (whole !== null) {
    const [, helper, name = ""] = whole;
    const value = params[name];
    if (value === undefined) return OMITTED;
    return helper === undefined ? value : vegaTypeOf(columns, value);
  }
  const names = [...text.matchAll(INNER_PLACEHOLDER)].map(([, name = ""]) => name);
  if (names.some((name) => params[name] === undefined)) return OMITTED;
  return text.replace(INNER_PLACEHOLDER, (_, name: string) => textOf(params[name]));
}

const vegaTypeOf = (columns: ReadonlyArray<Column>, name: unknown): string => {
  const type = columns.find((column) => column.name === name)?.type;
  return type === undefined ? VEGA_TYPES.other : VEGA_TYPES[type];
};

const hasPlaceholder = (value: unknown): boolean => {
  if (typeof value === "string") return ANY_PLACEHOLDER.test(value);
  if (Array.isArray(value)) return value.some(hasPlaceholder);
  return value !== null && typeof value === "object" && Object.values(value).some(hasPlaceholder);
};

const textOf = (value: unknown): string =>
  typeof value === "string" ? value : JSON.stringify(value);

const asRecord = (value: Filled): Readonly<Record<string, unknown>> =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value))
    : {};
