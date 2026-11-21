"""Executor runtime inside Pyodide: results are pandas DataFrames held by id.

Every function takes and returns JSON text or Arrow bytes so the TypeScript side parses
one well-defined shape at the boundary instead of walking Python proxies.
"""

import contextlib
import importlib.util
import io
import json
import math
import traceback
import uuid
from contextlib import redirect_stderr, redirect_stdout

import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq
from pyodide.ffi import to_js

HISTOGRAM_BINS = 10
RANGED_TYPES = {"number", "text", "date"}
TEXT_SEPARATORS = ("\t", ";", "|", ",")
SOURCE_READERS = {
    "csv": lambda data: pd.read_csv(io.BytesIO(data)),
    "parquet": lambda data: pq.read_table(io.BytesIO(data)).to_pandas(),
    "json": lambda data: pd.read_json(io.BytesIO(data)),
    "txt": lambda data: read_text(data),
}

MAX_FIGURES_PER_TASK = 20
# Figures are drawn at twice their size so they stay sharp on high-density screens.
PIXEL_DENSITY = 2
MAX_COMPLETIONS = 200
JEDI_KINDS = {
    "module": "module",
    "class": "class",
    "function": "function",
    "instance": "variable",
    "statement": "variable",
    "param": "variable",
    "property": "property",
    "keyword": "keyword",
}

results: dict[str, pd.DataFrame] = {}
figures: dict[str, bytes] = {}


def has_result(result_id: str) -> bool:
    return result_id in results


def import_arrow(data) -> str:
    return json.dumps(hold(pa.ipc.open_stream(data.to_bytes()).read_all().to_pandas()))


def export_arrow(result_id: str):
    table = pa.Table.from_pandas(results[result_id], preserve_index=False)
    sink = pa.BufferOutputStream()
    with pa.ipc.new_stream(sink, table.schema) as writer:
        writer.write_table(table)
    return to_js(sink.getvalue().to_pybytes())


def read_text(data: bytes) -> pd.DataFrame:
    text = data.decode("utf-8")
    first_line = text.partition("\n")[0].replace("\r", "")
    separator = next((candidate for candidate in TEXT_SEPARATORS if candidate in first_line), None)
    if separator is not None:
        return pd.read_csv(io.BytesIO(data), sep=separator)
    lines = text.removesuffix("\n").split("\n") if text else []
    return pd.DataFrame({"texto": pd.Series([line.removesuffix("\r") for line in lines], dtype="string")})


def load_source(source_format: str, data) -> str:
    return json.dumps(hold(SOURCE_READERS[source_format](data.to_bytes())))


def drop(ids_json: str) -> None:
    for held_id in json.loads(ids_json):
        results.pop(held_id, None)
        figures.pop(held_id, None)


def has_figure(display_id: str) -> bool:
    return display_id in figures


def display(display_id: str):
    return to_js(figures[display_id])


def complete(code: str, line: int, column: int) -> str:
    """Completes with Jedi, which reads the code and the loaded libraries without running them."""
    import jedi

    try:
        completions = jedi.Script(code).complete(line, column)
    except ValueError as outside_the_code:
        return json.dumps({"invalid": str(outside_the_code)})
    return json.dumps({"items": [completion_item(found) for found in completions[:MAX_COMPLETIONS]]})


def completion_item(completion) -> dict:
    item = {"label": completion.name, "kind": JEDI_KINDS.get(completion.type, "other")}
    return {**item, "detail": completion.description} if completion.description else item


def page(result_id: str, offset: int, limit: int, sort_json: str) -> str:
    frame = sorted_frame(results[result_id], json.loads(sort_json))
    columns = describe_columns(frame)
    window = frame.iloc[offset : offset + limit]
    rows = [
        [to_json_value(value, column["type"]) for value, column in zip(row, columns)]
        for row in window.itertuples(index=False, name=None)
    ]
    return json.dumps({"columns": columns, "rows": rows, "total": len(frame)})


def profile(result_id: str) -> str:
    frame = results[result_id]
    return json.dumps(
        {
            "columns": [
                profile_column(frame[column["name"]], column)
                for column in describe_columns(frame)
            ]
        }
    )


def run_task(task_json: str, emit_log) -> str:
    stdout, stderr = io.StringIO(), io.StringIO()
    with redirect_stdout(stdout), redirect_stderr(stderr), capturing_figures() as captured:
        result = run_python(json.loads(task_json))
    for level, stream in (("info", stdout), ("warn", stderr)):
        for line in stream.getvalue().splitlines():
            emit_log(level, line)
    if result["ok"]:
        result["displays"] = [hold_figure(figure) for figure in captured]
    return json.dumps(result)


@contextlib.contextmanager
def capturing_figures():
    """Turns plt.show() into "keep this figure"; figures still open at the end are kept too."""
    captured: list[dict] = []
    if importlib.util.find_spec("matplotlib") is None:
        yield captured
        return
    import matplotlib

    # A worker has no screen; Agg draws figures in memory.
    matplotlib.use("Agg")
    from matplotlib import pyplot

    original_show = pyplot.show
    pyplot.show = lambda *_args, **_kwargs: keep_open_figures(pyplot, captured)
    try:
        yield captured
        keep_open_figures(pyplot, captured)
    finally:
        pyplot.show = original_show
        pyplot.close("all")


