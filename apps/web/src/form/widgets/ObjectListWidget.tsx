import { Button } from "@nodomics/ui";
import { MESSAGES } from "../../messages.ts";
import type { FormField } from "../form-fields.ts";
import type { WidgetProps } from "../widget-props.ts";

type Item = Readonly<Record<string, unknown>>;

/** A list of objects (such as aggregations), each edited with its own nested fields. */
export function ObjectListWidget({
  widget,
  value,
  nodeId,
  onChange,
  FieldView,
}: WidgetProps<"object-list">) {
  const items = asItems(value);
  const replaceItem = (index: number, item: Item) => {
    onChange(items.map((current, position) => (position === index ? item : current)));
  };
  return (
    <div className="web-object-list">
      {items.map((item, index) => (
        // Items have no identity of their own; their position is their identity.
        <div key={index} className="web-object-item">
          {widget.fields.map((field) => (
            <FieldView
              key={field.name}
              field={field}
              value={item[field.name]}
              nodeId={nodeId}
              onChange={(fieldValue) => {
                replaceItem(index, withValue(item, field.name, fieldValue));
              }}
            />
          ))}
          <Button
            variant="ghost"
            size="sm"
            icon="trash-2"
            onClick={() => {
              onChange(items.filter((_, position) => position !== index));
            }}
          >
            {MESSAGES.params.removeItem}
          </Button>
        </div>
      ))}
      <Button
        size="sm"
        icon="plus"
        onClick={() => {
          onChange([...items, defaultItem(widget.fields)]);
        }}
      >
        {MESSAGES.params.addItem}
      </Button>
    </div>
  );
}

const isItem = (value: unknown): value is Item =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asItems = (value: unknown): ReadonlyArray<Item> =>
  Array.isArray(value) ? value.filter(isItem) : [];

const defaultItem = (fields: ReadonlyArray<FormField>): Item =>
  Object.fromEntries(
    fields.filter((field) => field.defaultValue !== undefined).map((f) => [f.name, f.defaultValue]),
  );

const withValue = (item: Item, name: string, value: unknown): Item =>
  value === undefined
    ? Object.fromEntries(Object.entries(item).filter(([key]) => key !== name))
    : { ...item, [name]: value };
