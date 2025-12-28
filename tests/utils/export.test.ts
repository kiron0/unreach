import { describe, expect, it } from "vitest";
import {
  getFormatExtension,
  OutputFormat,
  parseCommaSeparated,
  parseOutputFormat,
} from "../../src/utils/export.js";

describe("export utilities", () => {
  describe("parseCommaSeparated", () => {
    it("should parse comma-separated values", () => {
      const result = parseCommaSeparated("a, b, c");
      expect(result).toEqual(["a", "b", "c"]);
    });

    it("should trim whitespace", () => {
      const result = parseCommaSeparated("  a  ,  b  ,  c  ");
      expect(result).toEqual(["a", "b", "c"]);
    });

    it("should filter empty values", () => {
      const result = parseCommaSeparated("a, , b, , c");
      expect(result).toEqual(["a", "b", "c"]);
    });

    it("should handle single value", () => {
      const result = parseCommaSeparated("single");
      expect(result).toEqual(["single"]);
    });

    it("should handle empty string", () => {
      const result = parseCommaSeparated("");
      expect(result).toEqual([]);
    });
  });

  describe("parseOutputFormat", () => {
    it("should return undefined for undefined input", () => {
      const result = parseOutputFormat(undefined);
      expect(result).toBeUndefined();
    });

    it("should return Json for true", () => {
      const result = parseOutputFormat(true);
      expect(result).toBe(OutputFormat.Json);
    });

    it("should parse single format", () => {
      const result = parseOutputFormat("json");
      expect(result).toBe(OutputFormat.Json);
    });

    it("should parse multiple formats", () => {
      const result = parseOutputFormat("json,csv,html");
      expect(Array.isArray(result)).toBe(true);
      if (Array.isArray(result)) {
        expect(result).toContain(OutputFormat.Json);
        expect(result).toContain(OutputFormat.Csv);
        expect(result).toContain(OutputFormat.Html);
      }
    });

    it("should handle case-insensitive formats", () => {
      const result = parseOutputFormat("JSON");
      expect(result).toBe(OutputFormat.Json);
    });

    it("should filter invalid formats", () => {
      const result = parseOutputFormat("json,invalid,html");
      if (Array.isArray(result)) {
        expect(result).toContain(OutputFormat.Json);
        expect(result).toContain(OutputFormat.Html);
        expect(result).not.toContain("invalid");
      }
    });

    it("should return undefined for all invalid formats", () => {
      const result = parseOutputFormat("invalid1,invalid2");
      expect(result).toBeUndefined();
    });
  });

  describe("getFormatExtension", () => {
    it("should return correct extension for Json", () => {
      expect(getFormatExtension(OutputFormat.Json)).toBe("json");
    });

    it("should return correct extension for Csv", () => {
      expect(getFormatExtension(OutputFormat.Csv)).toBe("csv");
    });

    it("should return correct extension for Tsv", () => {
      expect(getFormatExtension(OutputFormat.Tsv)).toBe("tsv");
    });

    it("should return correct extension for Md", () => {
      expect(getFormatExtension(OutputFormat.Md)).toBe("md");
    });

    it("should return correct extension for Html", () => {
      expect(getFormatExtension(OutputFormat.Html)).toBe("html");
    });
  });
});
