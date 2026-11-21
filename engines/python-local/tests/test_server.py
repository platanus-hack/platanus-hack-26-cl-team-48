from __future__ import annotations

import asyncio
import itertools
import json
import sys
from collections.abc import AsyncIterator
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import pyarrow as pa
import pytest
from websockets.asyncio.client import ClientConnection, connect
from websockets.exceptions import InvalidStatus
from websockets.typing import Origin

from nodomics_engine.arrow_ipc import read_ipc, write_ipc
from nodomics_engine.json_codec import decode_json, encode_json
from nodomics_engine.protocol_schema import (
    DEFAULT_SCHEMA_PATH,
    BinaryAwareValidator,
    ExecutorSchema,
)
from nodomics_engine.result import Ok
from nodomics_engine.result_store import ResultStore
from nodomics_engine.server import ServerConfig, serve_executor

TOKEN = "test-token"
APP_ORIGIN = Origin("http://localhost:5173")
CSV = b"city,amount\nlima,10\nquito,20\nlima,5\n"


@dataclass
class Client:
    connection: ClientConnection
    notifications: list[Any] = field(default_factory=list[Any])
    ids: itertools.count[int] = field(default_factory=itertools.count)

    async def call(self, method: str, params: object) -> Any:
        request_id = next(self.ids)
        await self.connection.send(
            encode_json({"jsonrpc": "2.0", "id": request_id, "method": method, "params": params})
        )
        while True:
            message: Any = decode_json(str(await self.connection.recv()))
            if message.get("id") == request_id:
                return message
            self.notifications.append(message)

    async def result(self, method: str, params: object) -> Any:
        reply = await self.call(method, params)
        assert "result" in reply, reply
        assert_matches_result_schema(method, reply["result"])
        return reply["result"]

    async def load_csv(self) -> Any:
        location = {"kind": "bytes", "bytes": CSV}
        outcome = await self.result(
            "exec.load", {"sourceId": "s1", "format": "csv", "location": location}
        )
        assert outcome["ok"] is True
        return outcome["ref"]


def assert_matches_result_schema(method: str, result: object) -> None:
    requests = json.loads(DEFAULT_SCHEMA_PATH.read_text())["executor"]["requests"]
    BinaryAwareValidator(requests[method]["result"]).validate(result)  # pyright: ignore[reportUnknownMemberType]


@pytest.fixture
async def port(executor_schema: ExecutorSchema) -> AsyncIterator[int]:
    config = ServerConfig(port=0, token=TOKEN, allowed_origins=frozenset({APP_ORIGIN}))
    async with serve_executor(config, executor_schema, ResultStore()) as server:
        yield next(iter(server.sockets)).getsockname()[1]


@pytest.fixture
async def client(port: int) -> AsyncIterator[Client]:
    async with connect(
        f"ws://127.0.0.1:{port}/?token={TOKEN}", origin=APP_ORIGIN, max_size=None
    ) as connection:
        yield Client(connection)


async def rejected_status(url: str, origin: Origin | None) -> int:
    with pytest.raises(InvalidStatus) as rejection:
        async with connect(url, origin=origin):
            pass
    return rejection.value.response.status_code


async def test_rejects_connections_without_the_token(port: int):
    assert await rejected_status(f"ws://127.0.0.1:{port}/", APP_ORIGIN) == 401


async def test_rejects_connections_with_a_wrong_token(port: int):
    assert await rejected_status(f"ws://127.0.0.1:{port}/?token=nope", APP_ORIGIN) == 401


async def test_rejects_connections_from_other_origins(port: int):
    url = f"ws://127.0.0.1:{port}/?token={TOKEN}"

    assert await rejected_status(url, Origin("http://evil.example")) == 403


async def test_rejects_connections_without_an_origin(port: int):
    assert await rejected_status(f"ws://127.0.0.1:{port}/?token={TOKEN}", None) == 403


