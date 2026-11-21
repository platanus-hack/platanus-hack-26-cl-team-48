import json
from typing import Any

import pytest

from nodomics_engine.dispatch import Dispatcher, Handler
from nodomics_engine.json_codec import decode_json
from nodomics_engine.protocol_schema import ExecutorSchema, Params
from nodomics_engine.result import Err, Ok, Result
from nodomics_engine.rpc_failure import RpcFailure


def echo_profile(params: Params) -> Result[object, RpcFailure]:
    return Ok({"echo": params["resultId"]})


def expired_profile(_params: Params) -> Result[object, RpcFailure]:
    return Err(RpcFailure(code=-32001, message="Result expired"))


def broken_profile(_params: Params) -> Result[object, RpcFailure]:
    raise RuntimeError("boom")


def respond(schema: ExecutorSchema, handler: Handler, text: str) -> Any:
    reply = Dispatcher(schema, {"exec.profile": handler}).handle_text(text)
    return None if reply is None else decode_json(reply)


def request(method: str, params: object, request_id: int = 1) -> str:
    return json.dumps({"jsonrpc": "2.0", "id": request_id, "method": method, "params": params})


def test_answers_a_request_with_the_handler_result(executor_schema: ExecutorSchema):
    reply = respond(executor_schema, echo_profile, request("exec.profile", {"resultId": "r1"}, 7))

    assert reply == {"jsonrpc": "2.0", "id": 7, "result": {"echo": "r1"}}


def test_answers_unknown_methods_with_method_not_found(executor_schema: ExecutorSchema):
    reply = respond(executor_schema, echo_profile, request("exec.page", {}))

    assert reply["error"]["code"] == -32601


def test_answers_invalid_params_with_invalid_params(executor_schema: ExecutorSchema):
    reply = respond(executor_schema, echo_profile, request("exec.profile", {"resultId": 3}))

    assert reply["error"]["code"] == -32602
    assert reply["id"] == 1


def test_answers_malformed_json_with_parse_error(executor_schema: ExecutorSchema):
    reply = respond(executor_schema, echo_profile, "{not json")

    assert reply == {
        "jsonrpc": "2.0",
        "id": None,
        "error": {"code": -32700, "message": "Parse error"},
    }


def test_answers_messages_that_are_not_json_rpc_with_invalid_request(
    executor_schema: ExecutorSchema,
):
    reply = respond(executor_schema, echo_profile, '{"id": 4, "method": "exec.profile"}')

    assert reply["error"]["code"] == -32600
    assert reply["id"] == 4


def test_ignores_notifications(executor_schema: ExecutorSchema):
    text = json.dumps({"jsonrpc": "2.0", "method": "exec.profile", "params": {"resultId": "r"}})

    assert respond(executor_schema, echo_profile, text) is None


def test_passes_handler_failures_through_as_rpc_errors(executor_schema: ExecutorSchema):
    reply = respond(executor_schema, expired_profile, request("exec.profile", {"resultId": "r1"}))

    assert reply["error"] == {"code": -32001, "message": "Result expired"}


def test_answers_handler_bugs_with_internal_error(executor_schema: ExecutorSchema):
    reply = respond(executor_schema, broken_profile, request("exec.profile", {"resultId": "r1"}))

    assert reply["error"]["code"] == -32603
    assert "boom" in reply["error"]["message"]


def test_treats_missing_params_as_empty(executor_schema: ExecutorSchema):
    text = json.dumps({"jsonrpc": "2.0", "id": 1, "method": "exec.profile"})

    assert respond(executor_schema, echo_profile, text)["error"]["code"] == -32602


def test_answers_null_id_as_a_request(executor_schema: ExecutorSchema):
    text = json.dumps(
        {"jsonrpc": "2.0", "id": None, "method": "exec.profile", "params": {"resultId": "r1"}}
    )

    assert respond(executor_schema, echo_profile, text) == {
        "jsonrpc": "2.0",
        "id": None,
        "result": {"echo": "r1"},
    }


@pytest.mark.parametrize("encoded", ["a", "!!!!", "é"])
def test_answers_invalid_base64_with_invalid_params(executor_schema: ExecutorSchema, encoded: str):
    text = request("exec.import", {"arrow": {"$bytes": encoded}}, 9)

    reply = respond(executor_schema, echo_profile, text)

    assert reply["id"] == 9
    assert reply["error"]["code"] == -32602
