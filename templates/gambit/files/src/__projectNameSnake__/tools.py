"""Define your agent's tools here. Each tool is a name, a JSON schema Claude
uses to know how to call it, and a handler that actually does the work.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable


@dataclass
class Tool:
    name: str
    description: str
    input_schema: dict[str, Any]
    handler: Callable[[dict[str, Any]], str]


def _echo(input: dict[str, Any]) -> str:
    return str(input.get("text", ""))


ECHO_TOOL = Tool(
    name="echo",
    description="Echoes back whatever text you give it. Replace with a real tool.",
    input_schema={
        "type": "object",
        "properties": {"text": {"type": "string"}},
        "required": ["text"],
    },
    handler=_echo,
)

DEFAULT_TOOLS: list[Tool] = [ECHO_TOOL]
