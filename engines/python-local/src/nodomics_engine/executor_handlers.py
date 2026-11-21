"""The executor protocol as a table of handlers, one per exec.* method."""

from collections.abc import Callable
from contextlib import AbstractContextManager
from functools import partial
from typing import Any

import pyarrow as pa

from nodomics_engine.arrow_ipc import read_ipc, write_ipc
from nodomics_engine.capabilities import describe_capabilities
from nodomics_engine.code_completion import complete_code
from nodomics_engine.dispatch import Handler
from nodomics_engine.paging import read_page
from nodomics_engine.profiling import profile_table
from nodomics_engine.protocol_schema import Params
from nodomics_engine.python_runner import run_python
from nodomics_engine.result import Err, Ok, Result
from nodomics_engine.result_store import ResultStore
from nodomics_engine.rpc_failure import INVALID_PARAMS, RESULT_EXPIRED, RpcFailure
from nodomics_engine.source_loading import load_source
from nodomics_engine.sql_runner import run_sql
from nodomics_engine.task_context import TaskContext, TaskOutcome

type Notify = Callable[[str, object], None]
type Reply = Result[object, RpcFailure]

TASK_RUNNERS: dict[str, Callable[[Any, TaskContext], TaskOutcome]] = {
    "sql": run_sql,
    "python": run_python,
}


def create_executor_handlers(
    store: ResultStore, notify: Notify, python_lock: AbstractContextManager[object]
) -> dict[str, Handler]:
    def run(params: Params) -> Reply:
        return _run(TaskContext(store, _task_log(params["taskId"], notify), python_lock), params)

    return {
        "exec.hello": _hello,
        "exec.run": run,
        "exec.page": partial(_page, store),
        "exec.profile": partial(_profile, store),
        "exec.export": partial(_export, store),
        "exec.import": partial(_import, store),
        "exec.load": partial(_load, store),
        "exec.drop": partial(_drop, store),
        "exec.display": partial(_display, store),
        "exec.complete": _complete,
    }


def _hello(_params: Params) -> Reply:
    return Ok(describe_capabilities())


def _run(context: TaskContext, params: Params) -> Reply:
    task = params["task"]
    match TASK_RUNNERS[task["kind"]](task, context):
        case Ok(value=outputs):
            return Ok({"ok": True, **outputs})
        case Err(error=error):
            return Ok({"ok": False, "error": error})


def _task_log(task_id: str, notify: Notify) -> Callable[[str], None]:
    return lambda line: notify("exec.log", {"taskId": task_id, "level": "info", "message": line})


def _page(store: ResultStore, params: Params) -> Reply:
    def read(table: pa.Table) -> Reply:
        match read_page(table, params["offset"], params["limit"], params.get("sort")):
            case Ok(value=page):
                return Ok(page)
            case Err(error=issue):
                return Err(RpcFailure(INVALID_PARAMS, issue))

    return _with_table(store, params["resultId"], read)


def _profile(store: ResultStore, params: Params) -> Reply:
    return _with_table(store, params["resultId"], lambda table: Ok(profile_table(table)))


def _export(store: ResultStore, params: Params) -> Reply:
    return _with_table(store, params["resultId"], lambda table: Ok({"arrow": write_ipc(table)}))


def _import(store: ResultStore, params: Params) -> Reply:
    match read_ipc(params["arrow"]):
        case Ok(value=table):
            return Ok(store.put(table))
        case Err(error=issue):
            return Err(RpcFailure(INVALID_PARAMS, issue))


def _load(store: ResultStore, params: Params) -> Reply:
    match load_source(params["format"], params["location"]):
        case Ok(value=table):
            return Ok({"ok": True, "ref": store.put(table)})
        case Err(error=error):
            return Ok({"ok": False, "error": error})


def _drop(store: ResultStore, params: Params) -> Reply:
    store.drop(params["resultIds"])
    return Ok({})


def _display(store: ResultStore, params: Params) -> Reply:
    figure = store.get_figure(params["displayId"])
    if figure is None:
        return Err(RpcFailure(RESULT_EXPIRED, f"Figure expired: {params['displayId']}"))
    return Ok({"mime": "image/png", "bytes": figure})


def _complete(params: Params) -> Reply:
    match complete_code(params["code"], params["line"], params["column"]):
        case Ok(value=completions):
            return Ok(completions)
        case Err(error=issue):
            return Err(RpcFailure(INVALID_PARAMS, issue))


def _with_table(store: ResultStore, result_id: str, use: Callable[[pa.Table], Reply]) -> Reply:
    table = store.get(result_id)
    if table is None:
        return Err(RpcFailure(RESULT_EXPIRED, f"Result expired: {result_id}"))
    return use(table)
