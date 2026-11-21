"""JSON-RPC error codes: the standard ones and the Nodomics ones from @nodomics/protocol."""

from dataclasses import dataclass

PARSE_ERROR = -32700
INVALID_REQUEST = -32600
METHOD_NOT_FOUND = -32601
INVALID_PARAMS = -32602
INTERNAL_ERROR = -32603
RESULT_EXPIRED = -32001


@dataclass(frozen=True)
class RpcFailure:
    code: int
    message: str
    data: object = None

    def to_json(self) -> dict[str, object]:
        error: dict[str, object] = {"code": self.code, "message": self.message}
        return error if self.data is None else {**error, "data": self.data}
