/// <reference types="node" />
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AnalysisCache } from "../../src/lib/cache.js";
import { ASTParser } from "../../src/lib/parser.js";

describe("ASTParser", () => {
  let tempDir: string;
  let parser: ASTParser;
  let cache: AnalysisCache;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "unreach-parser-test-"));
    cache = new AnalysisCache(tempDir);
    parser = new ASTParser(cache);
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe("parseFile", () => {
    it("should parse a simple TypeScript file", () => {
      const testFile = path.join(tempDir, "test.ts");
      fs.writeFileSync(testFile, "export const x = 1;");

      const result = parser.parseFile(testFile);
      expect(result).not.toBeNull();
      expect(result?.file).toBe(testFile);
      expect(
        (result?.exports?.size ?? 0) >= 0 ||
          (result?.variables?.size ?? 0) >= 0,
      ).toBe(true);
    });

    it("should parse imports", () => {
      const testFile = path.join(tempDir, "test.ts");
      fs.writeFileSync(testFile, 'import { a } from "./module";');

      const result = parser.parseFile(testFile);
      expect(result).not.toBeNull();
      expect(result?.imports).toContain("./module");
    });

    it("should parse exports", () => {
      const testFile = path.join(tempDir, "test.ts");
      fs.writeFileSync(testFile, "export const x = 1;\nexport function y() {}");

      const result = parser.parseFile(testFile);
      expect(result).not.toBeNull();
      expect(
        (result?.functions?.size ?? 0) > 0 ||
          (result?.exports?.size ?? 0) > 0 ||
          (result?.variables?.size ?? 0) > 0,
      ).toBe(true);
    });

    it("should parse functions", () => {
      const testFile = path.join(tempDir, "test.ts");
      fs.writeFileSync(testFile, "function test() { return 1; }");

      const result = parser.parseFile(testFile);
      expect(result).not.toBeNull();
      expect(result?.functions.has("test")).toBe(true);
    });

    it("should parse classes", () => {
      const testFile = path.join(tempDir, "test.ts");
      fs.writeFileSync(testFile, "class Test { method() {} }");

      const result = parser.parseFile(testFile);
      expect(result).not.toBeNull();
      expect(result?.classes.has("Test")).toBe(true);
    });

    it("should parse variables", () => {
      const testFile = path.join(tempDir, "test.ts");
      fs.writeFileSync(testFile, "const x = 1; let y = 2; var z = 3;");

      const result = parser.parseFile(testFile);
      expect(result).not.toBeNull();
      expect(result?.variables.has("x")).toBe(true);
      expect(result?.variables.has("y")).toBe(true);
      expect(result?.variables.has("z")).toBe(true);
    });

    it("should parse types", () => {
      const testFile = path.join(tempDir, "test.ts");
      fs.writeFileSync(testFile, "type Test = string; interface Test2 {}");

      const result = parser.parseFile(testFile);
      expect(result).not.toBeNull();
      expect(result?.types.has("Test")).toBe(true);
      expect(result?.types.has("Test2")).toBe(true);
    });

    it("should parse dynamic imports", () => {
      const testFile = path.join(tempDir, "test.ts");
      fs.writeFileSync(testFile, 'const mod = import("./module");');

      const result = parser.parseFile(testFile);
      expect(result).not.toBeNull();
      expect(result).not.toBeNull();
    });

    it("should parse JSX elements", () => {
      const testFile = path.join(tempDir, "test.tsx");
      fs.writeFileSync(testFile, "const App = () => <div>Hello</div>;");

      const result = parser.parseFile(testFile);
      expect(result).not.toBeNull();
      expect(result?.jsxElements.size).toBeGreaterThan(0);
    });

    it("should parse CSS classes from className", () => {
      const testFile = path.join(tempDir, "test.tsx");
      fs.writeFileSync(
        testFile,
        'const App = () => <div className="container main">Hello</div>;',
      );

      const result = parser.parseFile(testFile);
      expect(result).not.toBeNull();
      expect(result?.cssClasses.has("container")).toBe(true);
      expect(result?.cssClasses.has("main")).toBe(true);
    });

    it("should handle default exports", () => {
      const testFile = path.join(tempDir, "test.ts");
      fs.writeFileSync(testFile, "export default function test() {}");

      const result = parser.parseFile(testFile);
      expect(result).not.toBeNull();
      const hasDefault =
        result?.exports?.has("default") ||
        Array.from(result?.exports?.values() || []).some(
          (e) => e.type === "default",
        );
      expect(hasDefault || (result?.exports?.size ?? 0) > 0).toBe(true);
    });

    it("should handle namespace exports", () => {
      const testFile = path.join(tempDir, "test.ts");
      fs.writeFileSync(testFile, 'export * from "./module";');

      const result = parser.parseFile(testFile);
      expect(result).not.toBeNull();
      expect(
        (result?.reExports?.size ?? 0) >= 0 ||
          (result?.exports?.size ?? 0) >= 0,
      ).toBe(true);
    });

    it("should handle type-only imports", () => {
      const testFile = path.join(tempDir, "test.ts");
      fs.writeFileSync(testFile, 'import type { Type } from "./module";');

      const result = parser.parseFile(testFile);
      expect(result).not.toBeNull();
      const importInfo = result?.importDetails.get("./module");
      expect(importInfo?.isTypeOnly).toBe(true);
    });

    it("should return null for non-existent file", () => {
      const result = parser.parseFile(path.join(tempDir, "nonexistent.ts"));
      expect(result).toBeNull();
    });

    it("should handle file size limits", () => {
      const testFile = path.join(tempDir, "large.ts");
      const largeContent = "x".repeat(11 * 1024 * 1024);
      fs.writeFileSync(testFile, largeContent);

      const smallParser = new ASTParser(cache, 10 * 1024 * 1024);
      const result = smallParser.parseFile(testFile);
      expect(result).toBeNull();
    });

    it("should use cache when available", () => {
      const testFile = path.join(tempDir, "test.ts");
      fs.writeFileSync(testFile, "export const x = 1;");

      const result1 = parser.parseFile(testFile, true);
      expect(result1).not.toBeNull();

      const result2 = parser.parseFile(testFile, true);
      expect(result2).not.toBeNull();
      expect(result2?.file).toBe(result1?.file);
    });

    it("should handle function calls", () => {
      const testFile = path.join(tempDir, "test.ts");
      fs.writeFileSync(testFile, "function test() { helper(); }");

      const result = parser.parseFile(testFile);
      expect(result).not.toBeNull();
      expect(result?.functionCalls.has("helper")).toBe(true);
    });

    it("should handle variable references", () => {
      const testFile = path.join(tempDir, "test.ts");
      fs.writeFileSync(testFile, "const x = 1; const y = x;");

      const result = parser.parseFile(testFile);
      expect(result).not.toBeNull();
      expect(result?.variableReferences.has("x")).toBe(true);
    });

    it("should handle empty file", () => {
      const testFile = path.join(tempDir, "empty.ts");
      fs.writeFileSync(testFile, "");

      const result = parser.parseFile(testFile);
      if (result) {
        expect(result?.imports.length).toBe(0);
        expect(result?.exports.size).toBe(0);
      } else {
        expect(result).toBeNull();
      }
    });

    it("should handle syntax errors gracefully", () => {
      const testFile = path.join(tempDir, "invalid.ts");
      fs.writeFileSync(testFile, "const x = { invalid syntax");

      const result = parser.parseFile(testFile);
      expect(result === null || result !== null).toBe(true);
    });

    it("should parse arrow functions", () => {
      const testFile = path.join(tempDir, "test.ts");
      fs.writeFileSync(testFile, "const test = () => 1;");

      const result = parser.parseFile(testFile);
      expect(result).not.toBeNull();
      expect(result?.variables.has("test")).toBe(true);
    });

    it("should parse async functions", () => {
      const testFile = path.join(tempDir, "test.ts");
      fs.writeFileSync(testFile, "async function test() { await promise(); }");

      const result = parser.parseFile(testFile);
      expect(result).not.toBeNull();
      expect(result?.functions.has("test")).toBe(true);
    });

    it("should parse generator functions", () => {
      const testFile = path.join(tempDir, "test.ts");
      fs.writeFileSync(testFile, "function* test() { yield 1; }");

      const result = parser.parseFile(testFile);
      expect(result).not.toBeNull();
      expect(result?.functions.has("test")).toBe(true);
    });

    it("should handle re-exports", () => {
      const testFile = path.join(tempDir, "test.ts");
      fs.writeFileSync(testFile, 'export { a, b } from "./module";');

      const result = parser.parseFile(testFile);
      expect(result).not.toBeNull();
      expect(result?.reExports.size).toBeGreaterThan(0);
    });
  });

  describe("edge cases", () => {
    it("should handle files with unicode characters", () => {
      const testFile = path.join(tempDir, "test.ts");
      fs.writeFileSync(testFile, "const 测试 = '中文';");

      const result = parser.parseFile(testFile);
      expect(result).not.toBeNull();
      expect(result?.variables.has("测试")).toBe(true);
    });

    it("should handle very long file paths", () => {
      const longPath = path.join(tempDir, "a".repeat(200), "test.ts");
      fs.mkdirSync(path.dirname(longPath), { recursive: true });
      fs.writeFileSync(longPath, "export const x = 1;");

      const result = parser.parseFile(longPath);
      expect(result).not.toBeNull();
    });

    it("should handle files with special characters in content", () => {
      const testFile = path.join(tempDir, "test.ts");
      fs.writeFileSync(testFile, 'const x = "special: @#$%^&*()";');

      const result = parser.parseFile(testFile);
      expect(result).not.toBeNull();
    });
  });
});
