from typing import Any

import pyarrow as pa

from nodomics_engine.protocol_types import PythonTask
from nodomics_engine.python_runner import run_python
from nodomics_engine.result import Err, Ok
from nodomics_engine.result_store import ResultStore
from nodomics_engine.task_context import TaskContext

DOUBLE_AMOUNTS = """
def run(inputs, params):
    frame = inputs["in"].copy()
    frame["amount"] = frame["amount"] * params["factor"]
    print("rows:", len(frame))
    print("done")
    return {"out": frame}
"""


def python_task(code: str, inputs: dict[str, str], params: dict[str, Any]) -> PythonTask:
    return {"kind": "python", "code": code, "entry": "run", "inputs": inputs, "params": params}


def test_calls_the_entry_with_dataframes_and_stores_its_outputs():
    store = ResultStore()
    source = store.put(pa.table({"amount": [1, 2]}))
    task = python_task(DOUBLE_AMOUNTS, {"in": source["id"]}, {"factor": 10})

    outcome = run_python(task, TaskContext(store=store, log=lambda _line: None))

    assert isinstance(outcome, Ok)
    out = outcome.value["outputs"]["out"]
    assert out["rowCount"] == 2
    assert out["schema"] == [{"name": "amount", "type": "number"}]
    stored = store.get(out["id"])
    assert stored is not None
    assert stored.to_pydict() == {"amount": [10, 20]}


def test_sends_each_printed_line_to_the_log():
    store = ResultStore()
    source = store.put(pa.table({"amount": [1, 2]}))
    lines: list[str] = []

    run_python(
        python_task(DOUBLE_AMOUNTS, {"in": source["id"]}, {"factor": 1}),
        TaskContext(store=store, log=lines.append),
    )

    assert lines == ["rows: 2", "done"]


def test_reports_exceptions_in_the_code_as_python_exception():
    code = "def run(inputs, params):\n    raise KeyError('monto')\n"

    outcome = run_python(
        python_task(code, {}, {}), TaskContext(store=ResultStore(), log=lambda _line: None)
    )

    assert isinstance(outcome, Err)
    assert outcome.error["code"] == "PYTHON_EXCEPTION"
    assert "KeyError: 'monto'" in outcome.error.get("detail", "")


def test_reports_a_missing_entry_as_python_exception():
    outcome = run_python(
        python_task("x = 1\n", {}, {}), TaskContext(store=ResultStore(), log=lambda _line: None)
    )

    assert isinstance(outcome, Err)
    assert outcome.error["code"] == "PYTHON_EXCEPTION"
    assert "run" in outcome.error["message"]


def test_reports_outputs_that_are_not_dataframes_as_python_exception():
    code = "def run(inputs, params):\n    return {'out': [1, 2]}\n"

    outcome = run_python(
        python_task(code, {}, {}), TaskContext(store=ResultStore(), log=lambda _line: None)
    )

    assert isinstance(outcome, Err)
    assert outcome.error["code"] == "PYTHON_EXCEPTION"


def test_reports_missing_inputs_as_input_missing():
    outcome = run_python(
        python_task(DOUBLE_AMOUNTS, {"in": "gone"}, {}),
        TaskContext(store=ResultStore(), log=lambda _line: None),
    )

    assert isinstance(outcome, Err)
    assert outcome.error["code"] == "INPUT_MISSING"
