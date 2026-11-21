"""Keeps the matplotlib figures a node's code shows, as PNG images, like a notebook cell would."""

import contextlib
import importlib
import importlib.util
from collections.abc import Generator
from dataclasses import dataclass

MAX_FIGURES_PER_TASK = 20


@dataclass(frozen=True)
class Figure:
    png: bytes
    width: int
    height: int
    title: str


@contextlib.contextmanager
def capturing_figures() -> Generator[list[Figure]]:
    """Turns plt.show() into "keep this figure"; figures still open at the end are kept too.

    matplotlib is optional: without it in the environment, code cannot draw and nothing is kept.
    """
    captured: list[Figure] = []
    if importlib.util.find_spec("matplotlib") is None:
        yield captured
        return
    # Imported only here so that an environment without matplotlib never loads it.
    from nodomics_engine import matplotlib_figures  # noqa: PLC0415

    with matplotlib_figures.keeping_figures(captured, MAX_FIGURES_PER_TASK):
        yield captured
