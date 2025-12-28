import * as path from "path";
import { beforeEach, describe, expect, it } from "vitest";
import {
  createFileLink,
  supportsHyperlinks,
} from "../../src/utils/file-link.js";

describe("file-link utilities", () => {
  describe("createFileLink", () => {
    it("should create file link without line/column", () => {
      const link = createFileLink("test.ts");
      expect(link).toContain("test.ts");
    });

    it("should create file link with line", () => {
      const link = createFileLink("test.ts", 10);
      expect(link).toContain("test.ts");
      expect(link).toContain("10");
    });

    it("should create file link with line and column", () => {
      const link = createFileLink("test.ts", 10, 5);
      expect(link).toContain("test.ts");
      expect(link).toContain("10");
      expect(link).toContain("5");
    });

    it("should handle absolute paths", () => {
      const absolutePath = path.resolve("test.ts");
      const link = createFileLink(absolutePath);
      expect(link).toContain("test.ts");
    });

    it("should handle relative paths", () => {
      const link = createFileLink("./test.ts");
      expect(link).toContain("test.ts");
    });

    it("should normalize paths", () => {
      const link = createFileLink("a/../b/test.ts");
      const relativePathMatch = link.match(/b\/test\.ts/);
      expect(relativePathMatch).not.toBeNull();
      const hasUnnormalizedPattern = /a\/\.\.\/b/.test(link);
      expect(hasUnnormalizedPattern).toBe(false);
    });
  });

  describe("supportsHyperlinks", () => {
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
      originalEnv = { ...process.env };
    });

    it("should return true for VS Code", () => {
      process.env.TERM_PROGRAM = "vscode";
      expect(supportsHyperlinks()).toBe(true);
      process.env = originalEnv;
    });

    it("should return true for VS Code injection", () => {
      process.env.VSCODE_INJECTION = "1";
      expect(supportsHyperlinks()).toBe(true);
      process.env = originalEnv;
    });

    it("should return true for JetBrains IDE", () => {
      process.env.JETBRAINS_IDE = "1";
      expect(supportsHyperlinks()).toBe(true);
      process.env = originalEnv;
    });

    it("should return true for Hyper terminal", () => {
      process.env.TERM_PROGRAM = "Hyper";
      expect(supportsHyperlinks()).toBe(true);
      process.env = originalEnv;
    });

    it("should return true for xterm", () => {
      process.env.TERM = "xterm-256color";
      expect(supportsHyperlinks()).toBe(true);
      process.env = originalEnv;
    });

    it("should return false for unsupported terminals", () => {
      delete process.env.TERM_PROGRAM;
      delete process.env.VSCODE_INJECTION;
      delete process.env.JETBRAINS_IDE;
      delete process.env.TERM;
      expect(supportsHyperlinks()).toBe(false);
      process.env = originalEnv;
    });
  });
});
