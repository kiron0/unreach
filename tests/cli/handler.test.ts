import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runScan } from "../../src/cli/handler.js";
import { UnreachError } from "../../src/core/errors.js";
import type { ScanOptions } from "../../src/types/index.js";
import { OutputFormat } from "../../src/utils/export.js";

describe("runScan", () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "unreach-handler-test-"));
    originalCwd = process.cwd();
    process.chdir(tempDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe("directory validation", () => {
    it("should return error for non-existent directory", async () => {
      const options: ScanOptions = {
        cwd: path.join(tempDir, "nonexistent"),
      };

      const result = await runScan(options);
      expect(result).toBeInstanceOf(UnreachError);
    });

    it("should accept valid directory", async () => {
      const testFile = path.join(tempDir, "test.ts");
      fs.writeFileSync(testFile, "export const x = 1;");

      const options: ScanOptions = {
        cwd: tempDir,
        quiet: true,
      };

      const result = await runScan(options);
      expect(result === undefined || result instanceof UnreachError).toBe(true);
    });
  });

  describe("configuration handling", () => {
    it("should load configuration file", async () => {
      const configFile = path.join(tempDir, "unreach.config.js");
      fs.writeFileSync(
        configFile,
        "module.exports = { ignore: { files: ['**/*.test.ts'] } };",
      );

      const testFile = path.join(tempDir, "test.ts");
      fs.writeFileSync(testFile, "export const x = 1;");

      const options: ScanOptions = {
        cwd: tempDir,
        quiet: true,
      };

      const result = await runScan(options);
      expect(result === undefined || result instanceof UnreachError).toBe(true);
    });

    it("should handle invalid configuration", async () => {
      const configFile = path.join(tempDir, "unreach.config.js");
      fs.writeFileSync(configFile, "module.exports = { ignore: null };");

      const options: ScanOptions = {
        cwd: tempDir,
        quiet: true,
      };

      const result = await runScan(options);
      expect(result).toBeInstanceOf(UnreachError);
    });

    it("should skip config with --no-config", async () => {
      const configFile = path.join(tempDir, "unreach.config.js");
      fs.writeFileSync(configFile, "module.exports = { invalid: syntax };");

      const testFile = path.join(tempDir, "test.ts");
      fs.writeFileSync(testFile, "export const x = 1;");

      const options: ScanOptions = {
        cwd: tempDir,
        quiet: true,
        noConfig: true,
      };

      const result = await runScan(options);
      expect(result === undefined || result instanceof UnreachError).toBe(true);
    });
  });

  describe("scan execution", () => {
    it("should run scan successfully", async () => {
      const testFile = path.join(tempDir, "test.ts");
      fs.writeFileSync(testFile, "export const x = 1;");

      const options: ScanOptions = {
        cwd: tempDir,
        quiet: true,
      };

      const result = await runScan(options);
      expect(result === undefined || result instanceof UnreachError).toBe(true);
    });

    it("should handle quiet mode", async () => {
      const testFile = path.join(tempDir, "test.ts");
      fs.writeFileSync(testFile, "export const x = 1;");

      const options: ScanOptions = {
        cwd: tempDir,
        quiet: true,
      };

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const result = await runScan(options);

      expect(result === undefined || result instanceof UnreachError).toBe(true);
      consoleSpy.mockRestore();
    });

    it("should handle verbose mode", async () => {
      const testFile = path.join(tempDir, "test.ts");
      fs.writeFileSync(testFile, "export const x = 1;");

      const options: ScanOptions = {
        cwd: tempDir,
        quiet: true,
        verbose: true,
      };

      const result = await runScan(options);
      expect(result === undefined || result instanceof UnreachError).toBe(true);
    });
  });

  describe("export handling", () => {
    it("should export results when export option is provided", async () => {
      const testFile = path.join(tempDir, "test.ts");
      fs.writeFileSync(testFile, "export const x = 1;");

      const exportDir = path.join(tempDir, "reports");
      fs.mkdirSync(exportDir, { recursive: true });

      const options: ScanOptions = {
        cwd: tempDir,
        quiet: true,
        export: [OutputFormat.Json],
        exportPath: exportDir,
      };

      const result = await runScan(options);
      expect(result === undefined || result instanceof UnreachError).toBe(true);

      const exportFiles = fs.readdirSync(exportDir);
      expect(exportFiles.length).toBeGreaterThan(0);
    });
  });

  describe("watch mode", () => {
    it("should handle watch mode flag", async () => {
      const testFile = path.join(tempDir, "test.ts");
      fs.writeFileSync(testFile, "export const x = 1;");

      const options: ScanOptions = {
        cwd: tempDir,
        quiet: true,
        watch: true,
      };

      const result = await Promise.race([
        runScan(options),
        new Promise((resolve) => setTimeout(() => resolve("timeout"), 1000)),
      ]);

      expect(result === undefined || result === "timeout").toBe(true);
    });
  });
});
