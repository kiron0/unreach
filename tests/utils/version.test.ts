import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getPackageVersion } from "../../src/utils/version.js";

describe("getPackageVersion", () => {
  let originalCwd: string;

  beforeEach(() => {
    originalCwd = process.cwd();
  });

  afterEach(() => {
    process.chdir(originalCwd);
  });

  it("should return version from package.json", () => {
    const version = getPackageVersion();
    expect(typeof version).toBe("string");
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("should cache version", () => {
    const version1 = getPackageVersion();
    const version2 = getPackageVersion();
    expect(version1).toBe(version2);
  });

  it("should return version from package.json", () => {
    const version = getPackageVersion();
    expect(typeof version).toBe("string");
    expect(version.length).toBeGreaterThan(0);
  });
});
