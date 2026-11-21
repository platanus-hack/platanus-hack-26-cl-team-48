import type { Column, ColumnType } from "@nodomics/protocol";
import { Button, ColumnSelect, type ColumnOption } from "@nodomics/ui";
import { useState } from "react";
import { useColumns } from "../../engine/use-columns.ts";
import { toUiColumnType } from "../../engine/ui-types.ts";
import { MESSAGES } from "../../messages.ts";
import { asText, asTextList, type WidgetProps } from "../widget-props.ts";

export function ColumnWidget({ field, widget, value, nodeId, onChange }: WidgetProps<"column">) {
  const selected = asText(value);
  return (
    <div className="web-column-field">
      <ColumnPicker
        nodeId={nodeId}
        port={widget.port}
        types={widget.types}
        value={selected === "" ? [] : [selected]}
        isMultiple={false}
        onChange={(names) => {
          onChange(names.at(0));
        }}
      />
      {!field.isRequired && selected !== "" && (
        <Button
          variant="ghost"
          size="sm"
          icon="x"
          label={MESSAGES.params.clearColumn(field.label)}
          onClick={() => {
            onChange(null);
          }}
        />
      )}
    </div>
  );
}

export function ColumnListWidget({ widget, value, nodeId, onChange }: WidgetProps<"column-list">) {
  return (
    <ColumnPicker
      nodeId={nodeId}
      port={widget.port}
      value={asTextList(value)}
      isMultiple
      onChange={(names) => {
        onChange([...names]);
      }}
    />
  );
}

type ColumnPickerProps = {
  readonly nodeId: string;
  readonly port: string;
  readonly types?: ReadonlyArray<ColumnType> | undefined;
  readonly value: ReadonlyArray<string>;
  readonly isMultiple: boolean;
  readonly onChange: (names: ReadonlyArray<string>) => void;
};

function ColumnPicker({ nodeId, port, types, value, isMultiple, onChange }: ColumnPickerProps) {
  const [isOpen, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const columns = useColumns(nodeId, port);
  return (
    <ColumnSelect
      columns={toColumnOptions(columns, search, types)}
      {...(types === undefined ? {} : { filterType: types.map(toUiColumnType) })}
      value={value}
      multiple={isMultiple}
      open={isOpen}
      search={search}
      {...(columns.length === 0 ? { placeholder: MESSAGES.params.noColumns } : {})}
      onToggle={() => {
        setOpen(!isOpen);
      }}
      onSearchChange={setSearch}
      onChange={(names) => {
        onChange(names);
        if (!isMultiple) setOpen(false);
      }}
    />
  );
}

/** The columns matching the search, those of an accepted type first. */
const toColumnOptions = (
  columns: ReadonlyArray<Column>,
  search: string,
  types: ReadonlyArray<ColumnType> | undefined,
): ColumnOption[] =>
  columns
    .filter((column) => column.name.toLowerCase().includes(search.toLowerCase()))
    .toSorted((a, b) => Number(!isAccepted(a, types)) - Number(!isAccepted(b, types)))
    .map((column) => ({ name: column.name, type: toUiColumnType(column.type) }));

const isAccepted = (column: Column, types: ReadonlyArray<ColumnType> | undefined) =>
  types === undefined || types.includes(column.type);
