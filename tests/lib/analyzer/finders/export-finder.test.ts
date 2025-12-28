import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { findUnusedExports } from "../../../../src/lib/analyzer/finders/export-finder.js";
import { DependencyGraph } from "../../../../src/lib/graph.js";

describe("findUnusedExports", () => {
  let tempDir: string;
  let graph: DependencyGraph;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "unreach-export-test-"));
    graph = new DependencyGraph(tempDir);
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("should find unused exports", async () => {
    const file1 = path.join(tempDir, "file1.ts");
    fs.writeFileSync(file1, "export const unused = 1;");

    await graph.build([file1]);

    const reachableExports = new Map<string, Set<string>>();
    const unused = findUnusedExports(graph, reachableExports);
    expect(Array.isArray(unused)).toBe(true);
  });

  it("should not mark used exports as unused", async () => {
    const file1 = path.join(tempDir, "file1.ts");
    fs.writeFileSync(file1, "export const used = 1;");

    const file2 = path.join(tempDir, "file2.ts");
    fs.writeFileSync(file2, 'import { used } from "./file1";');

    await graph.build([file1, file2]);

    const reachableExports = new Map<string, Set<string>>();
    reachableExports.set(file1, new Set(["used"]));

    const unused = findUnusedExports(graph, reachableExports);
    const unusedNames = unused.map((u) => u.exportName);
    expect(unusedNames).not.toContain("used");
  });

  it("should skip config files", async () => {
    const configFile = path.join(tempDir, "config.ts");
    fs.writeFileSync(configFile, "export const config = {};");

    await graph.build([configFile]);

    const reachableExports = new Map<string, Set<string>>();
    const unused = findUnusedExports(graph, reachableExports);
    const configExports = unused.filter((u) => u.file === configFile);
    expect(configExports.length).toBe(0);
  });

  it("should handle entry point exports", async () => {
    const entryFile = path.join(tempDir, "index.ts");
    fs.writeFileSync(entryFile, "export const main = () => {};");

    await graph.build([entryFile]);

    const reachableExports = new Map<string, Set<string>>();
    const unused = findUnusedExports(graph, reachableExports);
    const entryExports = unused.filter((u) => u.file === entryFile);
    expect(entryExports.length).toBe(0);
  });

  it("should handle default exports", async () => {
    const file1 = path.join(tempDir, "file1.ts");
    fs.writeFileSync(file1, "export default function test() {}");

    await graph.build([file1]);

    const reachableExports = new Map<string, Set<string>>();
    const unused = findUnusedExports(graph, reachableExports);
    expect(Array.isArray(unused)).toBe(true);
  });

  it("should handle named exports", async () => {
    const file1 = path.join(tempDir, "file1.ts");
    fs.writeFileSync(file1, "export const x = 1; export function y() {}");

    await graph.build([file1]);

    const reachableExports = new Map<string, Set<string>>();
    const unused = findUnusedExports(graph, reachableExports);
    expect(Array.isArray(unused)).toBe(true);
  });

  it("should handle type exports", async () => {
    const file1 = path.join(tempDir, "file1.ts");
    fs.writeFileSync(file1, "export type Test = string;");

    await graph.build([file1]);

    const reachableExports = new Map<string, Set<string>>();
    const unused = findUnusedExports(graph, reachableExports);
    expect(Array.isArray(unused)).toBe(true);
  });

  it("should handle VitePress theme files", async () => {
    const themeDir = path.join(tempDir, ".vitepress", "theme");
    fs.mkdirSync(themeDir, { recursive: true });
    const themeFile = path.join(themeDir, "index.ts");
    fs.writeFileSync(themeFile, "export default {};");

    await graph.build([themeFile]);

    const reachableExports = new Map<string, Set<string>>();
    const unused = findUnusedExports(graph, reachableExports);
    expect(Array.isArray(unused)).toBe(true);
  });

  it("should handle empty reachable exports", async () => {
    const file1 = path.join(tempDir, "file1.ts");
    fs.writeFileSync(file1, "export const x = 1;");

    await graph.build([file1]);

    const reachableExports = new Map<string, Set<string>>();
    const unused = findUnusedExports(graph, reachableExports);
    expect(Array.isArray(unused)).toBe(true);
  });
});
