import fs from "fs-extra";
import path from "node:path";
import { templatesRoot } from "./paths.js";

export interface MultiselectOption {
  /** Value the user picks between (also what --set <promptName>=<value>,<value> matches against) */
  value: string;
  /** Shown in the interactive checkbox list */
  label: string;
  /** Context variable set to "true" (selected) or "" (not selected) — use as {{#if flag}} in template files */
  flag: string;
  hint?: string;
}

export interface PromptSpec {
  /** Variable name, available in templates as {{name}} (joined ", " for multiselect) */
  name: string;
  /** Question shown to the user */
  message: string;
  /** "text" (default) asks one free-text question; "multiselect" offers a checkbox list */
  type?: "text" | "multiselect";
  /** Default value for a text prompt (can reference other vars later if you extend this) */
  default?: string;
  /** Required when type is "multiselect" */
  options?: MultiselectOption[];
}

export interface TemplateConfig {
  id: string;
  name: string;
  description: string;
  /** Extra questions beyond the project name, e.g. a Java group ID */
  prompts?: PromptSpec[];
  /** Lines printed after a successful scaffold, tokens rendered same as template files */
  postInstall?: string[];
}

export interface ResolvedTemplate extends TemplateConfig {
  /** Absolute path to this template's root (contains forge.template.json + files/) */
  dir: string;
  /** Absolute path to the files that actually get copied */
  filesDir: string;
}

const CONFIG_FILE = "forge.template.json";

export async function listTemplates(): Promise<ResolvedTemplate[]> {
  const root = templatesRoot();
  if (!(await fs.pathExists(root))) return [];

  const entries = await fs.readdir(root, { withFileTypes: true });
  const templates: ResolvedTemplate[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const dir = path.join(root, entry.name);
    const configPath = path.join(dir, CONFIG_FILE);
    if (!(await fs.pathExists(configPath))) continue;

    const config = (await fs.readJson(configPath)) as TemplateConfig;
    templates.push({
      ...config,
      dir,
      filesDir: path.join(dir, "files"),
    });
  }

  return templates.sort((a, b) => a.id.localeCompare(b.id));
}

export async function getTemplate(id: string): Promise<ResolvedTemplate | undefined> {
  const templates = await listTemplates();
  return templates.find((t) => t.id === id);
}
