from pathlib import Path

import duckdb
import pyarrow as pa
import pytest

from nodomics_engine.result import Err, Ok
from nodomics_engine.source_loading import load_source

CSV = b"city,amount\nlima,10\nquito,20\n"


def parquet_bytes(directory: Path) -> bytes:
    path = directory / "amounts.parquet"
    with duckdb.connect() as connection:
        connection.sql("SELECT * FROM range(3) AS t(amount)").write_parquet(str(path))
    return path.read_bytes()


def test_loads_csv_from_bytes():
    table = load_source("csv", {"kind": "bytes", "bytes": CSV})

    assert isinstance(table, Ok)
    assert table.value.to_pydict() == {"city": ["lima", "quito"], "amount": [10, 20]}


def test_loads_parquet_from_bytes(tmp_path: Path):
    table = load_source("parquet", {"kind": "bytes", "bytes": parquet_bytes(tmp_path)})

    assert isinstance(table, Ok)
    assert table.value.num_rows == 3


def test_loads_json_arrays_from_a_local_path(tmp_path: Path):
    path = tmp_path / "rows.json"
    path.write_text('[{"a": 1}, {"a": 2}]')

    table = load_source("json", {"kind": "path", "path": str(path)})

    assert isinstance(table, Ok)
    assert table.value.to_pydict() == {"a": [1, 2]}


def test_loads_from_a_url(tmp_path: Path):
    path = tmp_path / "data.csv"
    path.write_bytes(CSV)

    table = load_source("csv", {"kind": "url", "url": path.as_uri()}, fetch=lambda url: CSV)

    assert isinstance(table, Ok)
    assert table.value.num_rows == 2


def test_reports_missing_paths_as_source_unavailable(tmp_path: Path):
    table = load_source("parquet", {"kind": "path", "path": str(tmp_path / "missing.parquet")})

    assert isinstance(table, Err)
    assert table.error["code"] == "SOURCE_UNAVAILABLE"


def test_reports_failed_downloads_as_source_unavailable():
    def failing_fetch(url: str) -> bytes:
        raise OSError("connection refused")

    table = load_source("csv", {"kind": "url", "url": "http://x"}, fetch=failing_fetch)

    assert isinstance(table, Err)
    assert table.error["code"] == "SOURCE_UNAVAILABLE"


def test_reports_malformed_contents_as_source_unreadable():
    table = load_source("parquet", {"kind": "bytes", "bytes": b"not parquet"})

    assert isinstance(table, Err)
    assert table.error["code"] == "SOURCE_UNREADABLE"


@pytest.mark.parametrize(
    ("data", "expected"),
    [
        (b"id\tname\r\n1\tana\r\n", {"id": [1], "name": ["ana"]}),
        (b"id;name\n1;ana\n", {"id": [1], "name": ["ana"]}),
        (b"id|name\n1|ana\n", {"id": [1], "name": ["ana"]}),
        (b"id,name\n1,ana\n", {"id": [1], "name": ["ana"]}),
        (b"id;label\tname\n1\tana\n", {"id;label": [1], "name": ["ana"]}),
        (b'hello\n42\nwith, "quotes"\n\n', {"texto": ["hello", "42", 'with, "quotes"', ""]}),
        (b"42\n007", {"texto": ["42", "007"]}),
        (b"hello\r\n42\r\n", {"texto": ["hello", "42"]}),
        (b"", {"texto": []}),
        (b"\n", {"texto": [""]}),
    ],
)
def test_loads_txt_with_header_delimiters_or_text_lines(
    data: bytes, expected: dict[str, list[str | int]]
):
    table = load_source("txt", {"kind": "bytes", "bytes": data})

    assert isinstance(table, Ok)
    assert table.value.to_pydict() == expected
    if "texto" in expected:
        assert table.value.schema == pa.schema({"texto": pa.string()})
