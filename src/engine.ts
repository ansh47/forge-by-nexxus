import fs from "fs-extra";
import path from "node:path";
import {
  toCamelCase,
  toCompact,
  toKebabCase,
  toPackagePath,
  toPascalCase,
  toSnakeCase,
  toTitleCase,
} from "./case.js";

export type Context = Record<string, string>;

/**
 * Every scaffold gets these for free, derived from the single project-name
 * answer, so individual templates don't have to ask for them.
 */
export function baseContext(rawProjectName: string): Context {
  const projectName = toKebabCase(rawProjectName);
  return {
    projectName,
    projectNamePascal: toPascalCase(rawProjectName),
    projectNameCamel: toCamelCase(rawProjectName),
    projectNameSnake: toSnakeCase(rawProjectName),
    projectNameCompact: toCompact(rawProjectName),
    projectNameHuman: toTitleCase(rawProjectName),
    envPrefix: toSnakeCase(rawProjectName).toUpperCase(),
    year: String(new Date().getFullYear()),
  };
}

/** Adds anything a template's own prompts contributed, plus any derived helpers that need them. */
export function extendContext(ctx: Context, extra: Context): Context {
  const merged: Context = { ...ctx, ...extra };
  if (merged.groupId) {
    merged.groupIdPath = toPackagePath(merged.groupId);
    merged.mainPackage = `${merged.groupId}.${merged.projectNameCompact}`;
    merged.mainPackagePath = toPackagePath(merged.mainPackage);
  }
  return merged;
}

/** A flag counts as "on" unless it's missing, empty, "false" or "0". */
export function isTruthy(value: string | undefined): boolean {
  return value !== undefined && value !== "" && value !== "false" && value !== "0";
}

const TOKEN_RE = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

// {{#if flag}}...{{else}}...{{/if}} — no nesting, no elseif. Resolved before
// {{token}} substitution so tokens inside a kept branch still get replaced.
const BLOCK_IF_RE = /\{\{#if\s+([a-zA-Z0-9_]+)\}\}([\s\S]*?)(?:\{\{else\}\}([\s\S]*?))?\{\{\/if\}\}/g;

function resolveConditionals(content: string, ctx: Context): string {
  return content.replace(BLOCK_IF_RE, (_match, flag: string, truthyBlock: string, falsyBlock?: string) =>
    isTruthy(ctx[flag]) ? truthyBlock : falsyBlock ?? "",
  );
}

export function renderString(content: string, ctx: Context): string {
  const withConditionals = resolveConditionals(content, ctx);
  return withConditionals.replace(TOKEN_RE, (match, key: string) => {
    if (key in ctx) return ctx[key];
    return match; // leave unknown tokens untouched rather than silently blanking them
  });
}

/** Filenames/dirnames use __token__ so they stay valid on every OS and are easy to spot. */
function renderPathSegment(segment: string, ctx: Context): string {
  return segment.replace(/__([a-zA-Z0-9_]+)__/g, (match, key: string) => {
    if (key in ctx) return ctx[key];
    return match;
  });
}

// A path segment starting with __if_<flag>__ gates whether it's included at
// all. Directories are "transparent": when the flag is on, their contents
// are copied straight into the parent (no extra directory level appears in
// the output) unless something follows the marker to rename it. Files need
// a name after the marker, e.g. __if_tailwind__tailwind.config.js.
const GATE_RE = /^__if_([a-zA-Z0-9_]+)__(.*)$/;

export interface RenderResult {
  filesWritten: number;
  destDir: string;
}

/**
 * Copies every file under `srcDir` into `destDir`, rendering {{tokens}} and
 * {{#if flag}}...{{/if}} blocks in file contents, __tokens__ in file/dir
 * names, and honoring __if_<flag>__ gating on paths. All templates here are
 * plain text, so no binary detection is needed.
 */
export async function renderTemplate(
  srcDir: string,
  destDir: string,
  ctx: Context,
): Promise<RenderResult> {
  if (!(await fs.pathExists(srcDir))) {
    throw new Error(`Template files not found at ${srcDir}`);
  }

  let filesWritten = 0;

  async function walk(currentSrc: string, currentDest: string) {
    const entries = await fs.readdir(currentSrc, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(currentSrc, entry.name);
      const gateMatch = entry.name.match(GATE_RE);

      let nameToRender = entry.name;
      if (gateMatch) {
        const [, flag, rest] = gateMatch;
        if (!isTruthy(ctx[flag])) continue; // gated off entirely
        nameToRender = rest; // "" for a directory means "merge transparently"
      }

      if (entry.isDirectory()) {
        const destPath = nameToRender ? path.join(currentDest, renderPathSegment(nameToRender, ctx)) : currentDest;
        await fs.ensureDir(destPath);
        await walk(srcPath, destPath);
      } else {
        if (!nameToRender) {
          throw new Error(
            `"${entry.name}" gates a file but has no name after the flag — use __if_${gateMatch?.[1]}__<filename> instead.`,
          );
        }
        const destPath = path.join(currentDest, renderPathSegment(nameToRender, ctx));
        const raw = await fs.readFile(srcPath, "utf8");
        const rendered = renderString(raw, ctx);
        await fs.ensureDir(path.dirname(destPath));
        await fs.writeFile(destPath, rendered, "utf8");
        filesWritten += 1;
      }
    }
  }

  await fs.ensureDir(destDir);
  await walk(srcDir, destDir);

  return { filesWritten, destDir };
}
