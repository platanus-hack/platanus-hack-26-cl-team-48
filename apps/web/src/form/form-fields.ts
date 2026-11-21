import { ColumnType, parse, type NodeManifest } from "@nodomics/protocol";
import type { SelectOption } from "@nodomics/ui";
import { MESSAGES } from "../messages.ts";

export type Widget =
  | { readonly kind: "text" }
  | {
      readonly kind: "number";
      readonly isInteger: boolean;
      readonly minimum?: number;
      readonly maximum?: number;
    }
  | { readonly kind: "switch" }
  | { readonly kind: "enum"; readonly options: ReadonlyArray<SelectOption> }
  | {
      readonly kind: "column";
      readonly port: string;
      /** The column types the param accepts; any type when absent (ADR 0013). */
      readonly types?: ReadonlyArray<ColumnType>;
    }
  | { readonly kind: "column-list"; readonly port: string }
  | { readonly kind: "key-values" }
  | { readonly kind: "source" }
  | { readonly kind: "code"; readonly language?: string }
  | { readonly kind: "object-list"; readonly fields: ReadonlyArray<FormField> }
  /** The columns a node declares for an output port (ADR 0014), edited as a list. */
  | {
      readonly kind: "port-schema";
      readonly port: string;
      readonly fields: ReadonlyArray<FormField>;
    }
  | { readonly kind: "node-params" }
  | { readonly kind: "unsupported" };

export type FormField = {
  readonly name: string;
  readonly label: string;
  readonly isRequired: boolean;
  readonly defaultValue: unknown;
  readonly widget: Widget;
  /** The param applies only while the column chosen in `param` has one of `types`. */
  readonly condition?: FieldCondition;
};

export type FieldCondition = { readonly param: string; readonly types: ReadonlyArray<ColumnType> };

/** The value of the option that leaves a param without value; the param is then saved as `null`. */
export const NO_VALUE = "";

type ObjectSchema = Pick<NodeManifest["params"], "properties" | "required">;
type JsonObject = Readonly<Record<string, unknown>>;

const UNSUPPORTED: Widget = { kind: "unsupported" };
const DEFAULT_PORT = "in";

/** Widgets declared with the `x-nodomics` keyword, by name. */
const NODOMICS_WIDGETS: Readonly<
  Record<string, (hint: JsonObject, property: JsonObject) => Widget>
> = {
  ports: (_hint, property) => arrayWidget(property["items"]),
  "node-params": () => ({ kind: "node-params" }),
  column: (hint) => {
    const types = columnTypesOf(hint["types"]);
    return {
      kind: "column",
      port: stringOr(hint["of"], DEFAULT_PORT),
      ...(types === undefined ? {} : { types }),
    };
  },
  switch: () => ({ kind: "switch" }),
  source: () => ({ kind: "source" }),
  "key-values": () => ({ kind: "key-values" }),
  code: (hint) =>
    typeof hint["language"] === "string"
      ? { kind: "code", language: hint["language"] }
      : { kind: "code" },
};

/** Widgets for plain JSON Schema types, by type name. */
const TYPE_WIDGETS: Readonly<Record<string, (schema: JsonObject) => Widget>> = {
  string: () => ({ kind: "text" }),
  number: (schema) => numberWidget(schema, false),
  integer: (schema) => numberWidget(schema, true),
  boolean: () => ({ kind: "switch" }),
  array: (schema) => arrayWidget(schema["items"]),
};

/** The form of a node, generated from the JSON Schema of its parameters. */
export function describeFormFields(schema: ObjectSchema): FormField[] {
  return Object.entries(schema.properties).map(([name, property]) => {
    const isRequired = schema.required?.includes(name) ?? false;
    const defaultValue = isObject(property) ? property["default"] : undefined;
    const condition = conditionOf(property);
    return {
      name,
      label: isObject(property) ? stringOr(property["title"], name) : name,
      isRequired,
      defaultValue,
      widget: withNoValueOption(chooseWidget(property), isRequired || defaultValue !== undefined),
      ...(condition === undefined ? {} : { condition }),
    };
  });
}

