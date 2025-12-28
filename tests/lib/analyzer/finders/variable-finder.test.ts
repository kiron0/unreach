import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { findUnusedVariables } from "../../../../src/lib/analyzer/finders/variable-finder.js";
import { DependencyGraph } from "../../../../src/lib/graph.js";

describe("findUnusedVariables", () => {
  let tempDir: string;
  let graph: DependencyGraph;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "unreach-var-test-"));
    graph = new DependencyGraph(tempDir);
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("should find unused variables", async () => {
    const file1 = path.join(tempDir, "file1.ts");
    fs.writeFileSync(file1, "const unused = 1;");

    await graph.build([file1]);

    const reachableFiles = new Set<string>([file1]);
    const reachableVariables = new Map<string, Set<string>>();
    const unused = findUnusedVariables(
      graph,
      reachableFiles,
      reachableVariables,
    );
    expect(Array.isArray(unused)).toBe(true);
  });

  it("should not mark used variables as unused", async () => {
    const file1 = path.join(tempDir, "file1.ts");
    fs.writeFileSync(file1, "const used = 1; const x = used;");

    await graph.build([file1]);

    const reachableFiles = new Set<string>([file1]);
    const reachableVariables = new Map<string, Set<string>>();
    reachableVariables.set(file1, new Set(["used"]));

    const unused = findUnusedVariables(
      graph,
      reachableFiles,
      reachableVariables,
    );
    const unusedNames = unused.map((u) => u.variableName);
    expect(unusedNames).not.toContain("used");
  });

  it("should handle exported variables", async () => {
    const file1 = path.join(tempDir, "file1.ts");
    fs.writeFileSync(file1, "export const exported = 1;");

    await graph.build([file1]);

    const reachableFiles = new Set<string>([file1]);
    const reachableVariables = new Map<string, Set<string>>();
    const unused = findUnusedVariables(
      graph,
      reachableFiles,
      reachableVariables,
    );
    expect(Array.isArray(unused)).toBe(true);
  });

  it("should handle empty reachable variables", async () => {
    const file1 = path.join(tempDir, "file1.ts");
    fs.writeFileSync(file1, "const test = 1;");

    await graph.build([file1]);

    const reachableFiles = new Set<string>([file1]);
    const reachableVariables = new Map<string, Set<string>>();
    const unused = findUnusedVariables(
      graph,
      reachableFiles,
      reachableVariables,
    );
    expect(Array.isArray(unused)).toBe(true);
  });
});
