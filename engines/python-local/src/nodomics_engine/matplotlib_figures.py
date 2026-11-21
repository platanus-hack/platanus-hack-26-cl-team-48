"""Draws matplotlib figures in memory instead of on a screen, and keeps them as PNG."""

import contextlib
import io
from collections.abc import Callable, Generator

import matplotlib

# There is no screen to show figures on; Agg draws them in memory.
matplotlib.use("Agg")

from matplotlib import pyplot
from matplotlib.figure import Figure as PlotFigure

from nodomics_engine.figure_capture import Figure

# Drawn at twice their size so they stay sharp on high-density screens.
PIXEL_DENSITY = 2


@contextlib.contextmanager
def keeping_figures(captured: list[Figure], limit: int) -> Generator[None]:
    # matplotlib's stubs leave the **kwargs of pyplot.show and pyplot.figure untyped.
    original_show: Callable[..., None] = pyplot.show  # pyright: ignore[reportUnknownMemberType, reportUnknownVariableType]

    def show(*_args: object, **_kwargs: object) -> None:
        _keep_open_figures(captured, limit)

    pyplot.show = show
    try:
        yield
        _keep_open_figures(captured, limit)
    finally:
        pyplot.show = original_show
        pyplot.close("all")


def _keep_open_figures(captured: list[Figure], limit: int) -> None:
    for number in pyplot.get_fignums():
        figure = pyplot.figure(number)  # pyright: ignore[reportUnknownMemberType]
        if len(captured) < limit:
            captured.append(_render(figure))
        pyplot.close(figure)


def _render(figure: PlotFigure) -> Figure:
    buffer = io.BytesIO()
    # matplotlib's stubs leave savefig's keyword arguments untyped.
    figure.savefig(  # pyright: ignore[reportUnknownMemberType]
        buffer, format="png", dpi=figure.dpi * PIXEL_DENSITY
    )
    width, height = figure.get_size_inches() * figure.dpi
    return Figure(buffer.getvalue(), round(width), round(height), _title_of(figure))


def _title_of(figure: PlotFigure) -> str:
    titles = [figure.get_suptitle(), *(axes.get_title() for axes in figure.axes)]
    return next((title for title in titles if title), "")
