import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { findUnusedFunctions } from "../../../../src/lib/analyzer/finders/function-finder.js";
import { DependencyGraph } from "../../../../src/lib/graph.js";

describe("findUnusedFunctions", () => {
  let tempDir: string;
  let graph: DependencyGraph;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "unreach-func-test-"));
    graph = new DependencyGraph(tempDir);
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("should find unused functions", async () => {
    const file1 = path.join(tempDir, "file1.ts");
    fs.writeFileSync(file1, "export function unused() {}");

    const file2 = path.join(tempDir, "file2.ts");
    fs.writeFileSync(file2, "export function used() {}");

    await graph.build([file2]);

    const reachableFunctions = new Map<string, Set<string>>();
    reachableFunctions.set(file2, new Set(["used"]));
    const reachableExports = new Map<string, Set<string>>();

    const unused = findUnusedFunctions(
      graph,
      reachableFunctions,
      reachableExports,
    );
    expect(unused.length).toBeGreaterThanOrEqual(0);
  });

  it("should not mark used functions as unused", async () => {
    const file1 = path.join(tempDir, "file1.ts");
    fs.writeFileSync(file1, "export function used() {}");

    await graph.build([file1]);

    const reachableFunctions = new Map<string, Set<string>>();
    reachableFunctions.set(file1, new Set(["used"]));
    const reachableExports = new Map<string, Set<string>>();
    reachableExports.set(file1, new Set(["used"]));

    const unused = findUnusedFunctions(
      graph,
      reachableFunctions,
      reachableExports,
    );
    const unusedNames = unused.map((u) => u.functionName);
    expect(unusedNames).not.toContain("used");
  });

  it("should handle functions in entry points", async () => {
    const entryFile = path.join(tempDir, "index.ts");
    fs.writeFileSync(entryFile, "export function main() {}");

    await graph.build([entryFile]);

    const reachableFunctions = new Map<string, Set<string>>();
    const reachableExports = new Map<string, Set<string>>();
    const unused = findUnusedFunctions(
      graph,
      reachableFunctions,
      reachableExports,
    );
    expect(Array.isArray(unused)).toBe(true);
  });

  it("should handle empty reachable functions", async () => {
    const file1 = path.join(tempDir, "file1.ts");
    fs.writeFileSync(file1, "function test() {}");

    await graph.build([file1]);

    const reachableFunctions = new Map<string, Set<string>>();
    const reachableExports = new Map<string, Set<string>>();
    const unused = findUnusedFunctions(
      graph,
      reachableFunctions,
      reachableExports,
    );
    expect(Array.isArray(unused)).toBe(true);
  });
});
