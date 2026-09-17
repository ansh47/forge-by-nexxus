import { fileURLToPath } from "node:url";
import path from "node:path";

/** Root of the installed forge-cli package (the dir containing package.json), works from dist/*.js. */
export function packageRoot(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  // src/*.ts runs via tsx from <root>/src, compiled *.js runs from <root>/dist.
  return path.resolve(here, "..");
}

export function templatesRoot(): string {
  return path.join(packageRoot(), "templates");
}
