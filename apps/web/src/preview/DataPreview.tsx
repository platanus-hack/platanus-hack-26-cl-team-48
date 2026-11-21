import type { ResultRef, SortSpec } from "@nodomics/protocol";
import { Button, DataGrid, Select } from "@nodomics/ui";
import { useState } from "react";
import { createPortal } from "react-dom";
import { useEngineQuery } from "../engine/use-engine-query.ts";
import { MESSAGES } from "../messages.ts";
import { QueryStatus } from "./QueryStatus.tsx";
import { nextPage, PAGE_SIZE, toGridColumns } from "./preview-model.ts";

const NO_SORT = "";
type Direction = SortSpec["direction"];

type DataPreviewProps = {
  readonly resultRef: ResultRef;
  /** Where the sort and page controls go, e.g. the panel's header; inline when absent. */
  readonly controlsTarget?: HTMLElement | null;
};

/** One page at a time of a result that lives in the engine. */
export function DataPreview({ resultRef, controlsTarget }: DataPreviewProps) {
  const [offset, setOffset] = useState(0);
  const [sort, setSort] = useState<SortSpec | undefined>(undefined);
  const page = useEngineQuery(
    `${resultRef.id}:${String(offset)}:${sort?.column ?? NO_SORT}:${sort?.direction ?? NO_SORT}`,
    (session) =>
      session.page(resultRef.id, {
        offset,
        limit: PAGE_SIZE,
        ...(sort === undefined ? {} : { sort }),
      }),
  );
  const changeSort = (next: SortSpec | undefined) => {
    setSort(next);
    setOffset(0);
  };
  const controls = (
    <DataControls
      resultRef={resultRef}
      sort={sort}
      offset={offset}
      onSort={changeSort}
      onPage={setOffset}
    />
  );
  return (
    <>
      {controlsTarget === undefined || controlsTarget === null
        ? controls
        : createPortal(controls, controlsTarget)}
      {page.status === "ready" ? (
        <DataGrid
          variant="inline"
          columns={toGridColumns(page.value.columns, sort)}
          rows={page.value.rows}
          offset={offset}
          total={page.value.total}
        />
      ) : (
        <QueryStatus state={page} />
      )}
    </>
  );
}

type DataControlsProps = {
  readonly resultRef: ResultRef;
  readonly sort: SortSpec | undefined;
  readonly offset: number;
  readonly onSort: (sort: SortSpec | undefined) => void;
  readonly onPage: (offset: number) => void;
};

function DataControls({ resultRef, sort, offset, onSort, onPage }: DataControlsProps) {
  const position = { offset, total: resultRef.rowCount };
  return (
    <div className="web-preview-controls">
      <SortControls resultRef={resultRef} sort={sort} onChange={onSort} />
      <div className="web-preview-pages">
        <Button
          variant="ghost"
          disabled={offset === 0}
          onClick={() => {
            onPage(nextPage(position, -1));
          }}
        >
          {MESSAGES.preview.previous}
        </Button>
        <Button
          variant="ghost"
          disabled={offset + PAGE_SIZE >= resultRef.rowCount}
          onClick={() => {
            onPage(nextPage(position, 1));
          }}
        >
          {MESSAGES.preview.next}
        </Button>
      </div>
    </div>
  );
}

type SortControlsProps = {
  readonly resultRef: ResultRef;
  readonly sort: SortSpec | undefined;
  readonly onChange: (sort: SortSpec | undefined) => void;
};

function SortControls({ resultRef, sort, onChange }: SortControlsProps) {
  const direction: Direction = sort?.direction ?? "asc";
  return (
    <>
      <Select
        label={MESSAGES.preview.sortBy}
        options={[
          { value: NO_SORT, label: MESSAGES.preview.noSort },
          ...resultRef.schema.map((column) => column.name),
        ]}
        value={sort?.column ?? NO_SORT}
        onChange={(column) => {
          onChange(column === NO_SORT ? undefined : { column, direction });
        }}
      />
      {sort !== undefined && (
        <Select
          label={MESSAGES.preview.direction}
          options={[
            { value: "asc", label: MESSAGES.preview.ascending },
            { value: "desc", label: MESSAGES.preview.descending },
          ]}
          value={direction}
          onChange={(next) => {
            onChange({ column: sort.column, direction: next === "desc" ? "desc" : "asc" });
          }}
        />
      )}
    </>
  );
}
