import * as p from "@clack/prompts";
import { execSync } from "node:child_process";
import fs from "fs-extra";
import path from "node:path";
import pc from "picocolors";
import { baseContext, extendContext, renderString, renderTemplate } from "../engine.js";
import { getTemplate, listTemplates, type PromptSpec, type ResolvedTemplate } from "../templates.js";

export interface CreateOptions {
  dir?: string;
  force?: boolean;
  yes?: boolean;
  set?: string[];
  dryRun?: boolean;
  install?: boolean;
}

function parseSetFlags(pairs: string[] | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const pair of pairs ?? []) {
    const eq = pair.indexOf("=");
    if (eq === -1) {
      throw new Error(`--set expects key=value, got "${pair}"`);
    }
    out[pair.slice(0, eq)] = pair.slice(eq + 1);
  }
  return out;
}

/** Turns a multiselect answer ("framer-motion,tailwind" or []) into {name, flag1, flag2, ...}. */
function applyMultiselect(prompt: PromptSpec, selected: string[], extra: Record<string, string>): void {
  const chosen = new Set(selected);
  extra[prompt.name] = selected.join(", ");
  for (const option of prompt.options ?? []) {
    extra[option.flag] = chosen.has(option.value) ? "true" : "";
  }
}

export async function createCommand(
  templateIdArg: string | undefined,
  projectNameArg: string | undefined,
  options: CreateOptions,
): Promise<void> {
  const templates = await listTemplates();
  if (templates.length === 0) {
    console.error(pc.red("No templates found under templates/. Nothing to scaffold."));
    process.exitCode = 1;
    return;
  }

  const preset = parseSetFlags(options.set);
  const interactive = Boolean(process.stdin.isTTY) && !options.yes;

  if (interactive) {
    await runInteractive(templates, templateIdArg, projectNameArg, preset, options);
  } else {
    await runNonInteractive(templates, templateIdArg, projectNameArg, preset, options);
  }
}

async function runNonInteractive(
  templates: ResolvedTemplate[],
  templateIdArg: string | undefined,
  projectNameArg: string | undefined,
  preset: Record<string, string>,
  options: CreateOptions,
): Promise<void> {
  if (!templateIdArg || !projectNameArg) {
    console.error(
      pc.red(
        "Non-interactive mode (no TTY, or --yes) needs both arguments: " +
          "forge create <template> <name> [--set key=value ...]",
      ),
    );
    process.exitCode = 1;
    return;
  }

  const template = await getTemplate(templateIdArg);
  if (!template) {
    console.error(pc.red(`Unknown template "${templateIdArg}". Run "forge list" to see available ones.`));
    process.exitCode = 1;
    return;
  }

  const extra: Record<string, string> = {};
  for (const prompt of template.prompts ?? []) {
    if (prompt.type === "multiselect") {
      const raw = preset[prompt.name] ?? prompt.default ?? "";
      const selected = raw
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
      applyMultiselect(prompt, selected, extra);
      continue;
    }

    const value = preset[prompt.name] ?? prompt.default;
    if (value === undefined) {
      console.error(pc.red(`Missing required value "${prompt.name}". Pass --set ${prompt.name}=<value>.`));
      process.exitCode = 1;
      return;
    }
    extra[prompt.name] = value;
  }

  await scaffold(template, projectNameArg, extra, options);
}

