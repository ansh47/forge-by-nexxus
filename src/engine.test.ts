import assert from "node:assert/strict";
import fs from "fs-extra";
import os from "node:os";
import path from "node:path";
import { after, describe, it } from "node:test";
import {
  baseContext,
  extendContext,
  isTruthy,
  looksBinary,
  renderString,
  renderTemplate,
  type Context,
} from "./engine.js";

const tmpDirs: string[] = [];

async function tmpDir(prefix: string): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  tmpDirs.push(dir);
  return dir;
}

after(async () => {
  for (const dir of tmpDirs) await fs.remove(dir);
});

describe("baseContext", () => {
  it("derives every case variant from one project name", () => {
    const ctx = baseContext("My Cool App");
    assert.equal(ctx.projectName, "my-cool-app");
    assert.equal(ctx.projectNamePascal, "MyCoolApp");
    assert.equal(ctx.projectNameCamel, "myCoolApp");
    assert.equal(ctx.projectNameSnake, "my_cool_app");
    assert.equal(ctx.projectNameCompact, "mycoolapp");
    assert.equal(ctx.projectNameHuman, "My Cool App");
    assert.equal(ctx.envPrefix, "MY_COOL_APP");
    assert.equal(ctx.year, String(new Date().getFullYear()));
  });
});

describe("extendContext", () => {
  it("derives Java package variables when groupId is answered", () => {
    const ctx = extendContext(baseContext("My Cool App"), { groupId: "com.logan" });
    assert.equal(ctx.mainPackage, "com.logan.mycoolapp");
    assert.equal(ctx.mainPackagePath, "com/logan/mycoolapp");
    assert.equal(ctx.groupIdPath, "com/logan");
  });

  it("leaves package variables unset when there is no groupId", () => {
    const ctx = extendContext(baseContext("My Cool App"), {});
    assert.equal(ctx.mainPackage, undefined);
    assert.equal(ctx.mainPackagePath, undefined);
  });
});

describe("isTruthy", () => {
  it("treats only real values as on", () => {
    assert.equal(isTruthy("true"), true);
    assert.equal(isTruthy("anything"), true);
    assert.equal(isTruthy(""), false);
    assert.equal(isTruthy(undefined), false);
    assert.equal(isTruthy("false"), false);
    assert.equal(isTruthy("0"), false);
  });
});

describe("renderString tokens", () => {
  const ctx: Context = { projectName: "my-app", greeting: "hi" };

  it("substitutes known tokens and tolerates whitespace", () => {
    assert.equal(renderString("name: {{projectName}}", ctx), "name: my-app");
    assert.equal(renderString("name: {{ projectName }}", ctx), "name: my-app");
  });

  it("leaves unknown tokens untouched rather than blanking them", () => {
    assert.equal(renderString("{{nope}}", ctx), "{{nope}}");
  });

  it("ignores JSX-style inline objects, which are not tokens", () => {
    const jsx = 'initial={{ opacity: 0, y: 8 }}';
    assert.equal(renderString(jsx, ctx), jsx);
  });
});

describe("renderString conditionals", () => {
  it("keeps or drops a block based on the flag", () => {
    assert.equal(renderString("a{{#if on}}B{{/if}}c", { on: "true" }), "aBc");
    assert.equal(renderString("a{{#if on}}B{{/if}}c", { on: "" }), "ac");
  });

  it("supports an else branch", () => {
    const tpl = "{{#if on}}yes{{else}}no{{/if}}";
    assert.equal(renderString(tpl, { on: "true" }), "yes");
    assert.equal(renderString(tpl, { on: "" }), "no");
  });

  it("still substitutes tokens inside a kept branch", () => {
    assert.equal(renderString("{{#if on}}{{projectName}}{{/if}}", { on: "true", projectName: "x" }), "x");
  });

  it("resolves several independent blocks in one file", () => {
    const tpl = "{{#if a}}A{{/if}}{{#if b}}B{{/if}}{{#if c}}C{{/if}}";
    assert.equal(renderString(tpl, { a: "true", b: "", c: "true" }), "AC");
  });

  it("leaves no blank line behind when a marker owns its line", () => {
    const tpl = ["import a;", "{{#if extra}}", "import b;", "{{/if}}", "start();"].join("\n");
    assert.equal(renderString(tpl, { extra: "true" }), "import a;\nimport b;\nstart();");
    assert.equal(renderString(tpl, { extra: "" }), "import a;\nstart();");
  });

  it("keeps inline markers inline", () => {
    const tpl = "plugins: [react(){{#if tw}}, tailwind(){{/if}}],";
    assert.equal(renderString(tpl, { tw: "true" }), "plugins: [react(), tailwind()],");
    assert.equal(renderString(tpl, { tw: "" }), "plugins: [react()],");
  });
});

describe("looksBinary", () => {
  it("flags buffers containing NUL and passes text through", () => {
    assert.equal(looksBinary(Buffer.from([0x89, 0x50, 0x00, 0x01])), true);
    assert.equal(looksBinary(Buffer.from("just some text {{token}}", "utf8")), false);
  });
});

