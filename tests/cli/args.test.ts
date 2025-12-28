import { describe, expect, it } from "vitest";
import { createCommand, parseArgs } from "../../src/cli/args.js";

describe("CLI args", () => {
  describe("createCommand", () => {
    it("should create a command", () => {
      const program = createCommand();
      expect(program).toBeDefined();
    });

    it("should have scan command", () => {
      const program = createCommand();
      const commands = program.commands.map((cmd) => cmd.name());
      expect(commands).toContain("scan");
    });
  });

  describe("parseArgs", () => {
    it("should parse basic args", () => {
      const originalArgv = process.argv;
      process.argv = ["node", "unreach", "scan"];

      const args = parseArgs();
      expect(args).toBeDefined();

      process.argv = originalArgv;
    });

    it("should parse entry option", () => {
      const originalArgv = process.argv;
      process.argv = ["node", "unreach", "scan", "--entry", "src/index.ts"];

      const args = parseArgs();
      expect(args.entry).toBeDefined();

      process.argv = originalArgv;
    });

    it("should parse export option", () => {
      const originalArgv = process.argv;
      process.argv = ["node", "unreach", "scan", "--export", "json"];

      const args = parseArgs();
      expect(args.export).toBeDefined();

      process.argv = originalArgv;
    });

    it("should parse watch option", () => {
      const originalArgv = process.argv;
      process.argv = ["node", "unreach", "scan", "--watch"];

      const args = parseArgs();
      expect(args.watch).toBe(true);

      process.argv = originalArgv;
    });

    it("should parse quiet option", () => {
      const originalArgv = process.argv;
      process.argv = ["node", "unreach", "scan", "--quiet"];

      const args = parseArgs();
      expect(args.quiet).toBe(true);

      process.argv = originalArgv;
    });

    it("should parse verbose option", () => {
      const originalArgv = process.argv;
      process.argv = ["node", "unreach", "scan", "--verbose"];

      const args = parseArgs();
      expect(args.verbose).toBe(true);

      process.argv = originalArgv;
    });

    it("should parse debug option", () => {
      const originalArgv = process.argv;
      process.argv = ["node", "unreach", "scan", "--debug"];

      const args = parseArgs();
      expect(args.debug).toBe(true);

      process.argv = originalArgv;
    });

    it("should parse no-config option", () => {
      const originalArgv = process.argv;
      process.argv = ["node", "unreach", "scan", "--no-config"];

      const args = parseArgs();
      expect(args.noConfig).toBe(true);

      process.argv = originalArgv;
    });
  });
});
