import { Column, parse, type DataType, type NodeManifest, type PortSpec } from "@nodomics/protocol";
import { isRecord } from "./is-record.ts";

/** Issues are path suffixes (`: message`, `.port: message`) that callers prefix with their path. */
type ValueCheck = (value: unknown) => string[];

const caseFormatMissing =
  (type: DataType): ValueCheck =>
  () => [`: no case format for ${type} ports yet`];

const isChartSpec: ValueCheck = (value) =>
  isRecord(value) ? [] : [": must be a Vega-Lite spec object"];

const PORT_VALUE_CHECKS: Record<DataType, ValueCheck> = {
  table: findTableIssues,
  chart: isChartSpec,
  column: caseFormatMissing("column"),
  value: caseFormatMissing("value"),
  geo: caseFormatMissing("geo"),
  image: caseFormatMissing("image"),
  model: caseFormatMissing("model"),
  any: caseFormatMissing("any"),
};

/** Checks the shape of a node's `cases.json`: params, input tables and expected port values. */
export function findCaseIssues(manifest: NodeManifest, file: unknown): string[] {
  const cases = isRecord(file) ? file["cases"] : undefined;
  if (!isArray(cases) || cases.length === 0) return ["cases: needs at least one case"];
  return cases.flatMap((testCase, index) =>
    prefix(`cases[${String(index)}]`, findIssuesInCase(manifest, testCase)),
  );
}

function findIssuesInCase(manifest: NodeManifest, testCase: unknown): string[] {
  if (!isRecord(testCase)) return [": must be an object"];
  return [
    ...prefix(".name", findNameIssues(testCase["name"])),
    ...prefix(".params", findParamIssues(manifest, testCase["params"])),
    ...prefix(".inputs", findPortValueIssues(manifest.inputs, testCase["inputs"])),
    ...prefix(".sources", findSourceIssues(testCase["sources"])),
    ...prefix(".responses", findResponseIssues(testCase["responses"])),
    ...prefix(".expected", findPortValueIssues(manifest.outputs, testCase["expected"])),
  ];
}

const findNameIssues = (name: unknown) =>
  typeof name === "string" && name.length > 0 ? [] : [": must be a non-empty string"];

function findParamIssues(manifest: NodeManifest, params: unknown): string[] {
  if (!isRecord(params)) return [": must be an object"];
  return findRequiredParamIssues(manifest.params, params);
}

function findRequiredParamIssues(schema: unknown, params: Record<string, unknown>): string[] {
  if (!isRecord(schema)) return [];
  const required = schema["required"];
  const alternatives = schema["oneOf"];
  return [
    ...(isArray(required) ? required : [])
      .filter((name) => typeof name === "string" && !Object.hasOwn(params, name))
      .map((name) => `: missing required param "${String(name)}"`),
    ...(isArray(alternatives) &&
    alternatives.filter((alternative) => findRequiredParamIssues(alternative, params).length === 0)
      .length !== 1
      ? [": must match exactly one required params alternative"]
      : []),
  ];
}

function findPortValueIssues(ports: readonly PortSpec[], values: unknown): string[] {
  if (!isRecord(values)) return [": must be an object"];
  if (!matchesPorts(ports, Object.keys(values))) {
    return [`: expected ports [${idsOf(ports)}], got [${Object.keys(values).join(", ")}]`];
  }
  return ports
    .filter((port) => port.id in values)
    .flatMap((port) => prefix(`.${port.id}`, PORT_VALUE_CHECKS[port.type](values[port.id])));
}

const matchesPorts = (ports: readonly PortSpec[], keys: readonly string[]) =>
  keys.every((key) => ports.some((port) => port.id === key)) &&
  ports.every((port) => port.optional === true || keys.includes(port.id));

function findSourceIssues(sources: unknown): string[] {
  if (sources === undefined) return [];
  if (!isRecord(sources)) return [": must be an object"];
  return Object.entries(sources).flatMap(([id, table]) => prefix(`.${id}`, findTableIssues(table)));
}

function findTableIssues(table: unknown): string[] {
  const columns = isRecord(table) ? table["columns"] : undefined;
  const rows = isRecord(table) ? table["rows"] : undefined;
  if (!isArray(columns) || !isArray(rows)) return [": must have columns and rows arrays"];
  return [
    ...columns.flatMap((column, index) =>
      parse(Column, column).ok ? [] : [`: columns[${String(index)}] is not a column`],
    ),
    ...rows.flatMap((row, index) =>
      isArray(row) && row.length === columns.length
        ? []
        : [`: rows[${String(index)}] must have ${String(columns.length)} values`],
    ),
  ];
}

const prefix = (path: string, issues: readonly string[]) => issues.map((issue) => path + issue);

const idsOf = (ports: readonly PortSpec[]) => ports.map((port) => port.id).join(", ");

const isArray = (value: unknown): value is readonly unknown[] => Array.isArray(value);

function findResponseIssues(responses: unknown): string[] {
  if (responses === undefined) return [];
  if (!isRecord(responses)) return [": must be an object"];
  return Object.entries(responses).flatMap(([url, response]) =>
    prefix(`.${url}`, findResponseValueIssues(response)),
  );
}

function findResponseValueIssues(response: unknown): string[] {
  if (!isRecord(response) || !Object.hasOwn(response, "body")) return [": must have a body"];
  return response["status"] === undefined ||
    (typeof response["status"] === "number" && Number.isInteger(response["status"]))
    ? []
    : [".status: must be an integer"];
}