describe("renderTemplate", () => {
  async function buildTemplate(): Promise<string> {
    const src = await tmpDir("forge-src-");
    await fs.outputFile(path.join(src, "README.md"), "# {{projectNameHuman}}\n");
    await fs.outputFile(path.join(src, "__projectName__.config.js"), "export default '{{projectName}}';\n");
    await fs.outputFile(path.join(src, "src/__mainPackagePath__/App.java"), "package {{mainPackage}};\n");
    await fs.outputFile(path.join(src, "__if_extras__/extra/only-with-extras.txt"), "{{projectName}}\n");
    await fs.outputFile(path.join(src, "__if_extras__config.json"), "{}\n");
    // A PNG header, complete with the NUL bytes that make it binary.
    await fs.outputFile(
      path.join(src, "logo.png"),
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]),
    );
    return src;
  }

  it("renders names and contents, and honors path gating", async () => {
    const src = await buildTemplate();
    const dest = await tmpDir("forge-dest-");
    const ctx = extendContext(baseContext("My Cool App"), { groupId: "com.logan", extras: "true" });

    const result = await renderTemplate(src, dest, ctx);

    assert.equal(await fs.readFile(path.join(dest, "README.md"), "utf8"), "# My Cool App\n");
    assert.equal(
      await fs.readFile(path.join(dest, "my-cool-app.config.js"), "utf8"),
      "export default 'my-cool-app';\n",
    );
    assert.equal(
      await fs.readFile(path.join(dest, "src/com/logan/mycoolapp/App.java"), "utf8"),
      "package com.logan.mycoolapp;\n",
    );
    // A gated directory is transparent: its contents land in the parent.
    assert.equal(await fs.pathExists(path.join(dest, "extra/only-with-extras.txt")), true);
    assert.equal(await fs.pathExists(path.join(dest, "__if_extras__")), false);
    // A gated file keeps the name that follows the flag.
    assert.equal(await fs.pathExists(path.join(dest, "config.json")), true);
    assert.equal(result.filesWritten, 6);
  });

  it("skips gated paths entirely when the flag is off", async () => {
    const src = await buildTemplate();
    const dest = await tmpDir("forge-dest-");
    const ctx = extendContext(baseContext("My Cool App"), { groupId: "com.logan", extras: "" });

    const result = await renderTemplate(src, dest, ctx);

    assert.equal(await fs.pathExists(path.join(dest, "extra")), false);
    assert.equal(await fs.pathExists(path.join(dest, "config.json")), false);
    assert.equal(result.filesWritten, 4);
  });

  it("copies binary files through byte for byte", async () => {
    const src = await buildTemplate();
    const dest = await tmpDir("forge-dest-");
    const ctx = extendContext(baseContext("My Cool App"), { groupId: "com.logan", extras: "" });

    await renderTemplate(src, dest, ctx);

    const original = await fs.readFile(path.join(src, "logo.png"));
    const copied = await fs.readFile(path.join(dest, "logo.png"));
    assert.deepEqual(copied, original);
  });

  it("preserves the executable bit", async () => {
    const src = await tmpDir("forge-src-");
    const dest = await tmpDir("forge-dest-");
    const script = path.join(src, "run.sh");
    await fs.outputFile(script, "#!/bin/sh\necho {{projectName}}\n");
    await fs.chmod(script, 0o755);

    await renderTemplate(src, dest, baseContext("my app"));

    const { mode } = await fs.stat(path.join(dest, "run.sh"));
    assert.equal(mode & 0o111, 0o111, "expected the copy to stay executable");
  });

  it("writes nothing in dry-run mode but still reports the file list", async () => {
    const src = await buildTemplate();
    const dest = await tmpDir("forge-dest-");
    await fs.remove(dest); // the destination shouldn't even be created
    const ctx = extendContext(baseContext("My Cool App"), { groupId: "com.logan", extras: "true" });

    const result = await renderTemplate(src, dest, ctx, { dryRun: true });

    assert.equal(await fs.pathExists(dest), false);
    assert.equal(result.filesWritten, 6);
    assert.ok(result.files.includes("README.md"));
    assert.ok(result.files.includes(path.join("src", "com", "logan", "mycoolapp", "App.java")));
  });

  it("strips the .tmpl suffix so editors can ignore template sources", async () => {
    const src = await tmpDir("forge-src-");
    const dest = await tmpDir("forge-dest-");
    await fs.outputFile(path.join(src, "App.tsx.tmpl"), "const name = '{{projectName}}';\n");
    await fs.outputFile(path.join(src, "__if_extras__helper.ts.tmpl"), "// {{projectName}}\n");
    await fs.outputFile(path.join(src, "plain.ts"), "// {{projectName}}\n");

    const result = await renderTemplate(src, dest, { ...baseContext("my app"), extras: "true" });

    assert.equal(await fs.pathExists(path.join(dest, "App.tsx")), true);
    assert.equal(await fs.pathExists(path.join(dest, "App.tsx.tmpl")), false);
    // Gating and the suffix compose: the flag prefix goes, the suffix goes too.
    assert.equal(await fs.pathExists(path.join(dest, "helper.ts")), true);
    // Files without the suffix are untouched.
    assert.equal(await fs.pathExists(path.join(dest, "plain.ts")), true);
    assert.equal(
      await fs.readFile(path.join(dest, "App.tsx"), "utf8"),
      "const name = 'my-app';\n",
      "contents are still rendered normally",
    );
    assert.ok(result.files.includes("App.tsx"));
  });

  it("fails loudly when a gated file has no name after the flag", async () => {
    const src = await tmpDir("forge-src-");
    const dest = await tmpDir("forge-dest-");
    await fs.outputFile(path.join(src, "__if_flag__"), "oops\n");

    await assert.rejects(
      () => renderTemplate(src, dest, { flag: "true" }),
      /has no name after the flag/,
    );
  });
});
