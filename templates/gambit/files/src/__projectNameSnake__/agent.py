"""Minimal agent loop: send a task to Claude, execute any tool calls it
requests, feed the results back, repeat until it gives a final answer.

Deliberately small — swap the model, add tools in tools.py, add
retries/logging/persistence as your real use case needs.
"""
from __future__ import annotations

import os
from typing import Any

from anthropic import Anthropic

from .tools import DEFAULT_TOOLS, Tool

DEFAULT_MODEL = os.environ.get("{{envPrefix}}_MODEL", "claude-sonnet-4-5")


class Agent:
    def __init__(self, tools: list[Tool] | None = None, model: str = DEFAULT_MODEL) -> None:
        self.client = Anthropic()  # reads ANTHROPIC_API_KEY from the environment
        self.tools = {t.name: t for t in (tools or DEFAULT_TOOLS)}
        self.model = model

    def _tool_specs(self) -> list[dict[str, Any]]:
        return [
            {"name": t.name, "description": t.description, "input_schema": t.input_schema}
            for t in self.tools.values()
        ]

    def run(self, task: str, max_turns: int = 10) -> str:
        messages: list[dict[str, Any]] = [{"role": "user", "content": task}]

        for _ in range(max_turns):
            response = self.client.messages.create(
                model=self.model,
                max_tokens=1024,
                tools=self._tool_specs(),
                messages=messages,
            )

            if response.stop_reason != "tool_use":
                return "".join(block.text for block in response.content if block.type == "text")

            messages.append({"role": "assistant", "content": response.content})

            tool_results = []
            for block in response.content:
                if block.type != "tool_use":
                    continue
                tool = self.tools.get(block.name)
                result = tool.handler(block.input) if tool else f"Unknown tool: {block.name}"
                tool_results.append(
                    {"type": "tool_result", "tool_use_id": block.id, "content": result}
                )
            messages.append({"role": "user", "content": tool_results})

        return "Gave up after max_turns without a final answer."
