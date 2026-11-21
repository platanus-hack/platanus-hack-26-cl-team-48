import json
import sys
from concurrent.futures import ThreadPoolExecutor
from threading import Event, Lock
from typing import Any

from nodomics_engine.dispatch import Dispatcher
from nodomics_engine.executor_handlers import create_executor_handlers
from nodomics_engine.json_codec import encode_json
from nodomics_engine.protocol_schema import ExecutorSchema
from nodomics_engine.result_store import ResultStore


def test_load_returns_success_and_node_errors(executor_schema: ExecutorSchema):
    dispatcher = Dispatcher(
        executor_schema,
        create_executor_handlers(ResultStore(), lambda _method, _params: None, Lock()),
    )

    for source_format, data, expected in [
        ("csv", b"x\n1\n", True),
        ("parquet", b"invalid parquet", False),
    ]:
        reply = dispatcher.handle_text(
            encode_json(
                {
                    "jsonrpc": "2.0",
                    "id": 1,
                    "method": "exec.load",
                    "params": {
                        "sourceId": "s",
                        "format": source_format,
                        "location": {"kind": "bytes", "bytes": data},
                    },
                }
            )
        )
        assert reply is not None
        result = json.loads(reply)["result"]
        assert result["ok"] is expected
        if expected:
            assert result["ref"]["rowCount"] == 1
        else:
            assert result["error"]["code"] == "SOURCE_UNREADABLE"


def test_concurrent_connections_keep_task_logs_and_restore_stdout():
    original_stdout = sys.stdout
    started = Event()
    release = Event()
    logs: dict[str, list[object]] = {"first": [], "second": []}

    def notify(connection: str, method: str, params: object):
        logs[connection].append(params)
        if connection == "first" and len(logs[connection]) == 1:
            started.set()
            assert release.wait(5)

    store = ResultStore()
    python_lock = Lock()
    handlers = {
        name: create_executor_handlers(
            store, lambda method, params, name=name: notify(name, method, params), python_lock
        )
        for name in logs
    }
    code = """
import os
def run(inputs, params):
    for _ in range(1000):
        print(params['name'])
        os.sched_yield()
    return {}
"""

    def run(name: str):
        return handlers[name]["exec.run"](
            {
                "taskId": name,
                "task": {
                    "kind": "python",
                    "code": code,
                    "entry": "run",
                    "inputs": {},
                    "params": {"name": name},
                },
            }
        )

    try:
        with ThreadPoolExecutor(max_workers=2) as pool:
            first = pool.submit(run, "first")
            assert started.wait(5)
            second = pool.submit(run, "second")
            release.set()
            first.result(timeout=10)
            second.result(timeout=10)
        assert sys.stdout is original_stdout
        for name, messages in logs.items():
            assert messages == [{"taskId": name, "level": "info", "message": name}] * 1000
    finally:
        sys.stdout = original_stdout


def _call(dispatcher: Dispatcher, method: str, params: object) -> Any:
    reply = dispatcher.handle_text(
        encode_json({"jsonrpc": "2.0", "id": 1, "method": method, "params": params})
    )
    assert reply is not None
    return json.loads(reply)


SHOWS_A_FIGURE = """
import matplotlib.pyplot as plt

def run(inputs, params):
    plt.plot([1, 2])
    plt.show()
    return {}
"""


def test_serves_the_figures_a_task_showed_until_they_are_dropped(executor_schema: ExecutorSchema):
    dispatcher = Dispatcher(
        executor_schema,
        create_executor_handlers(ResultStore(), lambda _method, _params: None, Lock()),
    )
    task: dict[str, object] = {
        "kind": "python",
        "code": SHOWS_A_FIGURE,
        "entry": "run",
        "inputs": {},
        "params": {},
    }

    [display] = _call(dispatcher, "exec.run", {"taskId": "t", "task": task})["result"]["displays"]
    served = _call(dispatcher, "exec.display", {"displayId": display["id"]})
    _call(dispatcher, "exec.drop", {"resultIds": [display["id"]]})
    expired = _call(dispatcher, "exec.display", {"displayId": display["id"]})

    assert served["result"]["mime"] == "image/png"
    assert "error" in expired


def test_completes_code_and_rejects_positions_outside_it(executor_schema: ExecutorSchema):
    dispatcher = Dispatcher(
        executor_schema,
        create_executor_handlers(ResultStore(), lambda _method, _params: None, Lock()),
    )

    completed = _call(dispatcher, "exec.complete", {"code": "import js", "line": 1, "column": 9})
    outside = _call(dispatcher, "exec.complete", {"code": "x", "line": 5, "column": 0})

    json_module = {"label": "json", "kind": "module", "detail": "module json"}
    assert json_module in completed["result"]["items"]
    assert "error" in outside
