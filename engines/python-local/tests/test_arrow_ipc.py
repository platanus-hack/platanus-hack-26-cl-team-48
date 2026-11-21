import pyarrow as pa

from nodomics_engine.arrow_ipc import read_ipc, write_ipc
from nodomics_engine.result import Err, Ok


def test_round_trips_a_table_through_arrow_ipc():
    table = pa.table({"x": [1, 2], "y": ["a", "b"]})

    assert read_ipc(write_ipc(table)) == Ok(table)


def test_rejects_bytes_that_are_not_arrow_ipc():
    assert isinstance(read_ipc(b"not arrow"), Err)
