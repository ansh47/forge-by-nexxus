# Forge by Nexxus

A personal, extensible project scaffold generator. Forge spins up new projects from a set of built-in templates, filling in variables such as the project name, Java package, and any optional add-ons you choose along the way.

## Features

- Interactive and scriptable. Answer prompts directly, or skip them entirely with `--set key=value` and `--yes` for use in scripts.
- Variable substitution. Every template gets the project name in several cases (kebab, Pascal, camel, snake, human-readable) with no extra configuration required.
- Optional add-ons. A template can offer a multiselect prompt so a single template covers many combinations of libraries, and only the code and dependencies you pick end up in the generated project.
- No registration step. Add a folder under `templates/` and it appears in `forge list` automatically.

## Installation

```bash
npm install
npm run build
npm link
```

`npm link` makes the `forge` command available globally on your machine. Re-run it only if `package.json`'s `bin` field changes. For ordinary code changes, `npm run build` is enough, since `npm link` just symlinks to `dist/`.

## Usage

```bash
forge list
forge create                          # fully interactive
forge create gambit my-agent          # template and name given, still prompts for extras
forge create backend-spring-boot my-api --set groupId=com.logan --yes
forge create react-ts my-ui --set addons=tailwind,rtk-query --yes
forge create react-ts my-ui --dry-run  # show what would be written, write nothing
forge lint                             # check every template for mistakes
```

Options for `forge create`:

| Option | Description |
| --- | --- |
| `-d, --dir <path>` | Destination directory. Defaults to `./<project-name>`. |
| `-f, --force` | Scaffold into a non-empty directory anyway. |
| `-y, --yes` | Skip prompts and use each prompt's default unless overridden by `--set`. |
| `--set key=value` | Supply a prompt's answer non-interactively. Repeatable. |
| `--dry-run` | Print the files that would be written without creating anything. |
| `-i, --install` | Run the template's install command in the new project once it is scaffolded. |

Non-interactive mode also activates automatically when standard input is not a terminal, for example when Forge is called from a script. `--yes` is mainly for forcing that behavior from an interactive terminal.

## Built-in Templates

| Template | Description |
| --- | --- |
| `fullstack-spring-react` | Spring Boot (Maven) backend paired with a Vite, React, and TypeScript frontend. CORS and a dev proxy are already wired between them. |
| `backend-spring-boot` | A standalone Spring Boot API with a worked example resource: controller, in-memory repository, validation, and error handling, rather than an empty `Application.java`. |
| `react-ts` | Vite, React, and TypeScript with no backend attached. React and TypeScript are the only things every project gets. Framer Motion, Lucide React, Tailwind CSS, and RTK Query are optional add-ons chosen at scaffold time. |
| `gambit` | A minimal Claude-powered agent loop (task, tool calls, result) packaged as an installable Python CLI, with one example tool included. |

## Creating a Custom Template

1. Create `templates/<your-id>/forge.template.json`:

   ```json
   {
     "id": "your-id",
     "name": "Human-readable name",
     "description": "Shown in forge list.",
     "prompts": [
       { "name": "someVar", "message": "Ask the user what?", "default": "a-default" }
     ],
     "postInstall": [
       "cd {{projectName}}",
       "your next steps command here"
     ],
     "install": "npm install"
   }
   ```

   `install` is the command `forge create --install` runs inside the new
   project. Leave it out for templates where the setup is too opinionated to
   guess, such as choosing where a Python virtualenv should live.

   `prompts` is optional. Omit it if the template only needs the project name. Each prompt is one of two types:

   - `"type": "text"` (the default): a single free-text question, available as `{{name}}`.
   - `"type": "multiselect"`: a checkbox list. Provide `options`, each with a `value` (also what `--set <promptName>=value,value` matches against), a `label`, and a `flag`, the context variable that becomes `"true"` when selected and `""` otherwise, for use in `{{#if flag}}` blocks. The prompt's own `name` is set to the selected values joined with `, `. See `react-ts/forge.template.json` for a full example.

