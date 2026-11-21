import { Field, Button, type FieldProps } from "@nodomics/ui";
import { createElement } from "react";
import type { ParamFieldProps } from "./widget-props.ts";
import { useExposedParam } from "./use-exposed-param.ts";
import { MESSAGES } from "../messages.ts";
import { widgetFor } from "./widget-registry.ts";

type Exposure = ReturnType<typeof useExposedParam>;
export function ParamField(props: ParamFieldProps) {
  const exposure = useExposedParam(props.nodeId, props.field);
  return (
    <Field {...presentation(props, exposure)}>
      {props.canExpose === true && exposure.canExpose && <ExposureButton exposure={exposure} />}
      {renderWidget(props)}
    </Field>
  );
}

function presentation(props: ParamFieldProps, exposure: Exposure): Omit<FieldProps, "children"> {
  return {
    label: props.field.label,
    optional: !props.field.isRequired,
    exposed: props.canExpose === true && exposure.exposed !== undefined,
    ...(props.canExpose === true && exposure.exposed !== undefined
      ? { linkedVar: exposure.exposed.title }
      : {}),
    ...(props.error === undefined ? {} : { error: props.error }),
  };
}

function ExposureButton({ exposure }: { readonly exposure: Exposure }) {
  return (
    <Button size="sm" onClick={exposure.toggle}>
      {exposure.exposed === undefined ? MESSAGES.flowNodes.expose : MESSAGES.flowNodes.unexpose}
    </Button>
  );
}

function renderWidget({ field, value, nodeId, onChange }: ParamFieldProps) {
  return createElement(widgetFor(field.widget), {
    field,
    widget: field.widget,
    value,
    nodeId,
    onChange,
    FieldView: ParamField,
  });
}