async def test_listens_only_on_loopback(executor_schema: ExecutorSchema):
    config = ServerConfig(port=0, token=TOKEN, allowed_origins=frozenset({APP_ORIGIN}))

    async with serve_executor(config, executor_schema, ResultStore()) as server:
        hosts = {socket.getsockname()[0] for socket in server.sockets}

    assert hosts == {"127.0.0.1"}


async def test_hello_describes_runtimes_and_installed_packages(client: Client):
    capabilities = await client.result("exec.hello", {})

    assert capabilities["executor"] == "python-local"
    assert capabilities["runtimes"] == ["sql", "python"]
    assert {"duckdb", "pandas", "pyarrow"} <= set(capabilities["packages"])


async def test_load_returns_a_reference_to_the_source(client: Client):
    ref = await client.load_csv()

    assert ref["rowCount"] == 3
    assert ref["schema"] == [{"name": "city", "type": "text"}, {"name": "amount", "type": "number"}]


async def test_load_reads_local_paths(client: Client, tmp_path: Path):
    path = tmp_path / "data.csv"
    path.write_bytes(CSV)
    location = {"kind": "path", "path": str(path)}

    ref = await client.result("exec.load", {"sourceId": "s", "format": "csv", "location": location})

    assert ref["ok"] is True
    assert ref["ref"]["rowCount"] == 3


async def test_load_answers_unreadable_sources_with_an_error(client: Client, tmp_path: Path):
    location = {"kind": "path", "path": str(tmp_path / "missing.csv")}

    reply = await client.call("exec.load", {"sourceId": "s", "format": "csv", "location": location})

    assert reply["result"]["ok"] is False
    assert reply["result"]["error"]["code"] == "SOURCE_UNAVAILABLE"


async def test_run_sql_stores_the_query_result(client: Client):
    source = await client.load_csv()
    task = {
        "kind": "sql",
        "query": "SELECT city, sum(amount)::BIGINT AS total FROM src GROUP BY city ORDER BY city",
        "inputs": {"src": source["id"]},
    }

    outcome = await client.result("exec.run", {"taskId": "t1", "task": task})

    assert outcome["ok"] is True
    page = await client.result(
        "exec.page", {"resultId": outcome["outputs"]["out"]["id"], "offset": 0, "limit": 10}
    )
    assert page["rows"] == [["lima", 15], ["quito", 20]]


async def test_run_python_logs_printed_lines_and_stores_outputs(client: Client):
    source = await client.load_csv()
    code = "def run(inputs, params):\n    print('hola')\n    return {'out': inputs['in'].head(1)}\n"
    task = {
        "kind": "python",
        "code": code,
        "entry": "run",
        "inputs": {"in": source["id"]},
        "params": {},
    }

    outcome = await client.result("exec.run", {"taskId": "t2", "task": task})

    assert outcome["ok"] is True
    assert outcome["outputs"]["out"]["rowCount"] == 1
    assert client.notifications == [
        {
            "jsonrpc": "2.0",
            "method": "exec.log",
            "params": {"taskId": "t2", "level": "info", "message": "hola"},
        }
    ]


async def test_run_reports_node_errors_as_values(client: Client):
    task: dict[str, Any] = {"kind": "sql", "query": "SELECT * FROM missing_table", "inputs": {}}

    outcome = await client.result("exec.run", {"taskId": "t3", "task": task})

    assert outcome["ok"] is False
    assert outcome["error"]["code"] == "SQL_ERROR"


async def test_page_sorts_and_windows_results(client: Client):
    source = await client.load_csv()
    params = {
        "resultId": source["id"],
        "offset": 0,
        "limit": 2,
        "sort": {"column": "amount", "direction": "asc"},
    }

    page = await client.result("exec.page", params)

    assert page["rows"] == [["lima", 5], ["lima", 10]]
    assert page["total"] == 3