function chooseWidget(property: unknown): Widget {
  if (!isObject(property)) return UNSUPPORTED;
  const hint = property["x-nodomics"];
  if (isObject(hint) && hint["widget"] === "port-schema") return portSchemaWidget(property, hint);
  if (isObject(hint) && typeof hint["widget"] === "string")
    return NODOMICS_WIDGETS[hint["widget"]]?.(hint, property) ?? UNSUPPORTED;
  const options = property["enum"];
  if (Array.isArray(options)) return { kind: "enum", options: options.map(String) };
  const constants = property["oneOf"];
  if (Array.isArray(constants)) return { kind: "enum", options: constants.map(toTitledOption) };
  return TYPE_WIDGETS[stringOr(property["type"], "")]?.(property) ?? UNSUPPORTED;
}

/** A `oneOf` entry like `{ "const": "yearmonth", "title": "Mes" }`, the JSON Schema way to label values. */
function toTitledOption(constant: unknown): SelectOption {
  if (!isObject(constant)) return String(constant);
  const value = constantText(constant["const"]);
  return { value, label: stringOr(constant["title"], value) };
}

const constantText = (constant: unknown): string => {
  if (constant === null) return NO_VALUE;
  if (typeof constant === "string") return constant;
  return typeof constant === "number" || typeof constant === "boolean"
    ? String(constant)
    : JSON.stringify(constant);
};

/** An optional select without default can be left without value; one with a default only by its own `null` constant. */
function withNoValueOption(widget: Widget, mustHaveValue: boolean): Widget {
  if (widget.kind !== "enum" || mustHaveValue || widget.options.some(isNoValue)) return widget;
  return {
    ...widget,
    options: [{ value: NO_VALUE, label: MESSAGES.params.noValue }, ...widget.options],
  };
}

const isNoValue = (option: SelectOption) =>
  (typeof option === "string" ? option : option.value) === NO_VALUE;

function portSchemaWidget(property: JsonObject, hint: JsonObject): Widget {
  const list = arrayWidget(property["items"]);
  return list.kind === "object-list" && typeof hint["port"] === "string"
    ? { kind: "port-schema", port: hint["port"], fields: list.fields }
    : UNSUPPORTED;
}

function conditionOf(property: unknown): FieldCondition | undefined {
  const hint = isObject(property) ? property["x-nodomics"] : undefined;
  const when = isObject(hint) ? hint["when"] : undefined;
  if (!isObject(when) || typeof when["param"] !== "string") return undefined;
  return { param: when["param"], types: columnTypesOf(when["types"]) ?? [] };
}

const columnTypesOf = (value: unknown): ReadonlyArray<ColumnType> | undefined =>
  Array.isArray(value)
    ? value.flatMap((type) => {
        const parsed = parse(ColumnType, type);
        return parsed.ok ? [parsed.value] : [];
      })
    : undefined;

function arrayWidget(items: unknown): Widget {
  const itemWidget = chooseWidget(items);
  if (itemWidget.kind === "column") return { kind: "column-list", port: itemWidget.port };
  if (isObject(items) && items["type"] === "object" && isObject(items["properties"]))
    return {
      kind: "object-list",
      fields: describeFormFields({
        properties: items["properties"],
        required: Array.isArray(items["required"]) ? items["required"].map(String) : [],
      }),
    };
  return UNSUPPORTED;
}

function numberWidget(schema: JsonObject, isInteger: boolean): Widget {
  const { minimum, maximum } = schema;
  return {
    kind: "number",
    isInteger,
    ...(typeof minimum === "number" ? { minimum } : {}),
    ...(typeof maximum === "number" ? { maximum } : {}),
  };
}

const isObject = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const stringOr = (value: unknown, fallback: string) =>
  typeof value === "string" ? value : fallback;
