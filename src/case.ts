// Small, dependency-free case-conversion helpers used to derive template
// variables from a single project name the user types once.

function splitWords(input: string): string[] {
  return input
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2") // camelCase -> camel Case
    .replace(/[_\-.\s]+/g, " ") // separators -> space
    .trim()
    .split(" ")
    .filter(Boolean);
}

export function toKebabCase(input: string): string {
  return splitWords(input)
    .map((w) => w.toLowerCase())
    .join("-");
}

export function toSnakeCase(input: string): string {
  return splitWords(input)
    .map((w) => w.toLowerCase())
    .join("_");
}

export function toPascalCase(input: string): string {
  return splitWords(input)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join("");
}

export function toCamelCase(input: string): string {
  const pascal = toPascalCase(input);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

export function toTitleCase(input: string): string {
  return splitWords(input)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/** Lowercase, alphanumeric only — safe as a bare Java package segment or npm-ish slug. */
export function toCompact(input: string): string {
  return splitWords(input)
    .join("")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export function toPackagePath(dottedPackage: string): string {
  return dottedPackage.replace(/\./g, "/");
}
