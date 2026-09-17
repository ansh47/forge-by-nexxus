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

/** Names of the always-present context variables, for `forge lint`. */
export const BASE_CONTEXT_KEYS = Object.keys(baseContext("sample project"));

/** Variables derived automatically when a template asks for `groupId`. */
export const GROUP_ID_DERIVED_KEYS = ["groupIdPath", "mainPackage", "mainPackagePath"];

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

export const TOKEN_RE = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

// {{#if flag}}...{{else}}...{{/if}} — no nesting, no elseif. Resolved before
// {{token}} substitution so tokens inside a kept branch still get replaced.
export const BLOCK_IF_RE =
  /\{\{#if\s+([a-zA-Z0-9_]+)\}\}([\s\S]*?)(?:\{\{else\}\}([\s\S]*?))?\{\{\/if\}\}/g;

// A conditional marker sitting alone on its own line shouldn't leave a blank
// line behind when the block is dropped (or kept). Collapsing the line down to
// just the marker first means the branch content keeps its own line breaks and
// nothing else is left over either way.
const STANDALONE_MARKER_RE =
  /^[ \t]*(\{\{#if\s+[a-zA-Z0-9_]+\}\}|\{\{else\}\}|\{\{\/if\}\})[ \t]*\r?\n/gm;

function collapseStandaloneMarkers(content: string): string {
  return content.replace(STANDALONE_MARKER_RE, "$1");
}

function resolveConditionals(content: string, ctx: Context): string {
  return content.replace(
    BLOCK_IF_RE,
    (_match, flag: string, truthyBlock: string, falsyBlock?: string) =>
      isTruthy(ctx[flag]) ? truthyBlock : falsyBlock ?? "",
  );
}

export function renderString(content: string, ctx: Context): string {
  const collapsed = collapseStandaloneMarkers(content);
  const withConditionals = resolveConditionals(collapsed, ctx);
  return withConditionals.replace(TOKEN_RE, (match, key: string) => {
    if (key in ctx) return ctx[key];
    return match; // leave unknown tokens untouched rather than silently blanking them
  });
}

/** Filenames/dirnames use __token__ so they stay valid on every OS and are easy to spot. */
export function renderPathSegment(segment: string, ctx: Context): string {
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
export const GATE_RE = /^__if_([a-zA-Z0-9_]+)__(.*)$/;

/**
 * Templates are mostly text, but they're allowed to carry binary payloads
 * (an icon, a font, a Maven wrapper jar). Rendering those as UTF-8 would
 * corrupt them, so they're copied through byte for byte instead. A NUL byte
 * in the first block is the usual giveaway.
 */
export function looksBinary(buffer: Buffer): boolean {
  const window = buffer.subarray(0, 8000);
  return window.includes(0);
}

export interface RenderResult {
  filesWritten: number;
  destDir: string;
  /** Destination paths, relative to destDir, in the order they were produced. */
  files: string[];
}

export interface RenderOptions {
  /** Work out what would be written without touching the disk. */
  dryRun?: boolean;
}

/**
 * Copies every file under `srcDir` into `destDir`, rendering {{tokens}} and
 * {{#if flag}}...{{/if}} blocks in text file contents, __tokens__ in file/dir
 * names, and honoring __if_<flag>__ gating on paths. Binary files are copied
 * verbatim and file modes are preserved, so executable scripts stay executable.
 */
export async function renderTemplate(
  srcDir: string,
  destDir: string,
  ctx: Context,
  options: RenderOptions = {},
): Promise<RenderResult> {
  if (!(await fs.pathExists(srcDir))) {
    throw new Error(`Template files not found at ${srcDir}`);
  }

  const { dryRun = false } = options;
  const files: string[] = [];

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
        const destPath = nameToRender
          ? path.join(currentDest, renderPathSegment(nameToRender, ctx))
          : currentDest;
        if (!dryRun) await fs.ensureDir(destPath);
        await walk(srcPath, destPath);
        continue;
      }

      if (!nameToRender) {
        throw new Error(
          `"${entry.name}" gates a file but has no name after the flag. Use __if_${gateMatch?.[1]}__<filename> instead.`,
        );
      }

      const destPath = path.join(currentDest, renderPathSegment(nameToRender, ctx));
      files.push(path.relative(destDir, destPath));

      if (dryRun) continue;

      const raw = await fs.readFile(srcPath);
      await fs.ensureDir(path.dirname(destPath));

      if (looksBinary(raw)) {
        await fs.writeFile(destPath, raw);
      } else {
        await fs.writeFile(destPath, renderString(raw.toString("utf8"), ctx), "utf8");
      }

      // Keep the source's permission bits so shell scripts and wrappers in a
      // template arrive executable rather than needing a chmod afterwards.
      const { mode } = await fs.stat(srcPath);
      await fs.chmod(destPath, mode);
    }
  }

  if (!dryRun) await fs.ensureDir(destDir);
  await walk(srcDir, destDir);

  return { filesWritten: files.length, destDir, files };
}
