from nodomics_engine.figure_capture import MAX_FIGURES_PER_TASK
from nodomics_engine.protocol_types import PythonTask
from nodomics_engine.python_runner import run_python
from nodomics_engine.result import Err, Ok
from nodomics_engine.result_store import ResultStore
from nodomics_engine.task_context import TaskContext, TaskOutcome

PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"

SHOWS_TWO_FIGURES = """
import matplotlib.pyplot as plt
import pandas as pd

def run(inputs, params):
    plt.figure(figsize=(4, 3))
    plt.plot([1, 2, 3])
    plt.title("Ventas")
    plt.show()
    plt.figure(figsize=(2, 2))
    plt.bar(["a"], [1])
    return {"out": pd.DataFrame({"x": [1]})}
"""


def python_task(code: str) -> PythonTask:
    return {"kind": "python", "code": code, "entry": "run", "inputs": {}, "params": {}}


def run(code: str, store: ResultStore) -> TaskOutcome:
    return run_python(python_task(code), TaskContext(store=store, log=lambda _line: None))


def test_keeps_each_shown_figure_and_the_ones_left_open_as_png():
    store = ResultStore()

    outcome = run(SHOWS_TWO_FIGURES, store)

    assert isinstance(outcome, Ok)
    shown, left_open = outcome.value["displays"]
    assert shown["mime"] == "image/png"
    assert (shown["width"], shown["height"], shown.get("title")) == (400, 300, "Ventas")
    assert "title" not in left_open
    figure = store.get_figure(shown["id"])
    assert figure is not None
    assert figure.startswith(PNG_SIGNATURE)


def test_draws_figures_at_twice_their_size_for_sharp_screens():
    store = ResultStore()

    outcome = run(SHOWS_TWO_FIGURES, store)

    assert isinstance(outcome, Ok)
    shown = outcome.value["displays"][0]
    figure = store.get_figure(shown["id"])
    assert figure is not None
    assert int.from_bytes(figure[16:20]) == 2 * shown["width"]


def test_reports_no_figures_when_the_code_shows_none():
    outcome = run("import pandas as pd\ndef run(inputs, params):\n    return {}\n", ResultStore())

    assert isinstance(outcome, Ok)
    assert outcome.value["displays"] == []


def test_discards_the_figures_of_code_that_fails():
    code = (
        "import matplotlib.pyplot as plt\n"
        "def run(inputs, params):\n"
        "    plt.plot([1])\n"
        "    raise ValueError()\n"
    )
    store = ResultStore()

    assert isinstance(run(code, store), Err)
    outcome = run("def run(inputs, params):\n    return {}\n", store)

    assert isinstance(outcome, Ok)
    assert outcome.value["displays"] == []


def test_keeps_at_most_a_limited_number_of_figures():
    code = (
        "import matplotlib.pyplot as plt\n"
        "def run(inputs, params):\n"
        f"    for _ in range({MAX_FIGURES_PER_TASK + 3}):\n"
        "        plt.plot([1])\n"
        "        plt.show()\n"
        "    return {}\n"
    )

    outcome = run(code, ResultStore())

    assert isinstance(outcome, Ok)
    assert len(outcome.value["displays"]) == MAX_FIGURES_PER_TASK
