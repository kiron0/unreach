import { describe, expect, it } from "vitest";
import { UnreachError, isError } from "../../src/core/errors.js";

describe("UnreachError", () => {
  describe("constructor", () => {
    it("should create an error with message", () => {
      const error = new UnreachError("Test error");
      expect(error.message).toBe("Test error");
      expect(error.name).toBe("UnreachError");
      expect(error).toBeInstanceOf(Error);
    });

    it("should create an error with cause", () => {
      const cause = new Error("Original error");
      const error = new UnreachError("Test error", cause);
      expect(error.cause).toBe(cause);
    });

    it("should create an error with suggestion", () => {
      const error = new UnreachError("Test error", undefined, "Fix it");
      expect(error.suggestion).toBe("Fix it");
    });
  });

  describe("static methods", () => {
    it("should create IO error", () => {
      const error = UnreachError.io("File not found");
      expect(error.message).toContain("IO error");
      expect(error.suggestion).toBeDefined();
    });

    it("should create directory not found error", () => {
      const error = UnreachError.directoryNotFound("/invalid/path");
      expect(error.message).toContain("Directory not found");
      expect(error.suggestion).toContain("/invalid/path");
    });

    it("should create not a directory error", () => {
      const error = UnreachError.notADirectory("/file.txt");
      expect(error.message).toContain("Not a directory");
      expect(error.suggestion).toBeDefined();
    });

    it("should create parse error", () => {
      const cause = new Error("Syntax error");
      const error = UnreachError.parseError("file.ts", cause);
      expect(error.message).toContain("Parse error");
      expect(error.cause).toBe(cause);
      expect(error.suggestion).toBeDefined();
    });

    it("should create parse error with context", () => {
      const error = UnreachError.parseErrorWithContext("file.ts", undefined, {
        line: 10,
        column: 5,
      });
      expect(error.message).toContain("Parse error");
      expect(error.suggestion).toContain("line 10");
      expect(error.suggestion).toContain("column 5");
    });

    it("should create entry point not found error", () => {
      const error = UnreachError.entryPointNotFound("src/main.ts");
      expect(error.message).toContain("Entry point not found");
      expect(error.suggestion).toContain("src/main.ts");
    });

    it("should create analysis error", () => {
      const cause = new Error("Analysis failed");
      const error = UnreachError.analysisError("Something went wrong", cause);
      expect(error.message).toContain("Analysis error");
      expect(error.cause).toBe(cause);
      expect(error.suggestion).toBeDefined();
    });
  });

  describe("corner cases", () => {
    it("should handle empty string paths", () => {
      const error = UnreachError.directoryNotFound("");
      expect(error.message).toContain("Directory not found");
      expect(error.suggestion).toBeDefined();
    });

    it("should handle very long paths", () => {
      const longPath = "/" + "a".repeat(1000) + "/path";
      const error = UnreachError.directoryNotFound(longPath);
      expect(error.message).toContain("Directory not found");
      expect(error.suggestion).toContain(longPath);
    });

    it("should handle paths with special characters", () => {
      const specialPath = "/path/with spaces/and-special@chars#123";
      const error = UnreachError.directoryNotFound(specialPath);
      expect(error.message).toContain("Directory not found");
    });

    it("should handle unicode characters in paths", () => {
      const unicodePath = "/path/with/中文/日本語/한국어";
      const error = UnreachError.directoryNotFound(unicodePath);
      expect(error.message).toContain("Directory not found");
    });

    it("should handle relative paths with ..", () => {
      const relativePath = "../../../invalid/path";
      const error = UnreachError.directoryNotFound(relativePath);
      expect(error.message).toContain("Directory not found");
    });

    it("should handle parse error with null cause", () => {
      const error = UnreachError.parseError("file.ts", undefined);
      expect(error.message).toContain("Parse error");
      expect(error.cause).toBeUndefined();
    });

    it("should handle parse error with context but no line", () => {
      const error = UnreachError.parseErrorWithContext("file.ts", undefined, {
        column: 5,
      });
      expect(error.message).toContain("Parse error");
      expect(error.suggestion).not.toContain("line");
    });

    it("should handle parse error with context but no column", () => {
      const error = UnreachError.parseErrorWithContext("file.ts", undefined, {
        line: 10,
      });
      expect(error.message).toContain("Parse error");
      expect(error.suggestion).toContain("line 10");
      expect(error.suggestion).not.toContain("column");
    });

    it("should handle entry point with query string", () => {
      const error = UnreachError.entryPointNotFound("src/main.ts?query=123");
      expect(error.message).toContain("Entry point not found");
    });

    it("should handle entry point with hash", () => {
      const error = UnreachError.entryPointNotFound("src/main.ts#fragment");
      expect(error.message).toContain("Entry point not found");
    });

    it("should handle error with empty message", () => {
      const error = new UnreachError("");
      expect(error.message).toBe("");
      expect(error.name).toBe("UnreachError");
    });

    it("should handle error with very long message", () => {
      const longMessage = "a".repeat(10000);
      const error = new UnreachError(longMessage);
      expect(error.message).toBe(longMessage);
    });

    it("should handle error with circular reference in cause", () => {
      const cause: any = new Error("Circular");
      cause.self = cause;
      const error = UnreachError.parseError("file.ts", cause);
      expect(error.cause).toBe(cause);
    });
  });
});

describe("isError", () => {
  it("should return true for UnreachError", () => {
    const error = new UnreachError("Test");
    expect(isError(error)).toBe(true);
  });

  it("should return false for regular Error", () => {
    const error = new Error("Test");
    expect(isError(error)).toBe(false);
  });

  it("should return false for non-error values", () => {
    expect(isError("string")).toBe(false);
    expect(isError(123)).toBe(false);
    expect(isError(null)).toBe(false);
    expect(isError(undefined)).toBe(false);
    expect(isError({})).toBe(false);
  });
});
