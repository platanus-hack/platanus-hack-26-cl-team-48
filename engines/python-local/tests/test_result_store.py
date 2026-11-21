import datetime

import pyarrow as pa

from nodomics_engine.result_store import ResultStore


def sequential_ids():
    counter = iter(range(1, 1000))
    return lambda: f"r{next(counter)}"


def test_puts_a_table_and_returns_its_reference():
    store = ResultStore(new_id=sequential_ids())

    ref = store.put(pa.table({"name": ["a", "b"], "amount": [1.5, 2.0]}))

    assert ref == {
        "id": "r1",
        "rowCount": 2,
        "schema": [{"name": "name", "type": "text"}, {"name": "amount", "type": "number"}],
    }


def test_returns_the_stored_table_by_id():
    store = ResultStore(new_id=sequential_ids())
    table = pa.table({"x": [1]})

    ref = store.put(table)

    assert store.get(ref["id"]) == table


def test_returns_none_for_unknown_ids():
    assert ResultStore().get("missing") is None


def test_forgets_dropped_results_and_ignores_unknown_ids():
    store = ResultStore()
    ref = store.put(pa.table({"x": [1]}))

    store.drop([ref["id"], "missing"])

    assert store.get(ref["id"]) is None


def test_maps_arrow_types_to_protocol_column_types():
    table = pa.table(
        {
            "int": pa.array([1], pa.int64()),
            "decimal": pa.array([1], pa.decimal128(10, 2)),
            "text": pa.array(["a"], pa.large_string()),
            "day": pa.array([datetime.date(2026, 1, 1)]),
            "moment": pa.array([datetime.datetime(2026, 1, 1)]),
            "flag": pa.array([True]),
            "blob": pa.array([b"x"]),
        }
    )

    ref = ResultStore().put(table)

    assert [column["type"] for column in ref["schema"]] == [
        "number",
        "number",
        "text",
        "date",
        "date",
        "bool",
        "other",
    ]