async def test_page_answers_unknown_results_with_result_expired(client: Client):
    reply = await client.call("exec.page", {"resultId": "gone", "offset": 0, "limit": 1})

    assert reply["error"]["code"] == -32001


async def test_page_answers_unknown_sort_columns_with_invalid_params(client: Client):
    source = await client.load_csv()
    sort = {"column": "nope", "direction": "asc"}

    reply = await client.call(
        "exec.page", {"resultId": source["id"], "offset": 0, "limit": 1, "sort": sort}
    )

    assert reply["error"]["code"] == -32602


async def test_page_rejects_windows_over_the_protocol_limit(client: Client):
    source = await client.load_csv()

    reply = await client.call("exec.page", {"resultId": source["id"], "offset": 0, "limit": 1001})

    assert reply["error"]["code"] == -32602


async def test_profile_summarises_each_column(client: Client):
    source = await client.load_csv()

    profile = await client.result("exec.profile", {"resultId": source["id"]})

    assert [column["name"] for column in profile["columns"]] == ["city", "amount"]
    assert profile["columns"][0]["distinct"] == 2


async def test_export_returns_the_result_as_arrow_ipc(client: Client):
    source = await client.load_csv()

    exported = await client.result("exec.export", {"resultId": source["id"]})

    table = read_ipc(exported["arrow"])
    assert isinstance(table, Ok)
    assert table.value.column_names == ["city", "amount"]


async def test_import_stores_an_arrow_ipc_table(client: Client):
    arrow = write_ipc(pa.table({"x": [1, 2]}))

    ref = await client.result("exec.import", {"arrow": arrow})

    assert ref["rowCount"] == 2
    assert ref["schema"] == [{"name": "x", "type": "number"}]


async def test_import_answers_bytes_that_are_not_arrow_with_invalid_params(client: Client):
    reply = await client.call("exec.import", {"arrow": b"nope"})

    assert reply["error"]["code"] == -32602


async def test_drop_forgets_results(client: Client):
    source = await client.load_csv()

    assert await client.result("exec.drop", {"resultIds": [source["id"]]}) == {}

    reply = await client.call("exec.profile", {"resultId": source["id"]})
    assert reply["error"]["code"] == -32001


async def test_answers_invalid_params_with_invalid_params(client: Client):
    reply = await client.call("exec.run", {"taskId": "t", "task": {"kind": "rust"}})

    assert reply["error"]["code"] == -32602


async def test_load_returns_unreadable_contents_as_a_node_error(client: Client):
    outcome = await client.result(
        "exec.load",
        {
            "sourceId": "s",
            "format": "parquet",
            "location": {"kind": "bytes", "bytes": b"not parquet"},
        },
    )

    assert outcome["ok"] is False
    assert outcome["error"]["code"] == "SOURCE_UNREADABLE"


async def test_concurrent_connections_isolate_python_logs(client: Client, port: int):
    original_stdout = sys.stdout
    code = """
import os
def run(inputs, params):
    for _ in range(100):
        print(params['name'])
        os.sched_yield()
    return {}
"""
    async with connect(f"ws://127.0.0.1:{port}/?token={TOKEN}", origin=APP_ORIGIN) as connection:
        second = Client(connection)

        async def run(target: Client, name: str):
            return await target.result(
                "exec.run",
                {
                    "taskId": name,
                    "task": {
                        "kind": "python",
                        "code": code,
                        "entry": "run",
                        "inputs": {},
                        "params": {"name": name},
                    },
                },
            )

        outcomes = await asyncio.gather(run(client, "first"), run(second, "second"))

    assert all(outcome["ok"] for outcome in outcomes)
    assert sys.stdout is original_stdout
    for target, name in [(client, "first"), (second, "second")]:
        assert (
            target.notifications
            == [
                {
                    "jsonrpc": "2.0",
                    "method": "exec.log",
                    "params": {"taskId": name, "level": "info", "message": name},
                }
            ]
            * 100
        )
