#!/usr/bin/env node
import { Command } from "commander";
import { readFileSync } from "node:fs";
import path from "node:path";
import { createCommand } from "./commands/create.js";
import { lintCommand } from "./commands/lint.js";
import { listCommand } from "./commands/list.js";
import { packageRoot } from "./paths.js";

// Read the version off package.json rather than hardcoding it here, so
// `forge --version` can't drift away from what was actually published.
const { version } = JSON.parse(
  readFileSync(path.join(packageRoot(), "package.json"), "utf8"),
) as { version: string };

const program = new Command();

program
  .name("forge")
  .description("Forge by Nexxus: a personal, extensible project scaffold generator.")
  .version(version);

program
  .command("list")
  .alias("ls")
  .description("Show available templates")
  .action(listCommand);

program
  .command("create")
  .alias("new")
  .description("Scaffold a new project from a template")
  .argument("[template]", "template id (omit to pick interactively)")
  .argument("[name]", "project name (omit to be prompted)")
  .option("-d, --dir <path>", "destination directory (default: ./<project-name>)")
  .option("-f, --force", "scaffold even if the destination directory isn't empty", false)
  .option("-y, --yes", "skip prompts, use defaults for anything not passed via --set", false)
  .option("--set <key=value>", "supply a template prompt's answer (repeatable)", (v, acc: string[]) => [...acc, v], [])
  .option("--dry-run", "list the files that would be written without writing them", false)
  .option("-i, --install", "run the template's install command in the new project", false)
  .action(createCommand);

program
  .command("lint")
  .description("Check templates for config mistakes and unresolvable tokens")
  .argument("[template]", "template id (omit to check them all)")
  .action(lintCommand);

program.parseAsync(process.argv);
