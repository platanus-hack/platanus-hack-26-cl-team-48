"""Reads csv, parquet, json or txt sources from bytes, URLs or local paths into Arrow tables."""

import contextlib
import tempfile
import urllib.parse
import urllib.request
from collections.abc import Callable, Generator
from pathlib import Path

import duckdb
import pyarrow as pa

from nodomics_engine.protocol_types import NodeError, NodeErrorCode, SourceFormat, SourceLocation
from nodomics_engine.result import Err, Ok, Result

DOWNLOAD_TIMEOUT_SECONDS = 60
DOWNLOADABLE_SCHEMES = frozenset({"http", "https"})

type Fetch = Callable[[str], bytes]

TEXT_SEPARATORS = ("\t", ";", "|", ",")


def _read_text(connection: duckdb.DuckDBPyConnection, path: str) -> duckdb.DuckDBPyRelation:
    text = Path(path).read_bytes().decode("utf-8")
    first_line = text.partition("\n")[0].replace("\r", "")
    separator = next((candidate for candidate in TEXT_SEPARATORS if candidate in first_line), None)
    if separator is not None:
        return connection.read_csv(path, delimiter=separator, header=True)
    lines = text.removesuffix("\n").split("\n") if text else []
    return connection.from_arrow(
        pa.table({"texto": pa.array([line.removesuffix("\r") for line in lines], type=pa.string())})
    )


READERS: dict[SourceFormat, Callable[[duckdb.DuckDBPyConnection, str], duckdb.DuckDBPyRelation]] = {
    "csv": lambda connection, path: connection.read_csv(path),
    "parquet": lambda connection, path: connection.read_parquet(path),
    "json": lambda connection, path: connection.read_json(path),
    "txt": _read_text,
}


def download(url: str) -> bytes:
    if urllib.parse.urlparse(url).scheme not in DOWNLOADABLE_SCHEMES:
        raise ValueError(f"Only http and https URLs can be downloaded: {url}")
    with urllib.request.urlopen(url, timeout=DOWNLOAD_TIMEOUT_SECONDS) as response:
        return response.read()


def load_source(
    source_format: SourceFormat, location: SourceLocation, fetch: Fetch = download
) -> Result[pa.Table, NodeError]:
    try:
        with _local_file(location, fetch) as path, duckdb.connect() as connection:
            return _read_table(connection, source_format, path)
    except OSError as failure:
        return Err(_source_error("SOURCE_UNAVAILABLE", failure))
    except (duckdb.Error, ValueError) as failure:
        return Err(_source_error("SOURCE_UNREADABLE", failure))


def _read_table(
    connection: duckdb.DuckDBPyConnection, source_format: SourceFormat, path: Path
) -> Result[pa.Table, NodeError]:
    try:
        return Ok(READERS[source_format](connection, str(path)).to_arrow_table())
    except duckdb.Error as failure:
        return Err(_source_error("SOURCE_UNREADABLE", failure))


def _source_error(code: NodeErrorCode, failure: Exception) -> NodeError:
    return {
        "code": code,
        "message": "No se pudo leer la fuente de datos.",
        "detail": str(failure),
    }


@contextlib.contextmanager
def _local_file(location: SourceLocation, fetch: Fetch) -> Generator[Path]:
    match location["kind"]:
        case "path":
            path = Path(location["path"])
            with path.open("rb"):
                yield path
        case "bytes":
            with _temporary_file(location["bytes"]) as path:
                yield path
        case "url":
            with _temporary_file(fetch(location["url"])) as path:
                yield path


@contextlib.contextmanager
def _temporary_file(data: bytes) -> Generator[Path]:
    with tempfile.TemporaryDirectory() as directory:
        path = Path(directory) / "source"
        path.write_bytes(data)
        yield path