def keep_open_figures(pyplot, captured: list[dict]) -> None:
    for number in pyplot.get_fignums():
        figure = pyplot.figure(number)
        if len(captured) < MAX_FIGURES_PER_TASK:
            captured.append(render_figure(figure))
        pyplot.close(figure)


def render_figure(figure) -> dict:
    buffer = io.BytesIO()
    figure.savefig(buffer, format="png", dpi=figure.dpi * PIXEL_DENSITY)
    width, height = figure.get_size_inches() * figure.dpi
    titles = [figure.get_suptitle(), *(axes.get_title() for axes in figure.axes)]
    return {
        "png": buffer.getvalue(),
        "width": round(width),
        "height": round(height),
        "title": next((title for title in titles if title), ""),
    }


def hold_figure(figure: dict) -> dict:
    display_id = f"d_{uuid.uuid4().hex}"
    figures[display_id] = figure["png"]
    ref = {"id": display_id, "mime": "image/png", "width": figure["width"], "height": figure["height"]}
    return {**ref, "title": figure["title"]} if figure["title"] else ref


def run_python(task: dict) -> dict:
    inputs = {alias: results[rid].copy() for alias, rid in task["inputs"].items()}
    try:
        namespace: dict = {}
        exec(compile(task["code"], "<nodo>", "exec"), namespace)
        outputs = namespace[task["entry"]](inputs, task["params"])
        if not is_table_dict(outputs):
            return python_failure(
                "La función debe devolver un diccionario de tablas (DataFrame).",
                f"Returned {type(outputs).__name__}",
            )
        return {
            "ok": True,
            "outputs": {port: hold(frame) for port, frame in outputs.items()},
        }
    except Exception as error:
        return python_failure(
            f"El código Python falló: {type(error).__name__}: {error}",
            traceback.format_exc(),
        )


def is_table_dict(outputs) -> bool:
    return isinstance(outputs, dict) and all(
        isinstance(port, str) and isinstance(frame, pd.DataFrame)
        for port, frame in outputs.items()
    )


def python_failure(message: str, detail: str) -> dict:
    return {
        "ok": False,
        "error": {"code": "PYTHON_EXCEPTION", "message": message, "detail": detail},
    }


def hold(frame: pd.DataFrame) -> dict:
    result_id = f"r_{uuid.uuid4().hex}"
    results[result_id] = frame.reset_index(drop=True)
    return {"id": result_id, "rowCount": len(frame), "schema": describe_columns(frame)}


def describe_columns(frame: pd.DataFrame) -> list[dict]:
    schema = pa.Schema.from_pandas(frame, preserve_index=False)
    return [{"name": field.name, "type": column_type(field.type)} for field in schema]


def column_type(arrow_type: pa.DataType) -> str:
    if (
        pa.types.is_integer(arrow_type)
        or pa.types.is_floating(arrow_type)
        or pa.types.is_decimal(arrow_type)
    ):
        return "number"
    if pa.types.is_string(arrow_type) or pa.types.is_large_string(arrow_type):
        return "text"
    if pa.types.is_boolean(arrow_type):
        return "bool"
    if pa.types.is_timestamp(arrow_type) or pa.types.is_date(arrow_type):
        return "date"
    return "other"


def sorted_frame(frame: pd.DataFrame, sort: dict | None) -> pd.DataFrame:
    if sort is None:
        return frame
    return frame.sort_values(
        sort["column"],
        ascending=sort["direction"] == "asc",
        na_position="last",
        kind="stable",
    )


JSON_VALUES = {
    "number": float,
    "text": str,
    "bool": bool,
    "date": str,
    "geo": str,
    "other": str,
}


def to_json_value(value, column_kind: str):
    """Mirrors the DuckDB executor: numbers as floats, dates and others as text, nulls as None."""
    if is_missing(value):
        return None
    return JSON_VALUES[column_kind](value)


def is_missing(value) -> bool:
    try:
        return bool(pd.isna(value))
    except (TypeError, ValueError):
        return False


def profile_column(series: pd.Series, column: dict) -> dict:
    values = series.dropna()
    profile = {
        "name": column["name"],
        "type": column["type"],
        "count": len(series),
        "nulls": len(series) - len(values),
        "distinct": int(values.nunique()),
        "bins": [],
    }
    if len(values) and column["type"] in RANGED_TYPES:
        profile["min"] = str(values.min())
        profile["max"] = str(values.max())
    if len(values) and column["type"] == "number":
        profile["mean"] = float(values.mean())
        profile["bins"] = histogram([float(value) for value in values])
    return profile


def histogram(values: list[float]) -> list[int]:
    """Equal-width bins between min and max, computed as the DuckDB executor does."""
    low, high = min(values), max(values)
    if low == high:
        return [len(values)]
    bins = [0] * HISTOGRAM_BINS
    for value in values:
        bins[
            min(
                math.floor((value - low) / (high - low) * HISTOGRAM_BINS),
                HISTOGRAM_BINS - 1,
            )
        ] += 1
    return bins