2. Add the template's files under `templates/<your-id>/files/`. That directory is copied into the destination project with the following substitutions applied:

   - File and directory names: `__token__` is replaced. A folder named `__mainPackagePath__` becomes `com/logan/myapp`, for example.
   - File contents: `{{token}}` is replaced.
   - File contents, conditionally: `{{#if flag}}...{{/if}}` or `{{#if flag}}...{{else}}...{{/if}}` keeps or drops a block depending on whether `flag` is truthy. Nesting and `elseif` are not supported. A flag counts as on unless it is missing, empty, `"false"`, or `"0"`, which matches what a multiselect option's `flag` produces. See `react-ts/files/src/App.tsx` or `react-ts/files/package.json`. In the latter, optional dependencies are placed last in each JSON object, with each conditional block supplying its own leading comma, so the file stays valid JSON regardless of which options are selected.
   - Whole files or directories, conditionally: name the path `__if_flag__<rest>`. A gated directory is transparent when its flag is on, meaning its contents are copied directly into the parent with no extra folder appearing, and is skipped entirely when off. A gated file needs a name after the flag, such as `__if_rtkQuery__store` for a directory or `__if_tailwind__tailwind.config.js` for a file, and is written only when the flag is on. See `react-ts/files/src/__if_rtkQuery__/store/`.

   A conditional marker that sits alone on its own line is removed along with
   that line, so dropping a block leaves no blank line behind. Markers used
   inline, such as inside an array literal, stay inline.

   A file containing conditional blocks is not valid TypeScript, JSON or CSS
   as written, so editors report it as broken source. Name such a file with a
   trailing `.tmpl` (`App.tsx.tmpl`) and the suffix is stripped when the file
   is written, so the generated project still gets `App.tsx`. `forge lint`
   flags any conditional template missing the suffix. Files that only use
   `{{token}}` inside string positions stay valid in their own language and
   need no suffix.

   Binary files (an icon, a font, a wrapper jar) are detected and copied
   through byte for byte rather than being treated as text, and file
   permissions are preserved, so an executable script in a template arrives
   executable.

   Every template receives the following tokens for free, derived from the single project name answer:

   | Token | Example (input: "My Cool App") |
   | --- | --- |
   | `projectName` | `my-cool-app` |
   | `projectNamePascal` | `MyCoolApp` |
   | `projectNameCamel` | `myCoolApp` |
   | `projectNameSnake` | `my_cool_app` |
   | `projectNameCompact` | `mycoolapp` |
   | `projectNameHuman` | `My Cool App` |
   | `envPrefix` | `MY_COOL_APP` |
   | `year` | `2026` |

   Anything a template's own prompts collect is also available by name, for example `groupId`. If a prompt named `groupId` is answered, three more tokens are derived automatically: `mainPackage` (`groupId` plus `projectNameCompact`), `groupIdPath`, and `mainPackagePath` (dots converted to slashes, for Java source directories).

3. Run `forge lint <your-id>`. It checks the config for missing fields and flags
   any `{{token}}`, `{{#if flag}}`, or `__token__` in the template that no
   prompt or built-in variable provides, which is how typos get caught before
   they reach a generated project. `forge lint` with no argument checks every
   template and exits non-zero if anything is wrong, so it works in CI.

4. Run `forge list` to confirm the new template appears. Templates are discovered at runtime with no registration step. Then run `forge create <your-id> test-run --dir /tmp/test-run --yes` to check the generated output before relying on it.

## Project Structure

```
src/                the CLI itself, written in TypeScript
  case.ts              string case helpers: kebab, Pascal, camel, snake
  engine.ts            template rendering: tokens, {{#if}} conditionals, __if_ path gating
  templates.ts         template discovery, reads templates/*/forge.template.json
  paths.ts             resolves templates/ relative to the installed package
  commands/            list.ts, create.ts, lint.ts
  *.test.ts            unit tests, run with npm test
templates/          the built-in scaffolds, see "Creating a Custom Template" above
.github/workflows/  ci.yml builds and tests every template, release.yml publishes on a tag
.vscode/            maps *.tmpl to Handlebars so template sources stay readable
```

## Development

```bash
npm test                  # unit tests for the case helpers and the render engine
npm run lint:templates     # build, then check every template
npm run dev -- list         # run the CLI straight from src without building
```

CI does more than run the unit tests: it scaffolds every template and then
actually compiles the result, with Maven for the Spring templates, Vite and
`tsc` for the React ones, and pytest for the Python one. A scaffold generator
can pass its own tests while emitting projects that no longer build, and that
is the failure worth catching.

Releases are published to npm by tagging a version, for example `v0.2.0`.
The release workflow authenticates with npm through GitHub OIDC (Trusted
Publishing), so no npm token is stored in the repository or in secrets.

## Contributing

This started as a personal tool. Issues and suggestions are welcome.

## License

Forge by Nexxus is released under the MIT License. See [LICENSE](LICENSE) for details.
