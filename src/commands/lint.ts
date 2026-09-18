import fs from "fs-extra";
import path from "node:path";
import pc from "picocolors";
import {
  BASE_CONTEXT_KEYS,
  BLOCK_IF_RE,
  GATE_RE,
  GROUP_ID_DERIVED_KEYS,
  looksBinary,
  TEMPLATE_SUFFIX,
  TOKEN_RE,
} from "../engine.js";
import { getTemplate, listTemplates, type ResolvedTemplate } from "../templates.js";

interface Problem {
  file: string;
  message: string;
}

/**
 * Python dunder files (__init__.py and friends) have exactly the same shape as
 * a __token__ path reference. They're literal filenames, not variables, so they
 * aren't reported as unresolvable. The flip side matters too: a template that
 * genuinely defines a variable by one of these names would have such files
 * rewritten at scaffold time, which is worth warning about.
 */
const LITERAL_DUNDERS = new Set(["init", "main", "pycache", "all", "version"]);

/** Everything a template can legitimately reference, given its own prompts. */
function knownVariables(template: ResolvedTemplate): Set<string> {
  const known = new Set<string>(BASE_CONTEXT_KEYS);

  for (const prompt of template.prompts ?? []) {
    known.add(prompt.name);
    for (const option of prompt.options ?? []) known.add(option.flag);
    if (prompt.name === "groupId") {
      for (const derived of GROUP_ID_DERIVED_KEYS) known.add(derived);
    }
  }

  return known;
}

function checkConfig(template: ResolvedTemplate): Problem[] {
  const problems: Problem[] = [];
  const configFile = "forge.template.json";

  if (!template.id) problems.push({ file: configFile, message: "missing \"id\"" });
  if (!template.name) problems.push({ file: configFile, message: "missing \"name\"" });
  if (!template.description) problems.push({ file: configFile, message: "missing \"description\"" });

  const dirName = path.basename(template.dir);
  if (template.id && template.id !== dirName) {
    problems.push({
      file: configFile,
      message: `id "${template.id}" doesn't match its directory "${dirName}", which is confusing to navigate`,
    });
  }

  for (const prompt of template.prompts ?? []) {
    if (!prompt.name) problems.push({ file: configFile, message: "a prompt is missing \"name\"" });
    if (!prompt.message) {
      problems.push({ file: configFile, message: `prompt "${prompt.name}" is missing "message"` });
    }
    if (prompt.type === "multiselect") {
      if (!prompt.options || prompt.options.length === 0) {
        problems.push({
          file: configFile,
          message: `multiselect prompt "${prompt.name}" has no options`,
        });
      }
      for (const option of prompt.options ?? []) {
        if (!option.value || !option.label || !option.flag) {
          problems.push({
            file: configFile,
            message: `an option of "${prompt.name}" is missing value, label or flag`,
          });
        }
      }
    }
  }

  return problems;
}

async function checkFiles(template: ResolvedTemplate, known: Set<string>): Promise<Problem[]> {
  const problems: Problem[] = [];

  if (!(await fs.pathExists(template.filesDir))) {
    return [{ file: "files/", message: "template has no files/ directory" }];
  }

  async function walk(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      const relative = path.relative(template.filesDir, full);

      const gate = entry.name.match(GATE_RE);
      if (gate && !known.has(gate[1])) {
        problems.push({
          file: relative,
          message: `gated on "${gate[1]}", which no prompt provides`,
        });
      }

      if (entry.isDirectory()) {
        await walk(full);
        continue;
      }

      // __token__ in a filename, ignoring the __if_flag__ gate prefix.
      const nameToScan = gate ? gate[2] : entry.name;
      for (const match of nameToScan.matchAll(/__([a-zA-Z0-9_]+)__/g)) {
        const token = match[1];
        const isDunder = LITERAL_DUNDERS.has(token);

        if (isDunder && known.has(token)) {
          problems.push({
            file: relative,
            message: `"${token}" is both a template variable and a Python dunder, so this filename would be rewritten at scaffold time. Rename the variable.`,
          });
        } else if (!isDunder && !known.has(token)) {
          problems.push({
            file: relative,
            message: `filename references "${token}", which no prompt provides`,
          });
        }
      }

      const raw = await fs.readFile(full);
      if (looksBinary(raw)) continue; // nothing to substitute in a binary payload
      const content = raw.toString("utf8");

      // A file carrying conditional blocks is not valid in its own language,
      // so editors report it as broken source. The .tmpl suffix keeps them out
      // of it and is stripped when the file is written.
      if (content.includes("{{#if") && !entry.name.endsWith(TEMPLATE_SUFFIX)) {
        problems.push({
          file: relative,
          message: `contains conditional blocks, so it should be named "${entry.name}${TEMPLATE_SUFFIX}" to stop editors reporting it as broken source`,
        });
      }

      for (const match of content.matchAll(BLOCK_IF_RE)) {
        if (!known.has(match[1])) {
          problems.push({
            file: relative,
            message: `{{#if ${match[1]}}} references a flag no prompt provides`,
          });
        }
      }

      // Strip conditional markers before scanning for plain tokens so the
      // flag names inside them aren't double-reported.
      const withoutMarkers = content.replace(/\{\{#if\s+[a-zA-Z0-9_]+\}\}|\{\{else\}\}|\{\{\/if\}\}/g, "");
      const seen = new Set<string>();
      for (const match of withoutMarkers.matchAll(TOKEN_RE)) {
        if (!known.has(match[1]) && !seen.has(match[1])) {
          seen.add(match[1]);
          problems.push({
            file: relative,
            message: `{{${match[1]}}} references a variable no prompt provides`,
          });
        }
      }
    }
  }

  await walk(template.filesDir);
  return problems;
}

async function lintTemplate(template: ResolvedTemplate): Promise<Problem[]> {
  const known = knownVariables(template);
  return [...checkConfig(template), ...(await checkFiles(template, known))];
}

export async function lintCommand(templateId?: string): Promise<void> {
  let templates: ResolvedTemplate[];
  if (templateId) {
    const one = await getTemplate(templateId);
    templates = one ? [one] : [];
  } else {
    templates = await listTemplates();
  }

  if (templates.length === 0) {
    console.error(
      pc.red(
        templateId
          ? `Unknown template "${templateId}". Run "forge list" to see available ones.`
          : "No templates found under templates/.",
      ),
    );
    process.exitCode = 1;
    return;
  }

  let total = 0;

  for (const template of templates) {
    const problems = await lintTemplate(template);
    total += problems.length;

    if (problems.length === 0) {
      console.log(`${pc.green("ok")}  ${template.id}`);
      continue;
    }

    console.log(`${pc.red("!!")}  ${template.id}`);
    for (const problem of problems) {
      console.log(`      ${pc.dim(problem.file)}: ${problem.message}`);
    }
  }

  if (total > 0) {
    console.log(pc.red(`\n${total} problem${total === 1 ? "" : "s"} found.`));
    process.exitCode = 1;
  } else {
    const subject = templates.length === 1 ? "template looks" : "templates look";
    console.log(pc.green(`\n${templates.length} ${subject} fine.`));
  }
}
