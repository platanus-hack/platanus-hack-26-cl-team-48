"""What this executor offers to the coordinator in exec.hello."""

from importlib import metadata
from typing import Literal, TypedDict

EXECUTOR_NAME = "python-local"


class Capabilities(TypedDict):
    executor: str
    runtimes: list[Literal["sql", "python"]]
    packages: list[str]


def describe_capabilities() -> Capabilities:
    return {
        "executor": EXECUTOR_NAME,
        "runtimes": ["sql", "python"],
        "packages": sorted({dist.metadata["Name"].lower() for dist in metadata.distributions()}),
    }
