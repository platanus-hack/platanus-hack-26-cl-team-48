import subprocess
from pathlib import Path

import pytest

from nodomics_engine.protocol_schema import (
    DEFAULT_SCHEMA_PATH,
    ExecutorSchema,
    load_executor_schema,
)

REPO_ROOT = Path(__file__).resolve().parents[3]


@pytest.fixture(scope="session")
def executor_schema() -> ExecutorSchema:
    if not DEFAULT_SCHEMA_PATH.exists():
        # The schema is generated from packages/protocol and is not committed.
        subprocess.run(
            ["pnpm", "--filter", "@nodomics/protocol", "export-schema"],
            cwd=REPO_ROOT,
            check=True,
        )
    return load_executor_schema(DEFAULT_SCHEMA_PATH)
