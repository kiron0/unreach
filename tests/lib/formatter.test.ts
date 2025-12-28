import { beforeEach, describe, expect, it } from "vitest";
import { ResultFormatter } from "../../src/lib/formatter.js";
import type { ScanResult } from "../../src/types/index.js";
import { OutputFormat } from "../../src/utils/export.js";

describe("ResultFormatter", () => {
  let formatter: ResultFormatter;
  let emptyResult: ScanResult;

  beforeEach(() => {
    formatter = new ResultFormatter();
    emptyResult = {
      unusedPackages: [],
      unusedImports: [],
      unusedExports: [],
      unusedFunctions: [],
      unusedVariables: [],
      unusedFiles: [],
      unusedConfigs: [],
      unusedScripts: [],
      unusedTypes: [],
      unusedCSSClasses: [],
      unusedAssets: [],
    };
  });

  describe("format", () => {
    it("should format text output by default", () => {
      const result = formatter.format(emptyResult);
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });

    it("should format JSON output", () => {
      const result = formatter.format(emptyResult, OutputFormat.Json);
      expect(result).toContain('"unusedPackages"');
      expect(result).toContain('"unusedImports"');
    });

    it("should format CSV output", () => {
      const result = formatter.format(emptyResult, OutputFormat.Csv);
      expect(typeof result).toBe("string");
    });

    it("should format TSV output", () => {
      const result = formatter.format(emptyResult, OutputFormat.Tsv);
      expect(typeof result).toBe("string");
    });

    it("should format Markdown output", () => {
      const result = formatter.format(emptyResult, OutputFormat.Md);
      expect(result).toContain("#");
    });

    it("should format HTML output", () => {
      const result = formatter.format(emptyResult, OutputFormat.Html);
      expect(result).toContain("<html");
      expect(result).toContain("</html>");
    });

    it("should format grouped by file when specified", () => {
      const result = formatter.format(emptyResult, undefined, "file");
      expect(typeof result).toBe("string");
    });

    it("should handle multiple formats", () => {
      const result = formatter.format(emptyResult, [
        OutputFormat.Json,
        OutputFormat.Csv,
      ]);
      expect(typeof result).toBe("string");
    });
  });

  describe("formatForExport", () => {
    it("should format JSON", () => {
      const result = formatter.formatForExport(emptyResult, OutputFormat.Json);
      const parsed = JSON.parse(result);
      expect(parsed).toHaveProperty("unusedPackages");
      expect(parsed).toHaveProperty("unusedImports");
    });

    it("should format CSV with headers", () => {
      const testResult: ScanResult = {
        ...emptyResult,
        unusedPackages: [{ name: "test-package", version: "1.0.0" }],
      };
      const result = formatter.formatForExport(testResult, OutputFormat.Csv);
      expect(result).toContain("test-package");
      expect(result.length).toBeGreaterThan(0);
    });

    it("should format TSV with headers", () => {
      const testResult: ScanResult = {
        ...emptyResult,
        unusedImports: [
          { file: "test.ts", importPath: "./module", line: 1, column: 1 },
        ],
      };
      const result = formatter.formatForExport(testResult, OutputFormat.Tsv);
      expect(result).toContain("test.ts");
      expect(result.length).toBeGreaterThan(0);
    });

    it("should format Markdown with sections", () => {
      const testResult: ScanResult = {
        ...emptyResult,
        unusedPackages: [{ name: "test-package" }],
        unusedImports: [{ file: "test.ts", importPath: "./module" }],
      };
      const result = formatter.formatForExport(testResult, OutputFormat.Md);
      expect(result).toContain("#");
      expect(result).toContain("test-package");
    });

    it("should format HTML with table", () => {
      const testResult: ScanResult = {
        ...emptyResult,
        unusedExports: [
          { file: "test.ts", exportName: "test", line: 1, column: 1 },
        ],
      };
      const result = formatter.formatForExport(testResult, OutputFormat.Html);
      expect(result).toContain("<table");
      expect(result).toContain("test");
    });
  });

  describe("formatSummary", () => {
    it("should format summary with statistics", () => {
      const stats = {
        totalFiles: 10,
        totalPackages: 5,
        entryPoints: 2,
      };
      const result = formatter.formatSummary(emptyResult, stats);
      expect(result).toContain("Summary Statistics");
      expect(result).toContain("10");
      expect(result).toContain("5");
      expect(result).toContain("2");
    });

    it("should show unused items breakdown", () => {
      const testResult: ScanResult = {
        ...emptyResult,
        unusedPackages: [{ name: "pkg1" }, { name: "pkg2" }],
        unusedImports: [{ file: "test.ts", importPath: "./module" }],
      };
      const stats = {
        totalFiles: 1,
        totalPackages: 2,
        entryPoints: 1,
      };
      const result = formatter.formatSummary(testResult, stats);
      expect(result).toContain("Packages");
      expect(result).toContain("Imports");
    });

    it("should show total unused items count", () => {
      const testResult: ScanResult = {
        ...emptyResult,
        unusedPackages: [{ name: "pkg1" }],
        unusedFunctions: [
          { file: "test.ts", functionName: "test", line: 1, column: 1 },
        ],
      };
      const stats = {
        totalFiles: 1,
        totalPackages: 1,
        entryPoints: 1,
      };
      const result = formatter.formatSummary(testResult, stats);
      expect(result).toContain("Total unused items");
    });
  });

  describe("edge cases", () => {
    it("should handle result with all categories populated", () => {
      const fullResult: ScanResult = {
        unusedPackages: [{ name: "pkg1" }],
        unusedImports: [{ file: "test.ts", importPath: "./module" }],
        unusedExports: [{ file: "test.ts", exportName: "test" }],
        unusedFunctions: [
          { file: "test.ts", functionName: "test", line: 1, column: 1 },
        ],
        unusedVariables: [
          { file: "test.ts", variableName: "x", line: 1, column: 1 },
        ],
        unusedFiles: [{ file: "unused.ts" }],
        unusedConfigs: [{ file: "package.json", configKey: "key" }],
        unusedScripts: [{ scriptName: "test" }],
        unusedTypes: [
          {
            file: "test.ts",
            typeName: "Test",
            typeKind: "interface",
            line: 1,
            column: 1,
          },
        ],
        unusedCSSClasses: [{ file: "test.ts", className: "test-class" }],
        unusedAssets: [
          {
            file: "test.ts",
            assetPath: "./image.png",
            assetType: "image",
            line: 1,
            column: 1,
          },
        ],
      };

      const jsonResult = formatter.formatForExport(
        fullResult,
        OutputFormat.Json,
      );
      const parsed = JSON.parse(jsonResult);
      expect(parsed.unusedPackages.length).toBe(1);
      expect(parsed.unusedImports.length).toBe(1);
      expect(parsed.unusedExports.length).toBe(1);
      expect(parsed.unusedFunctions.length).toBe(1);
      expect(parsed.unusedVariables.length).toBe(1);
      expect(parsed.unusedFiles.length).toBe(1);
      expect(parsed.unusedConfigs.length).toBe(1);
      expect(parsed.unusedScripts.length).toBe(1);
      expect(parsed.unusedTypes.length).toBe(1);
      expect(parsed.unusedCSSClasses.length).toBe(1);
      expect(parsed.unusedAssets.length).toBe(1);
    });

    it("should handle empty result in all formats", () => {
      const formats = [
        OutputFormat.Json,
        OutputFormat.Csv,
        OutputFormat.Tsv,
        OutputFormat.Md,
        OutputFormat.Html,
      ];

      for (const format of formats) {
        const result = formatter.formatForExport(emptyResult, format);
        expect(typeof result).toBe("string");
        expect(result.length).toBeGreaterThan(0);
      }
    });

    it("should handle large result sets", () => {
      const largeResult: ScanResult = {
        ...emptyResult,
        unusedPackages: Array.from({ length: 100 }, (_, i) => ({
          name: `pkg${i}`,
        })),
        unusedImports: Array.from({ length: 100 }, (_, i) => ({
          file: `file${i}.ts`,
          importPath: `./module${i}`,
        })),
      };

      const result = formatter.formatForExport(largeResult, OutputFormat.Json);
      const parsed = JSON.parse(result);
      expect(parsed.unusedPackages.length).toBe(100);
      expect(parsed.unusedImports.length).toBe(100);
    });
  });
});
