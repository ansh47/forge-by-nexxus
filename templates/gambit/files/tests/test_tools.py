"""Tests for tools.py only — no network, no API key required."""
from {{projectNameSnake}}.tools import ECHO_TOOL


def test_echo_tool_returns_text():
    assert ECHO_TOOL.handler({"text": "hello"}) == "hello"


def test_echo_tool_defaults_to_empty_string():
    assert ECHO_TOOL.handler({}) == ""
