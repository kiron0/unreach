import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { ProgressBar } from "../../src/utils/progress.js";

describe("ProgressBar", () => {
  let originalIsTTY: boolean;

  beforeEach(() => {
    originalIsTTY = process.stderr.isTTY;
  });

  afterEach(() => {
    Object.defineProperty(process.stderr, "isTTY", {
      value: originalIsTTY,
      writable: true,
    });
  });

  describe("constructor", () => {
    it("should create progress bar with total", () => {
      const bar = new ProgressBar(100);
      expect(bar).toBeInstanceOf(ProgressBar);
    });
  });

  describe("update", () => {
    it("should update progress", () => {
      const bar = new ProgressBar(100);
      const writeSpy = vi.spyOn(process.stderr, "write");

      bar.update(50);

      expect(writeSpy).toHaveBeenCalled();
      writeSpy.mockRestore();
    });

    it("should handle errors", () => {
      const bar = new ProgressBar(100);
      const writeSpy = vi.spyOn(process.stderr, "write");

      bar.update(50, 5);

      expect(writeSpy).toHaveBeenCalled();
      writeSpy.mockRestore();
    });
  });

  describe("increment", () => {
    it("should increment progress", () => {
      const bar = new ProgressBar(100);
      const writeSpy = vi.spyOn(process.stderr, "write");

      bar.increment();

      expect(writeSpy).toHaveBeenCalled();
      writeSpy.mockRestore();
    });

    it("should handle errors in increment", () => {
      const bar = new ProgressBar(100);
      const writeSpy = vi.spyOn(process.stderr, "write");

      bar.increment(2);

      expect(writeSpy).toHaveBeenCalled();
      writeSpy.mockRestore();
    });
  });

  describe("setCurrentFile", () => {
    it("should set current file", () => {
      const bar = new ProgressBar(100);
      bar.setCurrentFile("test.ts");

      const writeSpy = vi.spyOn(process.stderr, "write");
      bar.update(50);

      expect(writeSpy).toHaveBeenCalled();
      writeSpy.mockRestore();
    });
  });

  describe("finish", () => {
    it("should finish progress bar", () => {
      const bar = new ProgressBar(100);
      const writeSpy = vi.spyOn(process.stderr, "write");

      bar.finish();

      expect(writeSpy).toHaveBeenCalled();
      writeSpy.mockRestore();
    });

    it("should handle errors in finish", () => {
      const bar = new ProgressBar(100);
      bar.update(100, 5);
      const writeSpy = vi.spyOn(process.stderr, "write");

      bar.finish();

      expect(writeSpy).toHaveBeenCalled();
      writeSpy.mockRestore();
    });
  });

  describe("edge cases", () => {
    it("should handle zero total", () => {
      const bar = new ProgressBar(0);
      const writeSpy = vi.spyOn(process.stderr, "write");

      bar.update(0);

      expect(writeSpy).toHaveBeenCalled();
      writeSpy.mockRestore();
    });

    it("should handle non-TTY environment", () => {
      Object.defineProperty(process.stderr, "isTTY", {
        value: false,
        writable: true,
      });

      const bar = new ProgressBar(100);
      const writeSpy = vi.spyOn(process.stderr, "write");

      bar.update(50);

      expect(writeSpy).toHaveBeenCalled();
      writeSpy.mockRestore();
    });

    it("should handle very large totals", () => {
      const bar = new ProgressBar(1000000);
      const writeSpy = vi.spyOn(process.stderr, "write");

      bar.update(500000);

      expect(writeSpy).toHaveBeenCalled();
      writeSpy.mockRestore();
    });
  });
});
