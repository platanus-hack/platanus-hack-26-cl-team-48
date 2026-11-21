import { Input, Select, Switch } from "@nodomics/ui";
import { MESSAGES } from "../../messages.ts";
import { NO_VALUE } from "../form-fields.ts";
import { asText, textOrUnset, type WidgetProps } from "../widget-props.ts";

export function TextWidget({ field, value, onChange }: WidgetProps<"text">) {
  return (
    <Input
      value={asText(value)}
      placeholder={asText(field.defaultValue)}
      onChange={(text) => {
        onChange(textOrUnset(text));
      }}
    />
  );
}

export function NumberWidget({ field, value, onChange }: WidgetProps<"number">) {
  return (
    <Input
      type="number"
      value={asText(value)}
      placeholder={asText(field.defaultValue)}
      onChange={(text) => {
        onChange(text === "" ? undefined : Number(text));
      }}
    />
  );
}

export function SwitchWidget({ value, onChange }: WidgetProps<"switch">) {
  return <Switch checked={value === true} onChange={onChange} />;
}

/** An unset select shows its default; the "no value" option saves `null` (ADR 0013). */
export function EnumWidget({ field, widget, value, onChange }: WidgetProps<"enum">) {
  return (
    <Select
      options={widget.options}
      value={value === null ? NO_VALUE : asText(value ?? field.defaultValue)}
      onChange={(chosen) => {
        onChange(chosen === NO_VALUE ? null : chosen);
      }}
    />
  );
}

export function UnsupportedWidget() {
  return <p className="web-panel-hint">{MESSAGES.params.unsupported}</p>;
}
