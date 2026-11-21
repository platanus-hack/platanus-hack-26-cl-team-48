"""JSON text where binary fields travel as {"$bytes": "<base64>"}, as in @nodomics/rpc."""

import base64
import json
from typing import Any

BYTES_KEY = "$bytes"
BASE64_WHITESPACE = " \t\n\r\f"
BASE64_BLOCK_SIZE = 4


def encode_json(value: object) -> str:
    # allow_nan=False because NaN is not valid JSON and the browser's JSON.parse rejects it.
    return json.dumps(value, default=_encode_bytes, allow_nan=False)


def decode_json(text: str) -> object:
    return json.loads(text, object_hook=_decode_bytes)


def _encode_bytes(field: object) -> dict[str, str]:
    if isinstance(field, bytes | bytearray):
        return {BYTES_KEY: base64.b64encode(field).decode("ascii")}
    raise TypeError(f"Not JSON serializable: {type(field).__name__}")


def _decode_bytes(field: dict[str, Any]) -> object:
    encoded = field.get(BYTES_KEY)
    if len(field) == 1 and isinstance(encoded, str):
        return _decode_base64(encoded)
    return field


def _decode_base64(encoded: str) -> bytes:
    normalized = encoded.translate(str.maketrans("", "", BASE64_WHITESPACE))
    if "=" not in normalized:
        normalized += "=" * (-len(normalized) % BASE64_BLOCK_SIZE)
    return base64.b64decode(normalized, validate=True)
