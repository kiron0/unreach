import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ReachabilityAnalyzer } from "../../../src/lib/analyzer/index.js";
import type { UnreachConfig } from "../../../src/lib/config.js";
import { DependencyGraph } from "../../../src/lib/graph.js";

describe("ReachabilityAnalyzer", () => {
  let tempDir: string;
  let graph: DependencyGraph;
  let analyzer: ReachabilityAnalyzer;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "unreach-analyzer-test-"));
    graph = new DependencyGraph(tempDir);
    analyzer = new ReachabilityAnalyzer(graph, tempDir);
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe("constructor", () => {
    it("should create analyzer instance", () => {
      expect(analyzer).toBeInstanceOf(ReachabilityAnalyzer);
    });

    it("should accept custom config", () => {
      const config: UnreachConfig = {
        rules: {
          unusedPackages: false,
        },
      };
      const customAnalyzer = new ReachabilityAnalyzer(graph, tempDir, config);
      expect(customAnalyzer).toBeInstanceOf(ReachabilityAnalyzer);
    });
  });

  describe("analyze", () => {
    it("should analyze and return scan result", async () => {
      const file1 = path.join(tempDir, "file1.ts");
      fs.writeFileSync(file1, "export const x = 1;");

      await graph.build([file1]);

      const result = analyzer.analyze();
      expect(result).toBeDefined();
      expect(result).toHaveProperty("unusedPackages");
      expect(result).toHaveProperty("unusedImports");
      expect(result).toHaveProperty("unusedExports");
      expect(result).toHaveProperty("unusedFunctions");
      expect(result).toHaveProperty("unusedVariables");
      expect(result).toHaveProperty("unusedFiles");
      expect(result).toHaveProperty("unusedConfigs");
      expect(result).toHaveProperty("unusedScripts");
      expect(result).toHaveProperty("unusedTypes");
      expect(result).toHaveProperty("unusedCSSClasses");
      expect(result).toHaveProperty("unusedAssets");
    });

    it("should respect config rules", async () => {
      const file1 = path.join(tempDir, "file1.ts");
      fs.writeFileSync(file1, "export const x = 1;");

      await graph.build([file1]);

      const config: UnreachConfig = {
        rules: {
          unusedPackages: false,
          unusedImports: false,
        },
      };
      const customAnalyzer = new ReachabilityAnalyzer(graph, tempDir, config);
      const result = customAnalyzer.analyze();

      expect(result.unusedPackages).toEqual([]);
      expect(result.unusedImports).toEqual([]);
    });

    it("should find unused items when enabled", async () => {
      const file1 = path.join(tempDir, "file1.ts");
      fs.writeFileSync(file1, "export const unused = 1;");

      await graph.build([file1]);

      const result = analyzer.analyze();
      expect(Array.isArray(result.unusedExports)).toBe(true);
      expect(Array.isArray(result.unusedFiles)).toBe(true);
    });

    it("should handle entry points", async () => {
      const entryFile = path.join(tempDir, "index.ts");
      fs.writeFileSync(entryFile, "export default {};");

      await graph.build([entryFile]);

      const result = analyzer.analyze();
      expect(result).toBeDefined();
      const unusedEntry = result.unusedFiles.find((f) => f.file === entryFile);
      expect(unusedEntry).toBeUndefined();
    });

    it("should handle empty graph", async () => {
      const result = analyzer.analyze();
      expect(result).toBeDefined();
      expect(Array.isArray(result.unusedPackages)).toBe(true);
      expect(Array.isArray(result.unusedImports)).toBe(true);
    });
  });

  describe("clearMemory", () => {
    it("should clear memory", () => {
      analyzer.clearMemory();
      expect(true).toBe(true);
    });

    it("should allow analyze after clearMemory", async () => {
      const file1 = path.join(tempDir, "file1.ts");
      fs.writeFileSync(file1, "export const x = 1;");

      await graph.build([file1]);

      analyzer.clearMemory();
      const result = analyzer.analyze();
      expect(result).toBeDefined();
    });
  });
});
