"""Completes Python code with Jedi, which reads the code and the installed libraries without
running them."""

from dataclasses import dataclass
from typing import Any

import jedi

from nodomics_engine.protocol_types import CodeCompletions, CompletionItem, CompletionKind
from nodomics_engine.result import Err, Ok, Result

MAX_COMPLETIONS = 200
JEDI_KINDS: dict[str, CompletionKind] = {
    "module": "module",
    "class": "class",
    "function": "function",
    "instance": "variable",
    "statement": "variable",
    "param": "variable",
    "property": "property",
    "keyword": "keyword",
}


@dataclass(frozen=True)
class _Completion:
    name: str
    type: str
    description: str


def complete_code(code: str, line: int, column: int) -> Result[CodeCompletions, str]:
    try:
        completions = _complete_with_jedi(code, line, column)
    except ValueError as outside_the_code:
        return Err(str(outside_the_code))
    return Ok(CodeCompletions(items=[_to_item(found) for found in completions[:MAX_COMPLETIONS]]))


def _complete_with_jedi(code: str, line: int, column: int) -> list[_Completion]:
    # Jedi's annotations are incomplete; each completion carries these three strings.
    script: Any = jedi.Script(code)
    return [
        _Completion(str(found.name), str(found.type), str(found.description))
        for found in script.complete(line, column)
    ]


def _to_item(completion: _Completion) -> CompletionItem:
    item: CompletionItem = {
        "label": completion.name,
        "kind": JEDI_KINDS.get(completion.type, "other"),
    }
    return {**item, "detail": completion.description} if completion.description else item
