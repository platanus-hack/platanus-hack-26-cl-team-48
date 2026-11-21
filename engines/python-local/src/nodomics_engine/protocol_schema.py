"""Parses incoming executor params against the JSON Schema exported by @nodomics/protocol."""

import json
from collections.abc import Mapping
from dataclasses import dataclass
from pathlib import Path
from typing import Any, cast

from jsonschema import Draft202012Validator, validators
from jsonschema.protocols import Validator

from nodomics_engine.result import Err, Ok, Result

DEFAULT_SCHEMA_PATH = (
    Path(__file__).resolve().parents[4] / "packages/protocol/schema/protocol.schema.json"
)

type Params = dict[str, Any]


@dataclass(frozen=True)
class ExecutorSchema:
    validators: Mapping[str, Validator]

    @property
    def methods(self) -> set[str]:
        return set(self.validators)

    def parse_params(self, method: str, params: object) -> Result[Params, str]:
        # Decoded JSON is untyped by nature; the validator is what gives it a type.
        error = next(iter(self.validators[method].iter_errors(cast(Any, params))), None)
        if error is not None:
            return Err(f"{error.json_path}: {error.message}")
        # Validated above against the protocol schema, whose params are always objects.
        return Ok(cast(Params, params))


def load_executor_schema(path: Path) -> ExecutorSchema:
    requests: dict[str, dict[str, Any]] = json.loads(path.read_text())["executor"]["requests"]
    return ExecutorSchema(
        {method: BinaryAwareValidator(spec["params"]) for method, spec in requests.items()}
    )


def _is_binary(_checker: object, instance: object) -> bool:
    return isinstance(instance, bytes)


# TypeBox exports binary fields as {"type": "Uint8Array"}; the JSON codec turns them into bytes.
# The jsonschema stubs leave `extend` untyped; it returns a validator class like the one it extends.
BinaryAwareValidator = cast(
    type[Draft202012Validator],
    validators.extend(  # pyright: ignore[reportUnknownMemberType]
        Draft202012Validator,
        type_checker=Draft202012Validator.TYPE_CHECKER.redefine("Uint8Array", _is_binary),
    ),
)
