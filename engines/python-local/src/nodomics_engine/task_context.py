"""What a task runner needs from the executor: where results live and where its output goes."""

from collections.abc import Callable
from contextlib import AbstractContextManager
from dataclasses import dataclass, field
from threading import Lock

import pyarrow as pa

from nodomics_engine.protocol_types import NodeError, TaskOutputs
from nodomics_engine.result import Err, Ok, Result
from nodomics_engine.result_store import ResultStore

type TaskOutcome = Result[TaskOutputs, NodeError]


@dataclass(frozen=True)
class TaskContext:
    store: ResultStore
    log: Callable[[str], None]
    python_lock: AbstractContextManager[object] = field(default_factory=Lock)

    def resolve_inputs(self, inputs: dict[str, str]) -> Result[dict[str, pa.Table], NodeError]:
        tables = {alias: self.store.get(result_id) for alias, result_id in inputs.items()}
        missing = sorted(alias for alias, table in tables.items() if table is None)
        if missing:
            return Err(
                {
                    "code": "INPUT_MISSING",
                    "message": "Falta el resultado de una entrada; vuelve a ejecutar el flujo.",
                    "detail": f"Unknown results for inputs: {', '.join(missing)}",
                }
            )
        return Ok({alias: table for alias, table in tables.items() if table is not None})
