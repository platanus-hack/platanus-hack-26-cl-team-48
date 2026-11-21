from nodomics_engine.protocol_schema import ExecutorSchema
from nodomics_engine.result import Err, Ok


def test_accepts_params_that_match_the_method_schema(executor_schema: ExecutorSchema):
    params = {"resultId": "r1", "offset": 0, "limit": 10}

    parsed = executor_schema.parse_params("exec.page", params)

    assert parsed == Ok(params)


def test_rejects_params_that_break_the_method_schema(executor_schema: ExecutorSchema):
    parsed = executor_schema.parse_params("exec.page", {"resultId": "r1", "offset": 0, "limit": 0})

    assert isinstance(parsed, Err)
    assert "limit" in parsed.error


def test_accepts_bytes_where_the_schema_expects_binary(executor_schema: ExecutorSchema):
    parsed = executor_schema.parse_params("exec.import", {"arrow": b"\x00"})

    assert isinstance(parsed, Ok)


def test_rejects_text_where_the_schema_expects_binary(executor_schema: ExecutorSchema):
    parsed = executor_schema.parse_params("exec.import", {"arrow": "not bytes"})

    assert isinstance(parsed, Err)


def test_knows_every_executor_method(executor_schema: ExecutorSchema):
    assert executor_schema.methods == {
        "exec.hello",
        "exec.run",
        "exec.page",
        "exec.profile",
        "exec.export",
        "exec.import",
        "exec.load",
        "exec.drop",
        "exec.display",
        "exec.complete",
    }
