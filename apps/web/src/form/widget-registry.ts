import type { ComponentType } from "react";
import type { Widget } from "./form-fields.ts";
import type { WidgetProps } from "./widget-props.ts";
import { NodeParamsWidget } from "./widgets/NodeParamsWidget.tsx";
import { CodeWidget } from "./widgets/CodeWidget.tsx";
import { ColumnListWidget, ColumnWidget } from "./widgets/ColumnWidgets.tsx";
import { KeyValuesWidget } from "./widgets/KeyValuesWidget.tsx";
import { ObjectListWidget } from "./widgets/ObjectListWidget.tsx";
import { PortSchemaWidget } from "./widgets/PortSchemaWidget.tsx";
import {
  EnumWidget,
  NumberWidget,
  SwitchWidget,
  TextWidget,
  UnsupportedWidget,
} from "./widgets/ScalarWidgets.tsx";
import { SourceWidget } from "./widgets/SourceWidget.tsx";

/** One component per widget kind; a new widget is a new entry, not a new branch. */
const WIDGETS: { readonly [K in Widget["kind"]]: ComponentType<WidgetProps<K>> } = {
  "node-params": NodeParamsWidget,
  text: TextWidget,
  number: NumberWidget,
  switch: SwitchWidget,
  enum: EnumWidget,
  column: ColumnWidget,
  "column-list": ColumnListWidget,
  source: SourceWidget,
  code: CodeWidget,
  "key-values": KeyValuesWidget,
  "object-list": ObjectListWidget,
  "port-schema": PortSchemaWidget,
  unsupported: UnsupportedWidget,
};

export function widgetFor(widget: Widget): ComponentType<WidgetProps> {
  // The mapped table guarantees the component matches the widget's kind.
  return WIDGETS[widget.kind] as ComponentType<WidgetProps>;
}
