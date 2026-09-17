import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  toCamelCase,
  toCompact,
  toKebabCase,
  toPackagePath,
  toPascalCase,
  toSnakeCase,
  toTitleCase,
} from "./case.js";

// The interesting cases are the ones where the user's input isn't already in
// the shape we want: spaces, existing camelCase, mixed separators, digits.
const INPUTS = ["My Cool App", "my-cool-app", "my_cool_app", "myCoolApp", "MyCoolApp"];

describe("case conversion", () => {
  it("normalizes every common input spelling to the same output", () => {
    for (const input of INPUTS) {
      assert.equal(toKebabCase(input), "my-cool-app", `kebab from "${input}"`);
      assert.equal(toSnakeCase(input), "my_cool_app", `snake from "${input}"`);
      assert.equal(toPascalCase(input), "MyCoolApp", `pascal from "${input}"`);
      assert.equal(toCamelCase(input), "myCoolApp", `camel from "${input}"`);
      assert.equal(toTitleCase(input), "My Cool App", `title from "${input}"`);
      assert.equal(toCompact(input), "mycoolapp", `compact from "${input}"`);
    }
  });

  it("handles single words", () => {
    assert.equal(toKebabCase("forge"), "forge");
    assert.equal(toPascalCase("forge"), "Forge");
    assert.equal(toCamelCase("forge"), "forge");
    assert.equal(toTitleCase("forge"), "Forge");
  });

  it("keeps digits and drops stray separators", () => {
    assert.equal(toKebabCase("api v2 service"), "api-v2-service");
    assert.equal(toKebabCase("  spaced   out  "), "spaced-out");
    assert.equal(toKebabCase("dots.and-dashes_mixed"), "dots-and-dashes-mixed");
  });

  it("strips anything unsafe for a Java package segment", () => {
    assert.equal(toCompact("my-cool-app!"), "mycoolapp");
    assert.equal(toCompact("api v2"), "apiv2");
  });

  it("converts dotted packages to paths", () => {
    assert.equal(toPackagePath("com.logan.myapp"), "com/logan/myapp");
    assert.equal(toPackagePath("com"), "com");
  });
});