async function runInteractive(
  templates: ResolvedTemplate[],
  templateIdArg: string | undefined,
  projectNameArg: string | undefined,
  preset: Record<string, string>,
  options: CreateOptions,
): Promise<void> {
  p.intro(pc.bold("forge — new project"));

  let templateId = templateIdArg;
  if (!templateId) {
    const picked = await p.select({
      message: "Which template?",
      options: templates.map((t) => ({ value: t.id, label: t.name, hint: t.description })),
    });
    if (p.isCancel(picked)) return cancel();
    templateId = picked;
  }

  const template = await getTemplate(templateId);
  if (!template) {
    p.cancel(`Unknown template "${templateId}". Run "forge list" to see available ones.`);
    process.exitCode = 1;
    return;
  }

  let projectName = projectNameArg;
  if (!projectName) {
    const answered = await p.text({
      message: "Project name?",
      placeholder: "my-new-project",
      validate: (value) => (value.trim().length === 0 ? "Project name can't be empty" : undefined),
    });
    if (p.isCancel(answered)) return cancel();
    projectName = answered;
  }

  const extra: Record<string, string> = {};
  for (const prompt of template.prompts ?? []) {
    if (prompt.type === "multiselect") {
      if (preset[prompt.name] !== undefined) {
        const selected = preset[prompt.name]
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean);
        applyMultiselect(prompt, selected, extra);
        continue;
      }
      const answered = await p.multiselect({
        message: prompt.message,
        options: (prompt.options ?? []).map((o) => ({ value: o.value, label: o.label, hint: o.hint })),
        required: false,
      });
      if (p.isCancel(answered)) return cancel();
      applyMultiselect(prompt, answered, extra);
      continue;
    }

    if (preset[prompt.name] !== undefined) {
      extra[prompt.name] = preset[prompt.name];
      continue;
    }
    const answered = await p.text({
      message: prompt.message,
      placeholder: prompt.default,
      initialValue: prompt.default,
    });
    if (p.isCancel(answered)) return cancel();
    extra[prompt.name] = answered.trim().length > 0 ? answered : prompt.default ?? "";
  }

  await scaffold(template, projectName, extra, options, /* viaClack */ true);
}

async function scaffold(
  template: ResolvedTemplate,
  projectName: string,
  extra: Record<string, string>,
  options: CreateOptions,
  viaClack = false,
): Promise<void> {
  const ctx = extendContext(baseContext(projectName), extra);
  const destDir = path.resolve(options.dir ?? ctx.projectName);
  const shownDest = path.relative(process.cwd(), destDir) || destDir;
  const dryRun = Boolean(options.dryRun);

  if (
    !dryRun &&
    (await fs.pathExists(destDir)) &&
    (await fs.readdir(destDir)).length > 0 &&
    !options.force
  ) {
    const message =
      `"${shownDest}" already exists and isn't empty. Use --force to scaffold into it anyway.`;
    if (viaClack) p.cancel(message);
    else console.error(pc.red(message));
    process.exitCode = 1;
    return;
  }

  const label = dryRun ? `Previewing ${template.name}` : `Scaffolding ${template.name}`;
  const spinner = viaClack ? p.spinner() : undefined;
  spinner?.start(label);
  if (!viaClack) console.log(label + "…");

  const result = await renderTemplate(template.filesDir, destDir, ctx, { dryRun });
  const doneMessage = dryRun
    ? `${result.filesWritten} files would be written to ${shownDest}`
    : `Wrote ${result.filesWritten} files to ${shownDest}`;
  if (spinner) spinner.stop(doneMessage);
  else console.log(pc.green(doneMessage));

  if (dryRun) {
    console.log();
    for (const file of result.files) console.log("  " + pc.dim(file));
    console.log();
    if (viaClack) p.outro(pc.green("Dry run, nothing written."));
    return;
  }

  if (options.install) {
    if (!template.install) {
      console.log(pc.yellow(`\n  ${template.id} has no install command configured, skipping --install.\n`));
    } else {
      console.log(pc.dim(`\n  Running: ${template.install}\n`));
      try {
        execSync(template.install, { cwd: destDir, stdio: "inherit" });
      } catch {
        // The scaffold itself succeeded, so report and carry on rather than
        // leaving the user thinking nothing was created.
        console.error(pc.red(`\n  Install command failed. The project is still at ${shownDest}.\n`));
        process.exitCode = 1;
      }
    }
  }

  if (template.postInstall && template.postInstall.length > 0) {
    console.log();
    for (const line of template.postInstall) {
      console.log("  " + renderString(line, ctx));
    }
    console.log();
  }

  if (viaClack) p.outro(pc.green("Done."));
}

function cancel(): void {
  p.cancel("Cancelled.");
}
