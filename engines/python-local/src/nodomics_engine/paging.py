"""Reads one window of a stored table as JSON rows, optionally sorted."""

from typing import Literal

import pyarrow as pa

from nodomics_engine.column_types import describe_columns
from nodomics_engine.json_values import to_json_value
from nodomics_engine.protocol_types import DataPage, SortSpec
from nodomics_engine.result import Err, Ok, Result

ARROW_SORT_ORDER: dict[str, Literal["ascending", "descending"]] = {
    "asc": "ascending",
    "desc": "descending",
}


def read_page(
    table: pa.Table, offset: int, limit: int, sort: SortSpec | None
) -> Result[DataPage, str]:
    if sort is not None and sort["column"] not in table.column_names:
        return Err(f"Unknown sort column: {sort['column']}")
    window = _sorted(table, sort).slice(offset, limit)
    page: DataPage = {
        "columns": describe_columns(table.schema),
        "rows": _rows(window),
        "total": table.num_rows,
    }
    return Ok(page)


def _sorted(table: pa.Table, sort: SortSpec | None) -> pa.Table:
    if sort is None:
        return table
    return table.sort_by([(sort["column"], ARROW_SORT_ORDER[sort["direction"]])])  # pyright: ignore[reportUnknownMemberType]


def _rows(window: pa.Table) -> list[list[object]]:
    # Column by column, because to_pylist() on the table merges columns with repeated names.
    columns = [column.to_pylist() for column in window.columns]
    return [[to_json_value(value) for value in row] for row in zip(*columns, strict=True)]
