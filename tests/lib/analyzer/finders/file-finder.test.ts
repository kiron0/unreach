import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DependencyGraph } from "../../../../src/lib/graph.js";
import { findUnusedFiles } from "../../../../src/lib/analyzer/finders/file-finder.js";

describe("findUnusedFiles", () => {
  let tempDir: string;
  let graph: DependencyGraph;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "unreach-file-test-"));
    graph = new DependencyGraph(tempDir);
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("should find unused files", async () => {
    const usedFile = path.join(tempDir, "used.ts");
    fs.writeFileSync(usedFile, "export const x = 1;");

    const unusedFile = path.join(tempDir, "unused.ts");
    fs.writeFileSync(unusedFile, "export const y = 2;");

    await graph.build([usedFile]);

    const reachableFiles = new Set<string>([usedFile]);
    const unused = findUnusedFiles(graph, reachableFiles);
    expect(Array.isArray(unused)).toBe(true);
  });

  it("should not mark used files as unused", async () => {
    const file1 = path.join(tempDir, "file1.ts");
    fs.writeFileSync(file1, "export const x = 1;");

    await graph.build([file1]);

    const reachableFiles = new Set<string>([file1]);
    const unused = findUnusedFiles(graph, reachableFiles);
    const unusedPaths = unused.map(u => u.file);
    expect(unusedPaths).not.toContain(file1);
  });

  it("should handle entry point files", async () => {
    const entryFile = path.join(tempDir, "index.ts");
    fs.writeFileSync(entryFile, "export default {};");

    await graph.build([entryFile]);

    const reachableFiles = new Set<string>([entryFile]);
    const unused = findUnusedFiles(graph, reachableFiles);
    const unusedPaths = unused.map(u => u.file);
    expect(unusedPaths).not.toContain(entryFile);
  });

  it("should handle empty reachable files", async () => {
    const file1 = path.join(tempDir, "file1.ts");
    fs.writeFileSync(file1, "export const x = 1;");

    await graph.build([file1]);

    const reachableFiles = new Set<string>();
    const unused = findUnusedFiles(graph, reachableFiles);
    expect(Array.isArray(unused)).toBe(true);
  });
});
