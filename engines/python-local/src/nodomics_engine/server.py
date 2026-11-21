"""WebSocket adapter: screens handshakes and moves text messages to and from the dispatcher."""

import asyncio
from collections.abc import Callable
from dataclasses import dataclass
from threading import Lock

from websockets.asyncio.server import Server, ServerConnection, serve
from websockets.http11 import Request, Response
from websockets.typing import Data

from nodomics_engine.connection_policy import ConnectionPolicy
from nodomics_engine.dispatch import Dispatcher, Handler
from nodomics_engine.executor_handlers import Notify, create_executor_handlers
from nodomics_engine.json_codec import encode_json
from nodomics_engine.protocol_schema import ExecutorSchema
from nodomics_engine.result_store import ResultStore

LOOPBACK_HOST = "127.0.0.1"
# Sources and Arrow results travel inside messages, so the default 1 MiB frame limit is too small.
MAX_MESSAGE_BYTES = 512 * 1024 * 1024


@dataclass(frozen=True)
class ServerConfig:
    port: int
    token: str
    allowed_origins: frozenset[str]


def serve_executor(config: ServerConfig, schema: ExecutorSchema, store: ResultStore) -> Server:
    """Returns a server to use with `async with`; it listens only on the loopback interface."""
    python_lock = Lock()
    policy = ConnectionPolicy(config.token, config.allowed_origins)
    return serve(
        lambda connection: _serve_connection(
            connection, schema, lambda notify: create_executor_handlers(store, notify, python_lock)
        ),
        LOOPBACK_HOST,
        config.port,
        process_request=lambda connection, request: _screen(connection, request, policy),
        max_size=MAX_MESSAGE_BYTES,
    )


def _screen(
    connection: ServerConnection, request: Request, policy: ConnectionPolicy
) -> Response | None:
    status = policy.refuse(request.path, request.headers.get("Origin"))
    return None if status is None else connection.respond(status, f"{status.phrase}\n")


async def _serve_connection(
    connection: ServerConnection,
    schema: ExecutorSchema,
    handlers: Callable[[Notify], dict[str, Handler]],
) -> None:
    notify = _notifier(connection, asyncio.get_running_loop())
    dispatcher = Dispatcher(schema, handlers(notify))
    async for message in connection:
        # Tasks block (DuckDB, user code), so they run off the loop to keep pings answered.
        reply = await asyncio.to_thread(dispatcher.handle_text, _as_text(message))
        if reply is not None:
            await connection.send(reply)


def _notifier(connection: ServerConnection, loop: asyncio.AbstractEventLoop) -> Notify:
    def notify(method: str, params: object) -> None:
        text = encode_json({"jsonrpc": "2.0", "method": method, "params": params})
        # Called from the task thread; waiting keeps notifications ahead of the reply.
        asyncio.run_coroutine_threadsafe(connection.send(text), loop).result()

    return notify


def _as_text(message: Data) -> str:
    return message if isinstance(message, str) else bytes(message).decode("utf-8", "replace")
