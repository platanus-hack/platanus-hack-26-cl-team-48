import type { KeyboardEvent } from "react";
import { classNames } from "./class-names.ts";
import { isOffered, offeredColumnNames, toggleColumn } from "./column-selection.ts";
import { ColumnTypeIcon } from "./ColumnTypeIcon.tsx";
import { useFieldControl } from "./field-context.ts";
import { ICON_SIZE, ICON_STROKE, Icon } from "./Icon.tsx";
import { Input } from "./Input.tsx";
import { MESSAGES } from "./messages.ts";
import type { ColumnType } from "./types.ts";

export type ColumnOption = {
  readonly name: string;
  readonly type: ColumnType;
  readonly hint?: string;
};

export type ColumnSelectProps = {
  readonly columns: ReadonlyArray<ColumnOption>;
  readonly value?: ReadonlyArray<string>;
  readonly multiple?: boolean;
  readonly filterType?: ReadonlyArray<ColumnType>;
  readonly open?: boolean;
  readonly placeholder?: string;
  readonly invalid?: boolean;
  readonly search?: string;
  readonly onToggle?: (() => void) | undefined;
  readonly onChange?: ((value: ReadonlyArray<string>) => void) | undefined;
  readonly onSearchChange?: ((search: string) => void) | undefined;
};

export function ColumnSelect(props: ColumnSelectProps) {
  return (
    <div className="nd-colsel">
      <ColumnSelectTrigger {...props} />
      {props.open === true && <ColumnList {...props} />}
    </div>
  );
}

function ColumnSelectTrigger({
  columns,
  value = [],
  multiple = false,
  open = false,
  placeholder = MESSAGES.columnSelect.placeholder,
  invalid,
  onToggle,
}: ColumnSelectProps) {
  const { id, isInvalid } = useFieldControl(invalid);
  return (
    <button
      id={id}
      type="button"
      className={classNames("nd-colsel-trigger", isInvalid && "nd-invalid")}
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-invalid={isInvalid || undefined}
      onClick={onToggle}
    >
      {value.length === 0 ? (
        <span className="nd-placeholder">{placeholder}</span>
      ) : (
        value.map((name) => (
          <span key={name} className="nd-chip">
            <ColumnTypeIcon type={columns.find((column) => column.name === name)?.type ?? "text"} />
            {name}
            {multiple && <Icon name="x" size={ICON_SIZE.xs} />}
          </span>
        ))
      )}
      <Icon name="chevron-down" size={ICON_SIZE.sm} className="nd-colsel-caret" />
    </button>
  );
}

function ColumnList({
  columns,
  value = [],
  multiple = false,
  filterType,
  search,
  onChange,
  onSearchChange,
}: ColumnSelectProps) {
  return (
    <div className="nd-pop nd-colsel-list">
      <div className="nd-colsel-search">
        <Input
          icon="search"
          size="sm"
          placeholder={MESSAGES.columnSelect.search}
          label={MESSAGES.columnSelect.search}
          value={search ?? ""}
          onChange={onSearchChange}
        />
      </div>
      {multiple && (
        <button
          type="button"
          className="nd-colsel-all"
          onClick={() => onChange?.(offeredColumnNames(columns, filterType))}
        >
          <span className="nd-check" />
          {MESSAGES.columnSelect.selectAll}
        </button>
      )}
      <div
        role="listbox"
        aria-label={MESSAGES.columnSelect.placeholder}
        aria-multiselectable={multiple}
        onKeyDown={moveOptionFocus}
      >
        {columns.map((column) => (
          <ColumnOptionRow
            key={column.name}
            column={column}
            isSelected={value.includes(column.name)}
            isDisabled={!isOffered(column, filterType)}
            multiple={multiple}
            onSelect={() => onChange?.(multiple ? toggleColumn(value, column.name) : [column.name])}
          />
        ))}
      </div>
    </div>
  );
}

type ColumnOptionRowProps = {
  readonly column: ColumnOption;
  readonly isSelected: boolean;
  readonly isDisabled: boolean;
  readonly multiple: boolean;
  readonly onSelect: () => void;
};

function ColumnOptionRow({
  column,
  isSelected,
  isDisabled,
  multiple,
  onSelect,
}: ColumnOptionRowProps) {
  return (
    <button
      type="button"
      role="option"
      disabled={isDisabled}
      aria-selected={isSelected}
      aria-disabled={isDisabled || undefined}
      className={classNames("nd-colsel-opt", isSelected && "nd-on", isDisabled && "nd-dis")}
      onClick={isDisabled ? undefined : onSelect}
    >
      {multiple && (
        <span className={classNames("nd-check", isSelected && "nd-on")}>
          {isSelected && <Icon name="check" size={ICON_SIZE.xs} strokeWidth={ICON_STROKE.heavy} />}
        </span>
      )}
      <ColumnTypeIcon type={column.type} />
      <span className="nd-colsel-name">{column.name}</span>
      {column.hint !== undefined && <span className="nd-colsel-hint">{column.hint}</span>}
      {!multiple && isSelected && <Icon name="check" size={ICON_SIZE.sm} />}
    </button>
  );
}

function moveOptionFocus(event: KeyboardEvent<HTMLDivElement>): void {
  if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
  event.preventDefault();
  const options = Array.from(
    event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="option"]:not(:disabled)'),
  );
  const index = options.findIndex((option) => option === event.target);
  const direction = event.key === "ArrowDown" ? 1 : -1;
  options[(index + direction + options.length) % options.length]?.focus();
}
