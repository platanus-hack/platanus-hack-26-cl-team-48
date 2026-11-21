"""Holds the Arrow tables and the figures an executor produced, addressed by id."""

import uuid
from collections.abc import Callable, Iterable

import pyarrow as pa

from nodomics_engine.column_types import describe_columns
from nodomics_engine.figure_capture import Figure
from nodomics_engine.protocol_types import DisplayRef, ResultRef


def _random_id() -> str:
    return uuid.uuid4().hex


class ResultStore:
    def __init__(self, new_id: Callable[[], str] = _random_id) -> None:
        self._new_id = new_id
        self._tables: dict[str, pa.Table] = {}
        self._figures: dict[str, bytes] = {}

    def put(self, table: pa.Table) -> ResultRef:
        result_id = self._new_id()
        self._tables[result_id] = table
        return {
            "id": result_id,
            "rowCount": table.num_rows,
            "schema": describe_columns(table.schema),
        }

    def get(self, result_id: str) -> pa.Table | None:
        return self._tables.get(result_id)

    def put_figure(self, figure: Figure) -> DisplayRef:
        display_id = self._new_id()
        self._figures[display_id] = figure.png
        display: DisplayRef = {
            "id": display_id,
            "mime": "image/png",
            "width": figure.width,
            "height": figure.height,
        }
        return {**display, "title": figure.title} if figure.title else display

    def get_figure(self, display_id: str) -> bytes | None:
        return self._figures.get(display_id)

    def drop(self, ids: Iterable[str]) -> None:
        for held_id in ids:
            self._tables.pop(held_id, None)
            self._figures.pop(held_id, None)
