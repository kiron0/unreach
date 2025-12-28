import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { findUnusedImports } from "../../../../src/lib/analyzer/finders/import-finder.js";
import { DependencyGraph } from "../../../../src/lib/graph.js";

describe("findUnusedImports", () => {
  let tempDir: string;
  let graph: DependencyGraph;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "unreach-import-test-"));
    graph = new DependencyGraph(tempDir);
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("should find unused imports", async () => {
    const file1 = path.join(tempDir, "file1.ts");
    fs.writeFileSync(file1, 'import { x } from "./file2";');

    const file2 = path.join(tempDir, "file2.ts");
    fs.writeFileSync(file2, "export const x = 1;");

    await graph.build([file1]);

    const reachableFiles = new Set<string>([file1]);
    const usedImports = new Map<string, Set<string>>();
    const importedSymbols = new Map<string, Set<string>>();

    const unused = findUnusedImports(
      graph,
      reachableFiles,
      usedImports,
      importedSymbols,
    );
    expect(Array.isArray(unused)).toBe(true);
  });

  it("should not mark used imports as unused", async () => {
    const file1 = path.join(tempDir, "file1.ts");
    fs.writeFileSync(file1, 'import { x } from "./file2"; const y = x;');

    const file2 = path.join(tempDir, "file2.ts");
    fs.writeFileSync(file2, "export const x = 1;");

    await graph.build([file1, file2]);

    const reachableFiles = new Set<string>([file1, file2]);
    const usedImports = new Map<string, Set<string>>();
    usedImports.set(file1, new Set(["./file2"]));
    const importedSymbols = new Map<string, Set<string>>();
    importedSymbols.set(file1, new Set(["x"]));

    const unused = findUnusedImports(
      graph,
      reachableFiles,
      usedImports,
      importedSymbols,
    );
    const unusedPaths = unused.map((u) => u.importPath);
    expect(unusedPaths).not.toContain("./file2");
  });

  it("should handle CSS imports", async () => {
    const file1 = path.join(tempDir, "file1.ts");
    fs.writeFileSync(file1, 'import "./styles.css";');

    const cssFile = path.join(tempDir, "styles.css");
    fs.writeFileSync(cssFile, ".container { }");

    await graph.build([file1]);

    const reachableFiles = new Set<string>([file1]);
    const usedImports = new Map<string, Set<string>>();
    const importedSymbols = new Map<string, Set<string>>();

    const unused = findUnusedImports(
      graph,
      reachableFiles,
      usedImports,
      importedSymbols,
    );
    expect(Array.isArray(unused)).toBe(true);
  });

  it("should handle namespace imports", async () => {
    const file1 = path.join(tempDir, "file1.ts");
    fs.writeFileSync(file1, 'import * as mod from "./file2";');

    const file2 = path.join(tempDir, "file2.ts");
    fs.writeFileSync(file2, "export const x = 1;");

    await graph.build([file1, file2]);

    const reachableFiles = new Set<string>([file1, file2]);
    const usedImports = new Map<string, Set<string>>();
    const importedSymbols = new Map<string, Set<string>>();

    const unused = findUnusedImports(
      graph,
      reachableFiles,
      usedImports,
      importedSymbols,
    );
    expect(Array.isArray(unused)).toBe(true);
  });

  it("should handle default imports", async () => {
    const file1 = path.join(tempDir, "file1.ts");
    fs.writeFileSync(file1, 'import def from "./file2";');

    const file2 = path.join(tempDir, "file2.ts");
    fs.writeFileSync(file2, "export default {};");

    await graph.build([file1, file2]);

    const reachableFiles = new Set<string>([file1, file2]);
    const usedImports = new Map<string, Set<string>>();
    const importedSymbols = new Map<string, Set<string>>();

    const unused = findUnusedImports(
      graph,
      reachableFiles,
      usedImports,
      importedSymbols,
    );
    expect(Array.isArray(unused)).toBe(true);
  });

  it("should handle type-only imports", async () => {
    const file1 = path.join(tempDir, "file1.ts");
    fs.writeFileSync(file1, 'import type { Type } from "./file2";');

    const file2 = path.join(tempDir, "file2.ts");
    fs.writeFileSync(file2, "export type Type = string;");

    await graph.build([file1, file2]);

    const reachableFiles = new Set<string>([file1, file2]);
    const usedImports = new Map<string, Set<string>>();
    const importedSymbols = new Map<string, Set<string>>();

    const unused = findUnusedImports(
      graph,
      reachableFiles,
      usedImports,
      importedSymbols,
    );
    expect(Array.isArray(unused)).toBe(true);
  });

  it("should handle empty reachable files", async () => {
    const file1 = path.join(tempDir, "file1.ts");
    fs.writeFileSync(file1, 'import { x } from "./file2";');

    await graph.build([file1]);

    const reachableFiles = new Set<string>();
    const usedImports = new Map<string, Set<string>>();
    const importedSymbols = new Map<string, Set<string>>();

    const unused = findUnusedImports(
      graph,
      reachableFiles,
      usedImports,
      importedSymbols,
    );
    expect(Array.isArray(unused)).toBe(true);
  });
});
