"""Runs a resolved Python task: defines its code and calls entry(inputs, params) with DataFrames."""

import contextlib
import traceback
from collections.abc import Callable, Generator
from typing import IO, Any, cast

import pandas as pd
import pyarrow as pa

from nodomics_engine.figure_capture import capturing_figures
from nodomics_engine.protocol_types import NodeError, PythonTask, TaskOutputs
from nodomics_engine.result import Err, Ok, Result
from nodomics_engine.task_context import TaskContext, TaskOutcome

CODE_FILENAME = "<node>"

type Tables = dict[str, pa.Table]


def run_python(task: PythonTask, context: TaskContext) -> TaskOutcome:
    tables = context.resolve_inputs(task["inputs"])
    if isinstance(tables, Err):
        return tables
    with context.python_lock, capturing_figures() as figures:
        outputs = _call_entry(task, _to_frames(tables.value), context.log)
    if isinstance(outputs, Err):
        return outputs
    return Ok(
        TaskOutputs(
            outputs={port: context.store.put(table) for port, table in outputs.value.items()},
            displays=[context.store.put_figure(figure) for figure in figures],
        )
    )


def _call_entry(
    task: PythonTask, frames: dict[str, pd.DataFrame], log: Callable[[str], None]
) -> Result[Tables, NodeError]:
    namespace: dict[str, Any] = {"__name__": "nodomics_node"}
    try:
        with _printing_to(log):
            exec(compile(task["code"], CODE_FILENAME, "exec"), namespace)
            entry = namespace.get(task["entry"])
            if not callable(entry):
                return Err(_python_error(f"El código no define la función '{task['entry']}'."))
            return _to_tables(entry(frames, task["params"]))
    # User code may fail in any way, even calling exit(); that is the node's error, not ours.
    except (Exception, SystemExit) as failure:
        return Err(_python_error(f"{type(failure).__name__}: {failure}", traceback.format_exc()))


def _to_frames(tables: Tables) -> dict[str, pd.DataFrame]:
    # pyarrow-stubs leave one to_pandas parameter untyped; the return type is a DataFrame.
    return {
        alias: table.to_pandas()  # pyright: ignore[reportUnknownMemberType]
        for alias, table in tables.items()
    }


def _to_tables(returned: object) -> Result[Tables, NodeError]:
    if not isinstance(returned, dict):
        return Err(_python_error("La función debe devolver un dict de DataFrames."))
    outputs = cast(dict[object, object], returned)
    if not all(isinstance(port, str) and _is_frame(frame) for port, frame in outputs.items()):
        return Err(_python_error("Cada salida debe ser un DataFrame con nombre de puerto."))
    return Ok(
        {
            str(port): pa.Table.from_pandas(cast(pd.DataFrame, frame), preserve_index=False)
            for port, frame in outputs.items()
        }
    )


def _is_frame(value: object) -> bool:
    return isinstance(value, pd.DataFrame)


def _python_error(message: str, detail: str | None = None) -> NodeError:
    error: NodeError = {"code": "PYTHON_EXCEPTION", "message": message}
    return error if detail is None else {**error, "detail": detail}


@contextlib.contextmanager
def _printing_to(log: Callable[[str], None]) -> Generator[None]:
    writer = _LineWriter(log)
    # redirect_stdout only needs write() and flush(); _LineWriter is not a full IO object.
    try:
        with contextlib.redirect_stdout(cast(IO[str], writer)):
            yield
    finally:
        writer.flush()


class _LineWriter:
    """Forwards printed text to the log one complete line at a time."""

    def __init__(self, log: Callable[[str], None]) -> None:
        self._log = log
        self._pending = ""

    def write(self, text: str) -> int:
        *lines, self._pending = (self._pending + text).split("\n")
        for line in lines:
            self._log(line)
        return len(text)

    def flush(self) -> None:
        if self._pending:
            self._log(self._pending)
            self._pending = ""
