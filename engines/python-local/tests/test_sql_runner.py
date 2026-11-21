import pyarrow as pa

from nodomics_engine.protocol_types import SqlTask
from nodomics_engine.result import Err, Ok
from nodomics_engine.result_store import ResultStore
from nodomics_engine.sql_runner import run_sql
from nodomics_engine.task_context import TaskContext


def context_with(store: ResultStore) -> TaskContext:
    return TaskContext(store=store, log=lambda _line: None)


def test_runs_the_query_over_inputs_bound_to_their_aliases():
    store = ResultStore()
    sales = store.put(pa.table({"region": ["n", "s", "n"], "amount": [1, 2, 3]}))
    task: SqlTask = {
        "kind": "sql",
        "query": (
            "SELECT region, sum(amount)::BIGINT AS total FROM sales GROUP BY region ORDER BY region"
        ),
        "inputs": {"sales": sales["id"]},
    }

    outcome = run_sql(task, context_with(store))

    assert isinstance(outcome, Ok)
    out = outcome.value["outputs"]["out"]
    assert out["rowCount"] == 2
    assert out["schema"] == [
        {"name": "region", "type": "text"},
        {"name": "total", "type": "number"},
    ]
    stored = store.get(out["id"])
    assert stored is not None
    assert stored.to_pydict() == {"region": ["n", "s"], "total": [4, 2]}


def test_reports_missing_inputs_as_input_missing():
    task: SqlTask = {"kind": "sql", "query": "SELECT * FROM t", "inputs": {"t": "gone"}}

    outcome = run_sql(task, context_with(ResultStore()))

    assert isinstance(outcome, Err)
    assert outcome.error["code"] == "INPUT_MISSING"


def test_reports_unknown_columns_as_column_not_found():
    store = ResultStore()
    ref = store.put(pa.table({"a": [1]}))
    task: SqlTask = {"kind": "sql", "query": "SELECT b FROM t", "inputs": {"t": ref["id"]}}

    outcome = run_sql(task, context_with(store))

    assert isinstance(outcome, Err)
    assert outcome.error["code"] == "COLUMN_NOT_FOUND"
    assert "b" in outcome.error.get("detail", "")


def test_reports_other_sql_failures_as_sql_error():
    task: SqlTask = {"kind": "sql", "query": "SELEC 1", "inputs": {}}

    outcome = run_sql(task, context_with(ResultStore()))

    assert isinstance(outcome, Err)
    assert outcome.error["code"] == "SQL_ERROR"
