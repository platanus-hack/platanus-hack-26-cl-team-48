"""Turns one incoming JSON-RPC text message into its reply using a table of method handlers."""

import binascii
import json
from collections.abc import Callable, Mapping
from dataclasses import dataclass
from typing import Any, cast

from nodomics_engine.json_codec import decode_json, encode_json
from nodomics_engine.protocol_schema import ExecutorSchema, Params
from nodomics_engine.result import Err, Ok, Result
from nodomics_engine.rpc_failure import (
    INTERNAL_ERROR,
    INVALID_PARAMS,
    INVALID_REQUEST,
    METHOD_NOT_FOUND,
    PARSE_ERROR,
    RpcFailure,
)

type Handler = Callable[[Params], Result[object, RpcFailure]]
type RequestId = int | str | None

_NO_ID = object()


@dataclass(frozen=True)
class _Call:
    id: object
    method: str
    params: object

    @property
    def is_notification(self) -> bool:
        return self.id is _NO_ID


@dataclass(frozen=True)
class Dispatcher:
    schema: ExecutorSchema
    handlers: Mapping[str, Handler]

    def handle_text(self, text: str) -> str | None:
        try:
            message = decode_json(text)
        except json.JSONDecodeError:
            return _reply(None, Err(RpcFailure(PARSE_ERROR, "Parse error")))
        except (binascii.Error, ValueError):
            return _reply(
                _request_id(json.loads(text)),
                Err(RpcFailure(INVALID_PARAMS, "Invalid base64 bytes")),
            )
        call = _parse_call(message)
        if call is None:
            return _reply(_request_id(message), Err(RpcFailure(INVALID_REQUEST, "Invalid request")))
        if call.is_notification:
            return None
        return _reply(_request_id(message), self._answer(call.method, call.params))

    def _answer(self, method: str, params: object) -> Result[object, RpcFailure]:
        handler = self.handlers.get(method)
        if handler is None:
            return Err(RpcFailure(METHOD_NOT_FOUND, f"Method not found: {method}"))
        match self.schema.parse_params(method, params):
            case Err(error=issue):
                return Err(RpcFailure(INVALID_PARAMS, f"Invalid params: {issue}"))
            case Ok(value=parsed):
                return _call_guarded(handler, parsed)


def _parse_call(message: object) -> _Call | None:
    fields = _as_object(message)
    request_id = fields.get("id", _NO_ID)
    is_valid = (
        fields.get("jsonrpc") == "2.0"
        and isinstance(fields.get("method"), str)
        and (request_id is _NO_ID or request_id is None or isinstance(request_id, int | str))
    )
    return _Call(request_id, str(fields["method"]), fields.get("params", {})) if is_valid else None


def _request_id(message: object) -> RequestId:
    request_id = _as_object(message).get("id")
    return request_id if isinstance(request_id, int | str) else None


def _as_object(message: object) -> dict[str, object]:
    # JSON objects decode to dicts with string keys; anything else has no fields.
    return cast(dict[str, object], message) if isinstance(message, dict) else {}


def _call_guarded(handler: Handler, params: Params) -> Result[object, RpcFailure]:
    # A handler bug answers with INTERNAL_ERROR instead of taking the connection down.
    try:
        return handler(params)
    except Exception as bug:
        return Err(RpcFailure(INTERNAL_ERROR, f"Internal error: {bug!r}"))


def _reply(request_id: RequestId, outcome: Result[object, RpcFailure]) -> str:
    body: dict[str, Any] = {"jsonrpc": "2.0", "id": request_id}
    match outcome:
        case Ok(value=value):
            return encode_json({**body, "result": value})
        case Err(error=failure):
            return encode_json({**body, "error": failure.to_json()})
