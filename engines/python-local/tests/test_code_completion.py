from nodomics_engine.code_completion import complete_code
from nodomics_engine.result import Err, Ok


def test_completes_the_members_of_an_installed_library():
    completions = complete_code("import pandas as pd\npd.read_cs", line=2, column=10)

    assert isinstance(completions, Ok)
    assert {"label": "read_csv", "kind": "function", "detail": "def read_csv"} in (
        completions.value["items"]
    )


def test_completes_the_names_of_installed_modules_after_import():
    completions = complete_code("import pyar", line=1, column=11)

    assert isinstance(completions, Ok)
    items = completions.value["items"]
    assert any(item["label"] == "pyarrow" and item["kind"] == "module" for item in items)


def test_rejects_a_position_outside_the_code():
    assert isinstance(complete_code("x = 1", line=3, column=0), Err)
