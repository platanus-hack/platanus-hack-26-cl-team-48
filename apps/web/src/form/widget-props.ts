import type { ComponentType } from "react";
import type { FormField, Widget } from "./form-fields.ts";

export type ParamFieldProps = {
  readonly field: FormField;
  readonly value: unknown;
  readonly nodeId: string;
  readonly error?: string | undefined;
  readonly canExpose?: boolean;
  readonly onChange: (value: unknown) => void;
};

export type WidgetProps<K extends Widget["kind"] = Widget["kind"]> = {
  readonly field: FormField;
  readonly widget: Extract<Widget, { kind: K }>;
  readonly value: unknown;
  readonly nodeId: string;
  readonly onChange: (value: unknown) => void;
  /** Renders nested fields; passed in so composite widgets do not import the field back. */
  readonly FieldView: ComponentType<ParamFieldProps>;
};

/** Empty text means "not set", so required parameters are reported as missing by the engine. */
export const textOrUnset = (text: string): string | undefined => (text === "" ? undefined : text);

export const asText = (value: unknown): string =>
  typeof value === "string" || typeof value === "number" ? String(value) : "";

export const asTextList = (value: unknown): ReadonlyArray<string> =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
