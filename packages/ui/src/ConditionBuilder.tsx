import { Button } from "./Button.tsx";
import { ColumnSelect } from "./ColumnSelect.tsx";
import { Input } from "./Input.tsx";
import { MESSAGES } from "./messages.ts";
import { Select, type SelectOption } from "./Select.tsx";
import type { ColumnType } from "./types.ts";

type Join = "Y" | "O";

export type FilterCondition = {
  readonly column: string;
  readonly op: string;
  readonly value: string;
  readonly invalid?: boolean;
};

export type ConditionBuilderProps = {
  readonly columns: ReadonlyArray<{ readonly name: string; readonly type: ColumnType }>;
  readonly conditions: ReadonlyArray<FilterCondition>;
  readonly join?: Join;
  readonly operators?: ReadonlyArray<SelectOption>;
  readonly openColumnIndex?: number;
  readonly onColumnListToggle?: ((index: number) => void) | undefined;
  readonly onConditionChange?: ((index: number, condition: FilterCondition) => void) | undefined;
  readonly onJoinToggle?: (() => void) | undefined;
  readonly onRemoveCondition?: ((index: number) => void) | undefined;
  readonly onAddCondition?: (() => void) | undefined;
  readonly onAddGroup?: (() => void) | undefined;
};

export function ConditionBuilder(props: ConditionBuilderProps) {
  const text = MESSAGES.conditionBuilder;
  return (
    <div className="nd-cond">
      {props.conditions.map((condition, index) => (
        <ConditionRow
          // Conditions have no identity of their own: their position is what the callbacks report.
          key={index}
          builder={props}
          condition={condition}
          index={index}
        />
      ))}
      <div className="nd-cond-add">
        <Button variant="ghost" size="sm" icon="plus" onClick={props.onAddCondition}>
          {text.addCondition}
        </Button>
        <Button variant="ghost" size="sm" icon="plus" onClick={props.onAddGroup}>
          {text.addGroup}
        </Button>
      </div>
    </div>
  );
}

type ConditionRowProps = {
  readonly builder: ConditionBuilderProps;
  readonly condition: FilterCondition;
  readonly index: number;
};

function ConditionRow({ builder, condition, index }: ConditionRowProps) {
  const text = MESSAGES.conditionBuilder;
  const change = (update: Partial<FilterCondition>) =>
    builder.onConditionChange?.(index, { ...condition, ...update });
  return (
    <div className="nd-cond-row">
      <span className="nd-cond-join">
        {index === 0 ? (
          text.where
        ) : (
          <button type="button" className="nd-cond-toggle" onClick={builder.onJoinToggle}>
            {text.joins[builder.join ?? "Y"]}
          </button>
        )}
      </span>
      <ColumnSelect
        columns={builder.columns}
        value={[condition.column]}
        open={builder.openColumnIndex === index}
        onToggle={() => builder.onColumnListToggle?.(index)}
        onChange={([column]) => {
          if (column !== undefined) change({ column });
        }}
      />
      <Select
        options={builder.operators ?? [condition.op]}
        value={condition.op}
        size="sm"
        label={text.operator}
        onChange={(op) => change({ op })}
      />
      <Input
        value={condition.value}
        size="sm"
        label={text.value}
        invalid={condition.invalid === true}
        onChange={(value) => change({ value })}
      />
      <Button
        variant="ghost"
        size="sm"
        icon="x"
        label={text.removeCondition}
        onClick={() => builder.onRemoveCondition?.(index)}
      />
    </div>
  );
}
