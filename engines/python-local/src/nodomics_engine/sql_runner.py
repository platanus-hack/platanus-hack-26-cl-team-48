"""Runs a resolved SQL task in DuckDB with each input bound to its alias."""

import duckdb
import pyarrow as pa

from nodomics_engine.protocol_types import NodeError, SqlTask, TaskOutputs
from nodomics_engine.result import Err, Ok
from nodomics_engine.task_context import TaskContext, TaskOutcome

SQL_OUTPUT_PORT = "out"


def run_sql(task: SqlTask, context: TaskContext) -> TaskOutcome:
    tables = context.resolve_inputs(task["inputs"])
    if isinstance(tables, Err):
        return tables
    try:
        table = _query(task["query"], tables.value)
    except duckdb.Error as failure:
        return Err(_describe_failure(failure))
    return Ok(TaskOutputs(outputs={SQL_OUTPUT_PORT: context.store.put(table)}, displays=[]))


def _query(query: str, tables: dict[str, pa.Table]) -> pa.Table:
    with duckdb.connect() as connection:
        for alias, table in tables.items():
            connection.register(alias, table)
        return connection.sql(query).to_arrow_table()


def _describe_failure(failure: duckdb.Error) -> NodeError:
    if _is_missing_column(failure):
        return {
            "code": "COLUMN_NOT_FOUND",
            "message": "La consulta usa una columna que no existe.",
            "detail": str(failure),
        }
    return {"code": "SQL_ERROR", "message": "La consulta SQL falló.", "detail": str(failure)}


def _is_missing_column(failure: duckdb.Error) -> bool:
    return isinstance(failure, duckdb.BinderException) and "column" in str(failure).lower()
