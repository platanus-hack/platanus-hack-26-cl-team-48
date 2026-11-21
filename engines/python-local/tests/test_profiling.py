import pyarrow as pa

from nodomics_engine.profiling import profile_table


def test_profiles_numeric_columns_with_mean_and_bins():
    table = pa.table({"amount": pa.array([1.0, 2.0, 2.0, None, 5.0])})

    [column] = profile_table(table)["columns"]

    assert column["name"] == "amount"
    assert column["type"] == "number"
    assert column["count"] == 5
    assert column["nulls"] == 1
    assert column["distinct"] == 3
    assert column.get("min") == "1.0"
    assert column.get("max") == "5.0"
    assert column.get("mean") == 2.5
    assert sum(column["bins"]) == 4


def test_profiles_text_columns_without_mean_or_bins():
    table = pa.table({"city": ["b", "a", "b"]})

    [column] = profile_table(table)["columns"]

    assert column == {
        "name": "city",
        "type": "text",
        "count": 3,
        "nulls": 0,
        "distinct": 2,
        "min": "a",
        "max": "b",
        "bins": [],
    }


def test_profiles_columns_with_only_nulls():
    table = pa.table({"empty": pa.array([None, None], pa.float64())})

    [column] = profile_table(table)["columns"]

    assert column == {
        "name": "empty",
        "type": "number",
        "count": 2,
        "nulls": 2,
        "distinct": 0,
        "bins": [],
    }
