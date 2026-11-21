import { Button, Input } from "@nodomics/ui";
import { useCatalog, useFlowState } from "../../app-context.ts";
import { exposedParamsOf, type ExposedParam } from "../../library/flow-node.ts";
import { MESSAGES } from "../../messages.ts";
import { describeFormFields } from "../form-fields.ts";
import type { WidgetProps } from "../widget-props.ts";

type ExposureList = {
  readonly items: ReadonlyArray<ExposedParam>;
  readonly onChange: (value: unknown) => void;
};
export function NodeParamsWidget({ value, onChange }: WidgetProps<"node-params">) {
  const items = exposedParamsOf({ params: { params: value } });
  return (
    <div className="web-object-list">
      {items.map((item) => (
        <NodeParamRow key={item.id} item={item} items={items} onChange={onChange} />
      ))}
    </div>
  );
}

function NodeParamRow({ item, items, onChange }: ExposureList & { readonly item: ExposedParam }) {
  return (
    <div className="web-object-item">
      <ExposureTitle item={item} items={items} onChange={onChange} />
      <ExposureSource item={item} />
      <Button
        onClick={() => {
          onChange(items.filter((current) => current.id !== item.id));
        }}
      >
        {MESSAGES.params.removeItem}
      </Button>
    </div>
  );
}

function ExposureTitle({ item, items, onChange }: ExposureList & { readonly item: ExposedParam }) {
  return (
    <Input
      label={MESSAGES.flowNodes.parameterTitle}
      value={item.title}
      onChange={(title) => {
        onChange(items.map((current) => (current.id === item.id ? { ...item, title } : current)));
      }}
    />
  );
}

function ExposureSource({ item }: { readonly item: ExposedParam }) {
  const flow = useFlowState((state) => state.flow);
  const node = flow.nodes.find((node) => node.id === item.node);
  const manifest = useCatalog().find((manifest) => manifest.id === node?.type);
  return (
    <Input
      label={MESSAGES.flowNodes.parameterSource}
      value={`${node?.label ?? manifest?.name ?? item.node} › ${manifest === undefined ? item.param : (describeFormFields(manifest.params).find((field) => field.name === item.param)?.label ?? item.param)}`}
    />
  );
}
