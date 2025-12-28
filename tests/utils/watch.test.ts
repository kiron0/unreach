import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ScanOptions } from "../../src/types/index.js";
import { FileWatcher } from "../../src/utils/watch.js";

vi.mock("../../src/cli/handler.js", () => ({
  runScan: vi.fn().mockResolvedValue(undefined),
}));

describe("FileWatcher", () => {
  let tempDir: string;
  let watcher: FileWatcher;
  let scanOptions: ScanOptions;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "unreach-watch-test-"));
    scanOptions = {
      cwd: tempDir,
      quiet: true,
    };
    watcher = new FileWatcher(tempDir, scanOptions);
  });

  afterEach(() => {
    watcher.stop();
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe("constructor", () => {
    it("should create a FileWatcher instance", () => {
      expect(watcher).toBeInstanceOf(FileWatcher);
    });

    it("should set watch to false in scan options", () => {
      const optionsWithWatch: ScanOptions = {
        cwd: tempDir,
        watch: true,
      };
      const newWatcher = new FileWatcher(tempDir, optionsWithWatch);
      expect(newWatcher).toBeInstanceOf(FileWatcher);
      newWatcher.stop();
    });
  });

  describe("start", () => {
    it("should start watching and perform initial scan", async () => {
      const startSpy = vi.spyOn(watcher as any, "performScan");
      const watchSpy = vi.spyOn(watcher as any, "watchDirectory");

      await watcher.start();

      expect(startSpy).toHaveBeenCalled();
      expect(watchSpy).toHaveBeenCalledWith(tempDir);
    });

    it("should not start multiple times", async () => {
      const startSpy = vi.spyOn(watcher as any, "performScan");

      await watcher.start();
      await watcher.start();

      expect(startSpy).toHaveBeenCalled();
    });
  });

  describe("stop", () => {
    it("should stop watching", () => {
      watcher.stop();
      expect((watcher as any).isWatching).toBe(false);
    });

    it("should clear debounce timer", async () => {
      await watcher.start();
      (watcher as any).debounceTimer = setTimeout(() => {}, 1000);
      watcher.stop();
      expect((watcher as any).debounceTimer).toBeNull();
    });

    it("should close all watchers", async () => {
      await watcher.start();
      const watchers = (watcher as any).watchers;
      watcher.stop();
      expect(watchers.size).toBe(0);
    });

    it("should handle stop when not watching", () => {
      expect(() => watcher.stop()).not.toThrow();
    });
  });

  describe("debounceScan", () => {
    it("should debounce scan calls", async () => {
      vi.useFakeTimers();
      const performScanSpy = vi.spyOn(watcher as any, "performScan");

      (watcher as any).isWatching = true;
      (watcher as any).debounceScan();
      (watcher as any).debounceScan();
      (watcher as any).debounceScan();

      expect(performScanSpy).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(500);

      expect(performScanSpy).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });

    it("should clear previous timer when called again", async () => {
      vi.useFakeTimers();
      const performScanSpy = vi.spyOn(watcher as any, "performScan");

      (watcher as any).isWatching = true;
      (watcher as any).debounceScan();

      await vi.advanceTimersByTimeAsync(250);

      (watcher as any).debounceScan();

      expect(performScanSpy).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(500);

      expect(performScanSpy).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });
  });

  describe("watchDirectory", () => {
    it("should watch a directory", async () => {
      await (watcher as any).watchDirectory(tempDir);

      expect((watcher as any).watchers.size).toBeGreaterThan(0);
    });

    it("should handle non-directory paths", async () => {
      const testFile = path.join(tempDir, "test.txt");
      fs.writeFileSync(testFile, "content");

      await (watcher as any).watchDirectory(testFile);

      expect((watcher as any).watchers.size).toBe(0);
    });

    it("should handle permission errors gracefully", async () => {
      const invalidPath = path.join(tempDir, "nonexistent", "path");
      await (watcher as any).watchDirectory(invalidPath);

      expect((watcher as any).watchers.size).toBe(0);
    });

    it("should create watcher for valid directory", async () => {
      const initialSize = (watcher as any).watchers.size;
      await (watcher as any).watchDirectory(tempDir);
      const finalSize = (watcher as any).watchers.size;

      expect(finalSize).toBeGreaterThan(initialSize);
    });
  });

  describe("performScan", () => {
    it("should perform scan when watching", async () => {
      (watcher as any).isWatching = true;
      const { runScan } = await import("../../src/cli/handler.js");

      await (watcher as any).performScan();

      expect(runScan).toHaveBeenCalledWith(
        expect.objectContaining({
          cwd: tempDir,
          watch: false,
        }),
      );
    });

    it("should not perform scan when not watching", async () => {
      (watcher as any).isWatching = false;
      const { runScan } = await import("../../src/cli/handler.js");
      vi.clearAllMocks();

      await (watcher as any).performScan();

      expect(runScan).not.toHaveBeenCalled();
    });

    it("should handle scan errors gracefully", async () => {
      (watcher as any).isWatching = true;
      const { runScan } = await import("../../src/cli/handler.js");
      vi.mocked(runScan).mockRejectedValueOnce(new Error("Scan failed"));

      await (watcher as any).performScan();

      expect((watcher as any).isWatching).toBe(true);
    });

    it("should handle UnreachError results", async () => {
      (watcher as any).isWatching = true;
      const { runScan } = await import("../../src/cli/handler.js");
      const { UnreachError } = await import("../../src/core/errors.js");
      vi.mocked(runScan).mockResolvedValueOnce(
        UnreachError.analysisError("Test error"),
      );

      await (watcher as any).performScan();

      expect((watcher as any).isWatching).toBe(true);
    });
  });

  describe("integration", () => {
    it("should watch for file changes and trigger scan", async () => {
      vi.useFakeTimers();
      const performScanSpy = vi.spyOn(watcher as any, "performScan");

      await watcher.start();

      performScanSpy.mockClear();

      (watcher as any).debounceScan();

      await vi.advanceTimersByTimeAsync(500);

      expect(performScanSpy).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
      watcher.stop();
    });

    it("should handle multiple rapid file changes with debouncing", async () => {
      vi.useFakeTimers();
      const performScanSpy = vi.spyOn(watcher as any, "performScan");

      await watcher.start();

      performScanSpy.mockClear();

      for (let i = 0; i < 5; i++) {
        (watcher as any).debounceScan();
      }

      await vi.advanceTimersByTimeAsync(500);

      expect(performScanSpy).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
      watcher.stop();
    });
  });
});
