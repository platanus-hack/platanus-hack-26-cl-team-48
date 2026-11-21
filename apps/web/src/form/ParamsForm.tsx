import type { ConfigIssue, FlowNode, NodeManifest } from "@nodomics/protocol";
import { useMemo } from "react";
import { useKnownInputColumns } from "../engine/use-columns.ts";
import { appliesTo, columnIssue } from "./column-checks.ts";
import { describeFormFields } from "./form-fields.ts";
import { ParamField } from "./ParamField.tsx";

export type ParamsFormProps = {
  readonly node: FlowNode;
  readonly manifest: NodeManifest;
  readonly issues: ReadonlyArray<ConfigIssue>;
  readonly onChange: (param: string, value: unknown) => void;
};

/** The form of a node, generated from its manifest's JSON Schema; never written by hand. */
export function ParamsForm({ node, manifest, issues, onChange }: ParamsFormProps) {
  const fields = useMemo(() => describeFormFields(manifest.params), [manifest.params]);
  const ports = useMemo(() => columnPortsOf(fields), [fields]);
  const columns = useKnownInputColumns(node.id, ports);
  return (
    <form
      className="web-form"
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      {fields
        .filter((field) => appliesTo(field.condition, { fields, params: node.params, columns }))
        .map((field) => (
          <ParamField
            key={field.name}
            canExpose
            field={field}
            value={node.params[field.name]}
            nodeId={node.id}
            error={
              issues.find((issue) => issue.param === field.name)?.message ??
              columnIssue(field, node.params[field.name], columns)
            }
            onChange={(value) => {
              onChange(field.name, value);
            }}
          />
        ))}
    </form>
  );
}

const columnPortsOf = (fields: ReturnType<typeof describeFormFields>): ReadonlyArray<string> => [
  ...new Set(
    fields.flatMap((field) => (field.widget.kind === "column" ? [field.widget.port] : [])),
  ),
];
