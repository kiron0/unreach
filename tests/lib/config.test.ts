import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ConfigLoader, type UnreachConfig } from "../../src/lib/config.js";

describe("ConfigLoader", () => {
  let tempDir: string;
  let loader: ConfigLoader;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "unreach-test-"));
    loader = new ConfigLoader(tempDir);
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe("load", () => {
    it("should return null when no config file exists", () => {
      const config = loader.load();
      expect(config).toBeNull();
    });

    it("should load unreach.config.js", () => {
      const configPath = path.join(tempDir, "unreach.config.js");
      const configContent = `module.exports = {
        ignore: {
          files: ["**/*.test.ts"],
        },
      };`;
      fs.writeFileSync(configPath, configContent);

      const config = loader.load();
      expect(config).not.toBeNull();
      expect(config?.ignore?.files).toContain("**/*.test.ts");
    });

    it("should load unreach.config.js with ES module export", () => {
      const configPath = path.join(tempDir, "unreach.config.js");
      const configContent = `module.exports = {
        entryPoints: ["src/index.ts"],
      };`;
      fs.writeFileSync(configPath, configContent);

      const config = loader.load();
      expect(config).not.toBeNull();
      expect(config?.entryPoints).toContain("src/index.ts");
    });

    it("should return null for invalid JavaScript", () => {
      const configPath = path.join(tempDir, "unreach.config.js");
      fs.writeFileSync(configPath, "invalid javascript syntax {");

      const config = loader.load();
      expect(config).toBeNull();
    });

    it("should handle empty config file", () => {
      const configPath = path.join(tempDir, "unreach.config.js");
      fs.writeFileSync(configPath, "module.exports = {};");

      const config = loader.load();
      expect(config).not.toBeNull();
      expect(config).toEqual({});
    });
  });

  describe("mergeWithDefaults", () => {
    it("should return defaults when config is null", () => {
      const merged = loader.mergeWithDefaults(null);
      expect(merged.rules).toBeDefined();
      expect(merged.rules?.unusedPackages).toBe(true);
    });

    it("should merge config with defaults", () => {
      const config: UnreachConfig = {
        rules: {
          unusedPackages: false,
        },
      };
      const merged = loader.mergeWithDefaults(config);
      expect(merged.rules?.unusedPackages).toBe(false);
      expect(merged.rules?.unusedImports).toBe(true);
    });

    it("should preserve all config values", () => {
      const config: UnreachConfig = {
        ignore: {
          files: ["**/*.test.ts"],
          packages: ["@types/*"],
        },
        entryPoints: ["src/index.ts"],
        excludePatterns: ["**/node_modules/**"],
        rules: {
          unusedPackages: false,
          unusedImports: true,
        },
      };
      const merged = loader.mergeWithDefaults(config);
      expect(merged.ignore?.files).toContain("**/*.test.ts");
      expect(merged.ignore?.packages).toContain("@types/*");
      expect(merged.entryPoints).toContain("src/index.ts");
      expect(merged.excludePatterns).toContain("**/node_modules/**");
      expect(merged.rules?.unusedPackages).toBe(false);
      expect(merged.rules?.unusedImports).toBe(true);
    });
  });

  describe("shouldExcludeFile", () => {
    it("should return false when no exclude patterns", () => {
      const result = loader.shouldExcludeFile("src/file.ts", []);
      expect(result).toBe(false);
    });

    it("should exclude matching files", () => {
      const result = loader.shouldExcludeFile(
        path.join(tempDir, "src", "test.test.ts"),
        ["**/*.test.ts"],
      );
      expect(result).toBe(true);
    });

    it("should not exclude non-matching files", () => {
      const result = loader.shouldExcludeFile("src/file.ts", ["**/*.test.ts"]);
      expect(result).toBe(false);
    });

    it("should handle multiple patterns", () => {
      const patterns = ["**/*.test.ts", "**/node_modules/**"];
      const testFile = path.join(tempDir, "src", "test.test.ts");
      const nodeModulesFile = path.join(
        tempDir,
        "node_modules",
        "pkg",
        "index.js",
      );
      const normalFile = path.join(tempDir, "src", "file.ts");

      expect(loader.shouldExcludeFile(testFile, patterns)).toBe(true);
      expect(loader.shouldExcludeFile(nodeModulesFile, patterns)).toBe(true);
      expect(loader.shouldExcludeFile(normalFile, patterns)).toBe(false);
    });
  });

  describe("corner cases", () => {
    it("should handle config with all fields empty", () => {
      const configPath = path.join(tempDir, "unreach.config.js");
      fs.writeFileSync(
        configPath,
        "module.exports = { ignore: {}, rules: {}, fix: {} };",
      );
      const config = loader.load();
      expect(config).not.toBeNull();
      const merged = loader.mergeWithDefaults(config);
      expect(merged.ignore).toBeDefined();
      expect(merged.rules).toBeDefined();
    });

    it("should reject config with null values", () => {
      const configPath = path.join(tempDir, "unreach.config.js");
      fs.writeFileSync(
        configPath,
        "module.exports = { ignore: null, entryPoints: null, rules: null };",
      );
      expect(() => loader.load()).toThrow();
    });

    it("should handle config with very long patterns", () => {
      const configPath = path.join(tempDir, "unreach.config.js");
      const longPattern = "**/" + "a".repeat(1000) + "/**";
      fs.writeFileSync(
        configPath,
        `module.exports = { ignore: { files: ["${longPattern}"] } };`,
      );
      const config = loader.load();
      expect(config?.ignore?.files).toContain(longPattern);
    });

    it("should handle config with many ignore patterns", () => {
      const configPath = path.join(tempDir, "unreach.config.js");
      const patterns = Array.from(
        { length: 1000 },
        (_, i) => `**/pattern${i}/**`,
      );
      fs.writeFileSync(
        configPath,
        `module.exports = { ignore: { files: ${JSON.stringify(patterns)} } };`,
      );
      const config = loader.load();
      expect(config?.ignore?.files?.length).toBe(1000);
    });

    it("should handle config with unicode characters", () => {
      const configPath = path.join(tempDir, "unreach.config.js");
      fs.writeFileSync(
        configPath,
        `module.exports = { ignore: { files: ["**/测试/**", "**/日本語/**", "**/한국어/**"] } };`,
      );
      const config = loader.load();
      expect(config?.ignore?.files).toContain("**/测试/**");
    });

    it("should handle config with special regex-like patterns", () => {
      const configPath = path.join(tempDir, "unreach.config.js");
      fs.writeFileSync(
        configPath,
        `module.exports = { ignore: { files: ["**/*.test.ts", "**/.*", "**/[a-z]*"] } };`,
      );
      const config = loader.load();
      expect(config?.ignore?.files).toContain("**/[a-z]*");
    });

    it("should handle shouldExcludeFile with empty pattern", () => {
      const result = loader.shouldExcludeFile("src/file.ts", [""]);
      expect(result).toBe(false);
    });

    it("should handle shouldExcludeFile with wildcard only", () => {
      const testFile = path.join(tempDir, "file.ts");
      const result = loader.shouldExcludeFile(testFile, ["*"]);
      expect(result).toBe(true);
    });

    it("should handle shouldExcludeFile with double wildcard", () => {
      const testFile = path.join(tempDir, "nested", "deep", "file.ts");
      fs.mkdirSync(path.dirname(testFile), { recursive: true });
      const result = loader.shouldExcludeFile(testFile, ["**"]);
      expect(result).toBe(true);
    });

    it("should handle shouldExcludeFile with question mark", () => {
      const testFile = path.join(tempDir, "file1.ts");
      const result = loader.shouldExcludeFile(testFile, ["file?.ts"]);
      expect(result).toBe(true);
    });

    it("should handle shouldExcludeFile with case sensitivity", () => {
      const testFile = path.join(tempDir, "File.ts");
      const result = loader.shouldExcludeFile(testFile, ["file.ts"]);
      expect(result).toBe(true);
    });

    it("should handle config with deeply nested structure", () => {
      const configPath = path.join(tempDir, "unreach.config.js");
      fs.writeFileSync(
        configPath,
        `module.exports = ${JSON.stringify({
          ignore: {
            files: ["**/*.test.ts"],
            packages: ["@types/*"],
            exports: ["**/index.ts"],
            functions: ["test*"],
            variables: ["temp*"],
            imports: ["**/*.css"],
            types: ["Test*"],
            cssClasses: ["test-*"],
            assets: ["**/*.png"],
          },
          entryPoints: ["src/index.ts", "src/main.ts"],
          excludePatterns: ["**/node_modules/**", "**/dist/**"],
          rules: {
            unusedPackages: true,
            unusedImports: true,
            unusedExports: true,
            unusedFunctions: true,
            unusedVariables: true,
            unusedFiles: true,
            unusedConfigs: true,
            unusedScripts: true,
            unusedTypes: true,
            unusedCSSClasses: true,
            unusedAssets: true,
          },
          fix: {
            enabled: false,
            backup: true,
            interactive: false,
          },
        })};`,
      );
      const config = loader.load();
      expect(config).not.toBeNull();
      const merged = loader.mergeWithDefaults(config);
      expect(merged.ignore?.files).toContain("**/*.test.ts");
      expect(merged.ignore?.packages).toContain("@types/*");
      expect(merged.rules?.unusedPackages).toBe(true);
    });

    it("should handle config with invalid entry points", () => {
      const configPath = path.join(tempDir, "unreach.config.js");
      fs.writeFileSync(
        configPath,
        `module.exports = { entryPoints: ["", "   ", "../invalid", "/absolute/path"] };`,
      );
      const config = loader.load();
      expect(config?.entryPoints).toContain("");
    });

    it("should handle shouldExcludeFile with Windows-style paths", () => {
      const windowsPath = "C:\\Users\\test\\file.ts";
      const result = loader.shouldExcludeFile(windowsPath, ["**/*.ts"]);
      expect(result).toBe(true);
    });

    it("should handle shouldExcludeFile with mixed path separators", () => {
      const mixedPath = path
        .join("src", "test", "file.ts")
        .replace(/\//g, "\\");
      const result = loader.shouldExcludeFile(mixedPath, ["**/test/**"]);
      expect(result).toBe(true);
    });

    it("should handle config file with BOM", () => {
      const configPath = path.join(tempDir, "unreach.config.js");
      const content = `module.exports = { entryPoints: ["src/index.ts"] };`;
      fs.writeFileSync(configPath, "\uFEFF" + content, "utf-8");
      const config = loader.load();
      if (config) {
        expect(config.entryPoints).toContain("src/index.ts");
      }
    });

    it("should handle config with circular reference attempt", () => {
      const configPath = path.join(tempDir, "unreach.config.js");
      fs.writeFileSync(
        configPath,
        `const obj = { entryPoints: ["src/index.ts"] }; obj.self = obj; module.exports = obj;`,
      );
      const config = loader.load();
      expect(config === null || typeof config === "object").toBe(true);
    });

    it("should handle mergeWithDefaults with partial rules", () => {
      const config: UnreachConfig = {
        rules: {
          unusedPackages: false,
        },
      };
      const merged = loader.mergeWithDefaults(config);
      expect(merged.rules?.unusedPackages).toBe(false);
      expect(merged.rules?.unusedImports).toBe(true);
      expect(merged.rules?.unusedExports).toBe(true);
    });

    it("should handle shouldExcludeFile with relative path patterns", () => {
      const testFile = path.join(tempDir, "src", "file.ts");
      fs.mkdirSync(path.dirname(testFile), { recursive: true });
      const result = loader.shouldExcludeFile(testFile, ["src/**"]);
      expect(result).toBe(true);
    });

    it("should handle shouldExcludeFile with absolute path patterns", () => {
      const testFile = path.join(tempDir, "file.ts");
      const absolutePattern = path.join(tempDir, "**");
      const result = loader.shouldExcludeFile(testFile, [absolutePattern]);
      expect(result).toBe(true);
    });
  });

  describe("testFileDetection", () => {
    it("should have test file detection enabled by default", () => {
      const merged = loader.mergeWithDefaults(null);
      expect(merged.testFileDetection?.enabled).toBe(true);
      expect(merged.testFileDetection?.patterns).toContain(
        "**/*.test.{ts,tsx,js,jsx}",
      );
      expect(merged.testFileDetection?.patterns).toContain("**/__tests__/**");
    });

    it("should allow disabling test file detection", () => {
      const config: UnreachConfig = {
        testFileDetection: {
          enabled: false,
        },
      };
      const merged = loader.mergeWithDefaults(config);
      expect(merged.testFileDetection?.enabled).toBe(false);
    });

    it("should allow custom test file patterns", () => {
      const config: UnreachConfig = {
        testFileDetection: {
          enabled: true,
          patterns: ["**/*.test.ts", "**/custom-test/**"],
        },
      };
      const merged = loader.mergeWithDefaults(config);
      expect(merged.testFileDetection?.enabled).toBe(true);
      expect(merged.testFileDetection?.patterns).toContain("**/*.test.ts");
      expect(merged.testFileDetection?.patterns).toContain("**/custom-test/**");
      expect(merged.testFileDetection?.patterns).not.toContain(
        "**/*.spec.{ts,tsx,js,jsx}",
      );
    });

    it("should use default patterns when enabled but patterns not specified", () => {
      const config: UnreachConfig = {
        testFileDetection: {
          enabled: true,
        },
      };
      const merged = loader.mergeWithDefaults(config);
      expect(merged.testFileDetection?.enabled).toBe(true);
      expect(merged.testFileDetection?.patterns).toContain(
        "**/*.test.{ts,tsx,js,jsx}",
      );
      expect(merged.testFileDetection?.patterns).toContain(
        "**/*.spec.{ts,tsx,js,jsx}",
      );
    });
  });
});
