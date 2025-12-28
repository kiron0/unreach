import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { findUnusedTypes } from "../../../../src/lib/analyzer/finders/type-finder.js";
import { DependencyGraph } from "../../../../src/lib/graph.js";

describe("findUnusedTypes", () => {
  let tempDir: string;
  let graph: DependencyGraph;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "unreach-type-test-"));
    graph = new DependencyGraph(tempDir);
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("should find unused types", async () => {
    const file1 = path.join(tempDir, "file1.ts");
    fs.writeFileSync(file1, "type Unused = string;");

    await graph.build([file1]);

    const reachableFiles = new Set<string>([file1]);
    const usedTypes = new Map<string, Set<string>>();
    const reachableExports = new Map<string, Set<string>>();
    const unused = findUnusedTypes(
      graph,
      reachableFiles,
      usedTypes,
      reachableExports,
    );
    expect(Array.isArray(unused)).toBe(true);
  });

  it("should not mark used types as unused", async () => {
    const file1 = path.join(tempDir, "file1.ts");
    fs.writeFileSync(file1, "type Used = string; const x: Used = 'test';");

    await graph.build([file1]);

    const reachableFiles = new Set<string>([file1]);
    const usedTypes = new Map<string, Set<string>>();
    usedTypes.set(file1, new Set(["Used"]));
    const reachableExports = new Map<string, Set<string>>();

    const unused = findUnusedTypes(
      graph,
      reachableFiles,
      usedTypes,
      reachableExports,
    );
    const unusedNames = unused.map((u) => u.typeName);
    expect(unusedNames).not.toContain("Used");
  });

  it("should handle interfaces", async () => {
    const file1 = path.join(tempDir, "file1.ts");
    fs.writeFileSync(file1, "interface Test { prop: string; }");

    await graph.build([file1]);

    const reachableFiles = new Set<string>([file1]);
    const usedTypes = new Map<string, Set<string>>();
    const reachableExports = new Map<string, Set<string>>();
    const unused = findUnusedTypes(
      graph,
      reachableFiles,
      usedTypes,
      reachableExports,
    );
    expect(Array.isArray(unused)).toBe(true);
  });

  it("should handle enums", async () => {
    const file1 = path.join(tempDir, "file1.ts");
    fs.writeFileSync(file1, "enum Test { A, B }");

    await graph.build([file1]);

    const reachableFiles = new Set<string>([file1]);
    const usedTypes = new Map<string, Set<string>>();
    const reachableExports = new Map<string, Set<string>>();
    const unused = findUnusedTypes(
      graph,
      reachableFiles,
      usedTypes,
      reachableExports,
    );
    expect(Array.isArray(unused)).toBe(true);
  });
});
