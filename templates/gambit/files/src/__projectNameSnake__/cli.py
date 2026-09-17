"""Entry point installed as the `{{projectName}}` command."""
from __future__ import annotations

import sys

from dotenv import load_dotenv

from .agent import Agent


def main() -> None:
    load_dotenv()

    if len(sys.argv) < 2:
        print('Usage: {{projectName}} "<task>"')
        raise SystemExit(1)

    task = " ".join(sys.argv[1:])
    agent = Agent()
    print(agent.run(task))


if __name__ == "__main__":
    main()
