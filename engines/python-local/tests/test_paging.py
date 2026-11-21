import datetime
import decimal
import math

import pyarrow as pa

from nodomics_engine.paging import read_page
from nodomics_engine.result import Err, Ok

PEOPLE = pa.table({"name": ["ana", "bo", "cy"], "age": [30, 10, 20]})


def test_returns_the_requested_window_with_columns_and_total():
    page = read_page(PEOPLE, offset=1, limit=1, sort=None)

    assert page == Ok(
        {
            "columns": [{"name": "name", "type": "text"}, {"name": "age", "type": "number"}],
            "rows": [["bo", 10]],
            "total": 3,
        }
    )


def test_sorts_before_taking_the_window():
    page = read_page(PEOPLE, offset=0, limit=2, sort={"column": "age", "direction": "desc"})

    assert isinstance(page, Ok)
    assert page.value["rows"] == [["ana", 30], ["cy", 20]]


def test_rejects_sorting_by_an_unknown_column():
    page = read_page(PEOPLE, offset=0, limit=2, sort={"column": "nope", "direction": "asc"})

    assert isinstance(page, Err)


def test_turns_values_into_json_safe_ones():
    table = pa.table(
        {
            "day": [datetime.date(2026, 1, 2)],
            "moment": [datetime.datetime(2026, 1, 2, 3, 4, 5)],
            "price": pa.array([decimal.Decimal("1.50")], pa.decimal128(5, 2)),
            "ratio": [math.nan],
            "missing": pa.array([None], pa.int64()),
        }
    )

    page = read_page(table, offset=0, limit=1, sort=None)

    assert isinstance(page, Ok)
    assert page.value["rows"] == [["2026-01-02", "2026-01-02T03:04:05", 1.5, None, None]]


def test_keeps_columns_with_repeated_names():
    table = pa.Table.from_arrays([pa.array([1]), pa.array([2])], names=["a", "a"])

    page = read_page(table, offset=0, limit=1, sort=None)

    assert isinstance(page, Ok)
    assert page.value["rows"] == [[1, 2]]
