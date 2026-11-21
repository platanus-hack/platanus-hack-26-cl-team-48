"""Summarises each column of a stored table: nulls, distinct values, range, mean and histogram."""

import math
from typing import Any, TypedDict

import numpy as np
import pyarrow as pa
import pyarrow.compute as pc

from nodomics_engine.column_types import column_type
from nodomics_engine.json_values import to_json_value
from nodomics_engine.protocol_types import ColumnProfile, DataProfile

HISTOGRAM_BINS = 10

type Column = pa.ChunkedArray[Any]


def profile_table(table: pa.Table) -> DataProfile:
    return {
        "columns": [
            _profile_column(name, column)
            for name, column in zip(table.column_names, table.columns, strict=True)
        ]
    }


class _Range(TypedDict, total=False):
    min: str
    max: str


class _Mean(TypedDict, total=False):
    mean: float


def _profile_column(name: str, column: Column) -> ColumnProfile:
    kind = column_type(column.type)
    return {
        "name": name,
        "type": kind,
        "count": len(column),
        "nulls": column.null_count,
        "distinct": _count_distinct(column),
        "bins": _histogram(column) if kind == "number" else [],
        **(_range(column) if kind != "other" else _Range()),
        **(_mean(column) if kind == "number" else _Mean()),
    }


def _count_distinct(column: Column) -> int:
    return pc.count_distinct(column, mode="only_valid").as_py()  # pyright: ignore[reportUnknownMemberType]


def _range(column: Column) -> _Range:
    bounds = _Range()
    low: object = pc.min(column).as_py()
    high: object = pc.max(column).as_py()
    if low is not None:
        bounds["min"] = str(to_json_value(low))
    if high is not None:
        bounds["max"] = str(to_json_value(high))
    return bounds


def _mean(column: Column) -> _Mean:
    mean = _finite_number(pc.mean(column).as_py())
    return _Mean() if mean is None else _Mean(mean=mean)


def _finite_number(value: object) -> float | None:
    # The mean of an all-null column is None at runtime, although the stubs say otherwise.
    if isinstance(value, float | int) and math.isfinite(value):
        return float(value)
    return None


def _histogram(column: Column) -> list[float]:
    values = pc.cast(column.drop_null(), pa.float64()).to_numpy()  # pyright: ignore[reportUnknownMemberType]
    finite = values[np.isfinite(values)]
    if finite.size == 0:
        return []
    counts, _edges = np.histogram(finite, bins=HISTOGRAM_BINS)
    return [float(count) for count in counts]
