#!/usr/bin/env node
import { Command } from "commander";
import { createCommand } from "./commands/create.js";
import { listCommand } from "./commands/list.js";

const program = new Command();

program
  .name("forge")
  .description("Forge by Nexxus: a personal, extensible project scaffold generator.")
  .version("0.1.0");

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
  .action(createCommand);

program.parseAsync(process.argv);
