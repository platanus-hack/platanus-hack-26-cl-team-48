import { Button } from "@nodomics/ui";
import { useEngineState } from "../../app-context.ts";
import { MESSAGES } from "../../messages.ts";
import type { WidgetProps } from "../widget-props.ts";
import { ObjectListWidget } from "./ObjectListWidget.tsx";

/** The columns a node declares for an output (ADR 0014), copyable from its last result. */
export function PortSchemaWidget(props: WidgetProps<"port-schema">) {
  const { field, widget, nodeId, onChange } = props;
  const lastColumns = useEngineState((state) => state.results[nodeId]?.[widget.port]?.schema);
  return (
    <div role="group" aria-label={field.label} className="web-port-schema">
      <ObjectListWidget {...props} widget={{ kind: "object-list", fields: widget.fields }} />
      {lastColumns !== undefined && lastColumns.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          icon="copy"
          onClick={() => {
            onChange(lastColumns.map(({ name, type }) => ({ name, type })));
          }}
        >
          {MESSAGES.params.copyLastColumns}
        </Button>
      )}
    </div>
  );
}
