"""Arrow IPC stream format, the way results move between executors."""

import pyarrow as pa
from pyarrow import ipc

from nodomics_engine.result import Err, Ok, Result


def write_ipc(table: pa.Table) -> bytes:
    sink = pa.BufferOutputStream()
    with ipc.new_stream(sink, table.schema) as writer:
        writer.write_table(table)
    return sink.getvalue().to_pybytes()


def read_ipc(data: bytes) -> Result[pa.Table, str]:
    try:
        return Ok(ipc.open_stream(data).read_all())
    except pa.ArrowInvalid as failure:
        return Err(f"Not an Arrow IPC stream: {failure}")
