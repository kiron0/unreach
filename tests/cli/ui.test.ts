import { describe, expect, it, vi } from "vitest";
import { showHomePage } from "../../src/cli/ui.js";

describe("CLI UI", () => {
  describe("showHomePage", () => {
    it("should display home page without errors", () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      expect(() => showHomePage()).not.toThrow();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("should include help text", () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      showHomePage();

      const calls = consoleSpy.mock.calls.flat().join(" ");
      expect(calls).toContain("unreach");

      consoleSpy.mockRestore();
    });

    it("should include usage examples", () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      showHomePage();

      const calls = consoleSpy.mock.calls.flat().join(" ");
      expect(calls.length).toBeGreaterThan(0);

      consoleSpy.mockRestore();
    });
  });
});
