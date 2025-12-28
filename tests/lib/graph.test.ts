import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DependencyGraph } from "../../src/lib/graph.js";

describe("DependencyGraph", () => {
  let tempDir: string;
  let graph: DependencyGraph;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "unreach-graph-test-"));
    graph = new DependencyGraph(tempDir);
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe("build", () => {
    it("should build graph from files", async () => {
      const file1 = path.join(tempDir, "file1.ts");
      fs.writeFileSync(file1, "export const x = 1;");

      await graph.build([file1]);

      const nodes = graph.getNodes();
      expect(nodes.has(file1)).toBe(true);
    });

    it("should resolve imports", async () => {
      const file1 = path.join(tempDir, "file1.ts");
      fs.writeFileSync(file1, 'import { y } from "./file2";');

      const file2 = path.join(tempDir, "file2.ts");
      fs.writeFileSync(file2, "export const y = 2;");

      await graph.build([file1, file2]);

      const resolved = graph.resolveImport("./file2", file1);
      expect(resolved).toBe(file2);
    });

    it("should handle multiple files", async () => {
      const file1 = path.join(tempDir, "file1.ts");
      fs.writeFileSync(file1, "export const x = 1;");

      const file2 = path.join(tempDir, "file2.ts");
      fs.writeFileSync(file2, "export const y = 2;");

      await graph.build([file1, file2]);

      const nodes = graph.getNodes();
      expect(nodes.size).toBeGreaterThanOrEqual(2);
    });

    it("should handle entry points", async () => {
      const entryFile = path.join(tempDir, "index.ts");
      fs.writeFileSync(entryFile, "export default {};");

      await graph.build([entryFile]);

      const nodes = graph.getNodes();
      const node = nodes.get(entryFile);
      expect(node?.isEntryPoint).toBe(true);
    });
  });

  describe("resolveImport", () => {
    it("should resolve relative imports", async () => {
      const file1 = path.join(tempDir, "src", "file1.ts");
      fs.mkdirSync(path.dirname(file1), { recursive: true });
      fs.writeFileSync(file1, 'import { x } from "./file2";');

      const file2 = path.join(tempDir, "src", "file2.ts");
      fs.writeFileSync(file2, "export const x = 1;");

      await graph.build([file1, file2]);

      const resolved = graph.resolveImport("./file2", file1);
      expect(resolved).toBe(file2);
    });

    it("should return null for unresolved imports", async () => {
      const file1 = path.join(tempDir, "file1.ts");
      fs.writeFileSync(file1, 'import { x } from "./nonexistent";');

      await graph.build([file1]);

      const resolved = graph.resolveImport("./nonexistent", file1);
      expect(resolved).toBeNull();
    });
  });

  describe("getNodes", () => {
    it("should return all nodes", async () => {
      const file1 = path.join(tempDir, "file1.ts");
      fs.writeFileSync(file1, "export const x = 1;");

      await graph.build([file1]);

      const nodes = graph.getNodes();
      expect(nodes.size).toBeGreaterThan(0);
    });
  });

  describe("getAllFiles", () => {
    it("should return all files", async () => {
      const file1 = path.join(tempDir, "file1.ts");
      fs.writeFileSync(file1, "export const x = 1;");

      const file2 = path.join(tempDir, "file2.ts");
      fs.writeFileSync(file2, "export const y = 2;");

      await graph.build([file1, file2]);

      const files = graph.getAllFiles();
      expect(files.length).toBeGreaterThanOrEqual(2);
    });
  });
});
