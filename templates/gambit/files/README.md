# {{projectNameHuman}}

Scaffolded with `forge` from the `python-agent` template: a minimal Claude-powered
agent loop, packaged as an installable CLI.

- `src/{{projectNameSnake}}/tools.py` — define your tools here (one example: `echo`)
- `src/{{projectNameSnake}}/agent.py` — the loop: send task → run any requested tool calls → feed results back → repeat
- `src/{{projectNameSnake}}/cli.py` — entry point installed as the `{{projectName}}` command

## Setup

```bash
python -m venv .venv && source .venv/bin/activate
pip install -e '.[dev]'
cp .env.example .env   # fill in ANTHROPIC_API_KEY
```

## Run

```bash
{{projectName}} "say hello using the echo tool"
```

## Test

```bash
pytest
```

Tests only cover `tools.py` — pure functions, no network calls — so they run
without an API key. Add integration tests separately once you're ready to hit
the real API.

## Next steps

- Add real tools in `tools.py` (each is just a name + JSON schema + handler).
- `agent.py`'s `max_turns` caps how many tool round-trips a single task can take — raise it for longer-running tasks.
- Nothing here persists state between runs; add that once you need it.
