import { classNames } from "./class-names.ts";
import { ColumnTypeIcon } from "./ColumnTypeIcon.tsx";
import { EngineBadge } from "./EngineBadge.tsx";
import { formatNumber } from "./format-number.ts";
import { describeCell } from "./grid-cell.ts";
import { ICON_SIZE, Icon } from "./Icon.tsx";
import { MESSAGES } from "./messages.ts";
import type { ColumnType, Engine } from "./types.ts";

type SortDirection = "asc" | "desc";
type RowDiff = "added" | "removed";

export type GridColumn = {
  readonly name: string;
  readonly type: ColumnType;
  readonly pinned?: boolean;
  readonly sorted?: SortDirection;
};

export type GridRow =
  ReadonlyArray<unknown> | { readonly cells: ReadonlyArray<unknown>; readonly __diff?: RowDiff };

export type DataGridProps = {
  readonly columns: ReadonlyArray<GridColumn>;
  readonly rows: ReadonlyArray<GridRow>;
  readonly total?: number;
  readonly selectedRow?: number;
  readonly density?: "comfortable" | "compact";
  /** `inline`: one-line headers and no footer, for a panel that already shows the row count. */
  readonly variant?: "full" | "inline";
  readonly engine?: Engine;
  readonly offset?: number;
  readonly onRowSelect?: ((index: number) => void) | undefined;
};

const ARIA_SORT: Record<SortDirection, "ascending" | "descending"> = {
  asc: "ascending",
  desc: "descending",
};
const DIFF_MARKS: Record<RowDiff, string> = {
  added: MESSAGES.dataGrid.added,
  removed: MESSAGES.dataGrid.removed,
};

export function DataGrid(props: DataGridProps) {
  const isInline = props.variant === "inline";
  return (
    <div
      className={classNames(
        "nd-grid",
        props.density === "compact" && "nd-grid-compact",
        isInline && "nd-grid-inline",
      )}
    >
      <div className="nd-grid-scroll">
        <table>
          <GridHead columns={props.columns} isInline={isInline} />
          <tbody>
            {props.rows.map((row, index) => (
              // Rows are a page of a result: their position is their identity.
              <GridRowView key={index} grid={props} row={row} index={index} />
            ))}
          </tbody>
        </table>
      </div>
      {!isInline && <GridFooter {...props} />}
    </div>
  );
}

function GridHead({
  columns,
  isInline,
}: {
  readonly columns: ReadonlyArray<GridColumn>;
  readonly isInline: boolean;
}) {
  return (
    <thead>
      <tr>
        <th className="nd-grid-idx" scope="col">
          {MESSAGES.dataGrid.rowNumber}
        </th>
        {columns.map((column) => (
          <th
            key={column.name}
            scope="col"
            className={columnClassName(column)}
            aria-sort={column.sorted === undefined ? undefined : ARIA_SORT[column.sorted]}
          >
            {isInline ? <InlineHeader column={column} /> : <StackedHeader column={column} />}
          </th>
        ))}
      </tr>
    </thead>
  );
}

function StackedHeader({ column }: { readonly column: GridColumn }) {
  return (
    <div className="nd-th">
      <span className="nd-th-name">{column.name}</span>
      <span className="nd-th-type">
        <ColumnTypeIcon type={column.type} />
        {MESSAGES.columnTypes[column.type].toLowerCase()}
        {column.sorted !== undefined && <SortIcon direction={column.sorted} />}
      </span>
    </div>
  );
}

function InlineHeader({ column }: { readonly column: GridColumn }) {
  return (
    <span className="nd-th-inline">
      <ColumnTypeIcon type={column.type} />
      <span className="nd-th-inline-name" title={column.name}>
        {column.name}
      </span>
      {column.sorted !== undefined && <SortIcon direction={column.sorted} />}
    </span>
  );
}

function SortIcon({ direction }: { readonly direction: SortDirection }) {
  return (
    <Icon
      name="chevron-down"
      size={ICON_SIZE.xs}
      className={direction === "asc" ? "nd-sort-asc" : undefined}
    />
  );
}

type GridRowViewProps = {
  readonly grid: DataGridProps;
  readonly row: GridRow;
  readonly index: number;
};

function GridRowView({ grid, row, index }: GridRowViewProps) {
  const isSelected = grid.selectedRow === index;
  const { cells, diff } = splitRow(row);
  return (
    <tr
      className={classNames(isSelected && "nd-row-sel", diff && `nd-row-${diff}`)}
      aria-selected={grid.onRowSelect === undefined ? undefined : isSelected}
      tabIndex={grid.onRowSelect === undefined ? undefined : 0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          grid.onRowSelect?.(index);
        }
      }}
      onClick={() => grid.onRowSelect?.(index)}
    >
      <td className="nd-grid-idx">
        {diff === undefined ? (grid.offset ?? 0) + index + 1 : DIFF_MARKS[diff]}
      </td>
      {grid.columns.map((column, columnIndex) => (
        <td key={column.name} className={columnClassName(column)}>
          <GridCell value={cells[columnIndex]} type={column.type} />
        </td>
      ))}
    </tr>
  );
}

function GridCell({ value, type }: { readonly value: unknown; readonly type: ColumnType }) {
  const content = describeCell(value, type);
  switch (content.kind) {
    case "null":
      return <span className="nd-null">{MESSAGES.dataGrid.nullValue}</span>;
    case "error":
      return (
        <span className="nd-cellerr" title={content.message}>
          <Icon name="circle-alert" size={ICON_SIZE.xs} />
          {content.text}
        </span>
      );
    case "text":
      return content.text;
  }
}

function GridFooter({ columns, rows, total, engine }: DataGridProps) {
  const text = MESSAGES.dataGrid;
  return (
    <div className="nd-grid-foot">
      <span>
        {text.showing} <b>{formatNumber(rows.length)}</b> {text.of}{" "}
        <b>{formatNumber(total ?? rows.length)}</b>{" "}
        {text.rowsAndColumns(formatNumber(columns.length))}
      </span>
      {engine !== undefined && <EngineBadge engine={engine} />}
    </div>
  );
}

function splitRow(row: GridRow): {
  readonly cells: ReadonlyArray<unknown>;
  readonly diff: RowDiff | undefined;
} {
  return isPlainRow(row) ? { cells: row, diff: undefined } : { cells: row.cells, diff: row.__diff };
}

function isPlainRow(row: GridRow): row is ReadonlyArray<unknown> {
  return Array.isArray(row);
}

function columnClassName(column: GridColumn): string {
  return classNames(column.type === "number" && "nd-num", column.pinned === true && "nd-pinned");
}
