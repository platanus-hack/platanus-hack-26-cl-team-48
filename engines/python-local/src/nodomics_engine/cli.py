"""Command line entry point: `uv run nodomics-engine`."""

import argparse
import asyncio
import contextlib
import secrets
import sys
from collections.abc import Sequence
from dataclasses import dataclass
from pathlib import Path

from nodomics_engine.protocol_schema import (
    DEFAULT_SCHEMA_PATH,
    ExecutorSchema,
    load_executor_schema,
)
from nodomics_engine.result_store import ResultStore
from nodomics_engine.server import LOOPBACK_HOST, ServerConfig, serve_executor

DEFAULT_PORT = 7341
DEFAULT_ORIGIN = "http://localhost:5173"
TOKEN_BYTES = 32


@dataclass(frozen=True)
class Options:
    config: ServerConfig
    schema_path: Path


def main() -> None:
    options = parse_options(sys.argv[1:], token=secrets.token_urlsafe(TOKEN_BYTES))
    if not options.schema_path.exists():
        sys.exit(
            f"Protocol schema not found at {options.schema_path}.\n"
            "Generate it with: pnpm --filter @nodomics/protocol export-schema"
        )
    print(connection_banner(options.config), flush=True)
    with contextlib.suppress(KeyboardInterrupt):
        asyncio.run(_serve_forever(options.config, load_executor_schema(options.schema_path)))


def parse_options(argv: Sequence[str], token: str) -> Options:
    parser = argparse.ArgumentParser(prog="nodomics-engine", description=__doc__)
    parser.add_argument("--port", type=int, default=DEFAULT_PORT)
    parser.add_argument("--allow-origin", action="append", dest="origins", metavar="ORIGIN")
    parser.add_argument("--schema", type=Path, default=DEFAULT_SCHEMA_PATH)
    arguments = parser.parse_args(argv)
    origins: list[str] = arguments.origins or [DEFAULT_ORIGIN]
    return Options(
        config=ServerConfig(port=arguments.port, token=token, allowed_origins=frozenset(origins)),
        schema_path=arguments.schema,
    )


def connection_banner(config: ServerConfig) -> str:
    return (
        f"Nodomics local engine listening on ws://{LOOPBACK_HOST}:{config.port}\n"
        f"Allowed origins: {', '.join(sorted(config.allowed_origins))}\n"
        f"Connect with: ws://{LOOPBACK_HOST}:{config.port}/?token={config.token}"
    )


async def _serve_forever(config: ServerConfig, schema: ExecutorSchema) -> None:
    async with serve_executor(config, schema, ResultStore()) as server:
        await server.serve_forever()
