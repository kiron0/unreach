import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { findUnusedPackages } from "../../../../src/lib/analyzer/finders/package-finder.js";

describe("findUnusedPackages", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "unreach-pkg-test-"));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("should find unused packages", () => {
    const packageJson = {
      dependencies: {
        "used-package": "1.0.0",
        "unused-package": "2.0.0",
      },
    };
    fs.writeFileSync(
      path.join(tempDir, "package.json"),
      JSON.stringify(packageJson),
    );

    const usedPackages = new Set<string>(["used-package"]);
    const unused = findUnusedPackages(tempDir, usedPackages);

    expect(unused).toHaveLength(1);
    expect(unused[0].name).toBe("unused-package");
    expect(unused[0].version).toBe("2.0.0");
  });

  it("should check devDependencies", () => {
    const packageJson = {
      devDependencies: {
        "unused-dev": "1.0.0",
      },
    };
    fs.writeFileSync(
      path.join(tempDir, "package.json"),
      JSON.stringify(packageJson),
    );

    const usedPackages = new Set<string>();
    const unused = findUnusedPackages(tempDir, usedPackages);

    expect(unused).toHaveLength(1);
    expect(unused[0].name).toBe("unused-dev");
  });

  it("should check peerDependencies", () => {
    const packageJson = {
      peerDependencies: {
        "unused-peer": "1.0.0",
      },
    };
    fs.writeFileSync(
      path.join(tempDir, "package.json"),
      JSON.stringify(packageJson),
    );

    const usedPackages = new Set<string>();
    const unused = findUnusedPackages(tempDir, usedPackages);

    expect(unused).toHaveLength(1);
    expect(unused[0].name).toBe("unused-peer");
  });

  it("should exclude @types packages when TypeScript is used", () => {
    const packageJson = {
      dependencies: {
        typescript: "5.0.0",
        "@types/node": "20.0.0",
        "unused-package": "1.0.0",
      },
    };
    fs.writeFileSync(
      path.join(tempDir, "package.json"),
      JSON.stringify(packageJson),
    );

    const usedPackages = new Set<string>(["typescript"]);
    const unused = findUnusedPackages(tempDir, usedPackages);

    expect(unused).toHaveLength(1);
    expect(unused[0].name).toBe("unused-package");
    expect(unused.find((p) => p.name === "@types/node")).toBeUndefined();
  });

  it("should return empty array when no package.json exists", () => {
    const unused = findUnusedPackages(tempDir, new Set());
    expect(unused).toEqual([]);
  });

  it("should return empty array for invalid package.json", () => {
    fs.writeFileSync(path.join(tempDir, "package.json"), "invalid json");

    const unused = findUnusedPackages(tempDir, new Set());
    expect(unused).toEqual([]);
  });

  it("should handle empty dependencies", () => {
    const packageJson = {};
    fs.writeFileSync(
      path.join(tempDir, "package.json"),
      JSON.stringify(packageJson),
    );

    const unused = findUnusedPackages(tempDir, new Set());
    expect(unused).toEqual([]);
  });

  it("should handle all packages used", () => {
    const packageJson = {
      dependencies: {
        "package1": "1.0.0",
        "package2": "2.0.0",
      },
    };
    fs.writeFileSync(
      path.join(tempDir, "package.json"),
      JSON.stringify(packageJson),
    );

    const usedPackages = new Set<string>(["package1", "package2"]);
    const unused = findUnusedPackages(tempDir, usedPackages);

    expect(unused).toEqual([]);
  });

  it("should handle mixed dependencies", () => {
    const packageJson = {
      dependencies: {
        "used-dep": "1.0.0",
        "unused-dep": "2.0.0",
      },
      devDependencies: {
        "used-dev": "1.0.0",
        "unused-dev": "2.0.0",
      },
      peerDependencies: {
        "unused-peer": "1.0.0",
      },
    };
    fs.writeFileSync(
      path.join(tempDir, "package.json"),
      JSON.stringify(packageJson),
    );

    const usedPackages = new Set<string>(["used-dep", "used-dev"]);
    const unused = findUnusedPackages(tempDir, usedPackages);

    expect(unused.length).toBeGreaterThanOrEqual(2);
    expect(unused.find((p) => p.name === "unused-dep")).toBeDefined();
    expect(unused.find((p) => p.name === "unused-dev")).toBeDefined();
  });
});
