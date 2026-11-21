"""Shapes of @nodomics/protocol messages, trusted only after parsing against its JSON Schema."""

from typing import Any, Literal, NotRequired, TypedDict

type ColumnType = Literal["number", "text", "date", "bool", "geo", "other"]

type NodeErrorCode = Literal[
    "INPUT_MISSING",
    "COLUMN_NOT_FOUND",
    "SQL_ERROR",
    "PYTHON_EXCEPTION",
    "SOURCE_UNREADABLE",
    "SOURCE_UNAVAILABLE",
]


class Column(TypedDict):
    name: str
    type: ColumnType


class ResultRef(TypedDict):
    id: str
    rowCount: int
    schema: list[Column]


class DisplayRef(TypedDict):
    id: str
    mime: Literal["image/png"]
    width: int
    height: int
    title: NotRequired[str]


class TaskOutputs(TypedDict):
    outputs: dict[str, ResultRef]
    displays: list[DisplayRef]


type CompletionKind = Literal[
    "module", "class", "function", "variable", "property", "keyword", "other"
]


class CompletionItem(TypedDict):
    label: str
    kind: CompletionKind
    detail: NotRequired[str]


class CodeCompletions(TypedDict):
    items: list[CompletionItem]


class NodeError(TypedDict):
    code: NodeErrorCode
    message: str
    detail: NotRequired[str]


class SqlTask(TypedDict):
    kind: Literal["sql"]
    query: str
    inputs: dict[str, str]


class PythonTask(TypedDict):
    kind: Literal["python"]
    code: str
    entry: str
    inputs: dict[str, str]
    params: dict[str, Any]


class SortSpec(TypedDict):
    column: str
    direction: Literal["asc", "desc"]


class DataPage(TypedDict):
    columns: list[Column]
    rows: list[list[object]]
    total: int


class ColumnProfile(TypedDict):
    name: str
    type: ColumnType
    count: int
    nulls: int
    distinct: int
    min: NotRequired[str]
    max: NotRequired[str]
    mean: NotRequired[float]
    bins: list[float]


class DataProfile(TypedDict):
    columns: list[ColumnProfile]


class BytesLocation(TypedDict):
    kind: Literal["bytes"]
    bytes: bytes


class UrlLocation(TypedDict):
    kind: Literal["url"]
    url: str


class PathLocation(TypedDict):
    kind: Literal["path"]
    path: str


type SourceLocation = BytesLocation | UrlLocation | PathLocation

type SourceFormat = Literal["csv", "parquet", "json", "txt"]
