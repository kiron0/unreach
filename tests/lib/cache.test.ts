import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { DependencyNode } from "../../src/types/index.js";
import { AnalysisCache } from "../../src/lib/cache.js";

describe("AnalysisCache", () => {
  let tempDir: string;
  let cache: AnalysisCache;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "unreach-test-"));
    cache = new AnalysisCache(tempDir);
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe("constructor", () => {
    it("should create cache directories", () => {
      const cacheDir = path.join(tempDir, ".unreach");
      const astCacheDir = path.join(cacheDir, "asts");
      expect(fs.existsSync(cacheDir)).toBe(true);
      expect(fs.existsSync(astCacheDir)).toBe(true);
    });
  });

  describe("getFileHash", () => {
    it("should return hash for existing file", () => {
      const testFile = path.join(tempDir, "test.txt");
      fs.writeFileSync(testFile, "test content");
      const hash = cache.getFileHash(testFile);
      expect(hash).toBeTruthy();
      expect(hash.length).toBeGreaterThan(0);
    });

    it("should return same hash for same content", () => {
      const testFile = path.join(tempDir, "test.txt");
      fs.writeFileSync(testFile, "test content");
      const hash1 = cache.getFileHash(testFile);
      const hash2 = cache.getFileHash(testFile);
      expect(hash1).toBe(hash2);
    });

    it("should return different hash for different content", () => {
      const testFile1 = path.join(tempDir, "test1.txt");
      const testFile2 = path.join(tempDir, "test2.txt");
      fs.writeFileSync(testFile1, "content 1");
      fs.writeFileSync(testFile2, "content 2");
      const hash1 = cache.getFileHash(testFile1);
      const hash2 = cache.getFileHash(testFile2);
      expect(hash1).not.toBe(hash2);
    });

    it("should return empty string for non-existent file", () => {
      const hash = cache.getFileHash(path.join(tempDir, "nonexistent.txt"));
      expect(hash).toBe("");
    });
  });

  describe("getFileMetadata", () => {
    it("should return metadata for existing file", () => {
      const testFile = path.join(tempDir, "test.txt");
      fs.writeFileSync(testFile, "test content");
      const metadata = cache.getFileMetadata(testFile);
      expect(metadata).not.toBeNull();
      expect(metadata?.path).toBe(testFile);
      expect(metadata?.hash).toBeTruthy();
      expect(metadata?.size).toBeGreaterThan(0);
      expect(metadata?.mtime).toBeGreaterThan(0);
    });

    it("should return null for non-existent file", () => {
      const metadata = cache.getFileMetadata(
        path.join(tempDir, "nonexistent.txt"),
      );
      expect(metadata).toBeNull();
    });
  });

  describe("cache operations", () => {
    it("should save and load cache", () => {
      const testFile = path.join(tempDir, "test.txt");
      fs.writeFileSync(testFile, "test content");
      const metadata = cache.getFileMetadata(testFile);
      expect(metadata).not.toBeNull();

      const cacheMap = new Map();
      if (metadata) {
        cacheMap.set(testFile, metadata);
      }
      cache.saveCache(cacheMap);

      const loaded = cache.loadCache();
      expect(loaded.size).toBe(1);
      expect(loaded.has(testFile)).toBe(true);
    });

    it("should return empty map when cache file doesn't exist", () => {
      const loaded = cache.loadCache();
      expect(loaded).toBeInstanceOf(Map);
      expect(loaded.size).toBe(0);
    });
  });

  describe("getChangedFiles", () => {
    it("should detect new files", () => {
      const testFile = path.join(tempDir, "new.txt");
      fs.writeFileSync(testFile, "content");
      const oldCache = new Map();
      const currentFiles = [testFile];

      const result = cache.getChangedFiles(currentFiles, oldCache);
      expect(result.new).toContain(testFile);
      expect(result.changed).toHaveLength(0);
      expect(result.unchanged).toHaveLength(0);
    });

    it("should detect unchanged files", () => {
      const testFile = path.join(tempDir, "test.txt");
      fs.writeFileSync(testFile, "content");
      const metadata = cache.getFileMetadata(testFile);
      expect(metadata).not.toBeNull();

      const oldCache = new Map();
      if (metadata) {
        oldCache.set(testFile, metadata);
      }

      const currentFiles = [testFile];
      const result = cache.getChangedFiles(currentFiles, oldCache);
      expect(result.unchanged).toContain(testFile);
      expect(result.new).toHaveLength(0);
      expect(result.changed).toHaveLength(0);
    });

    it("should detect changed files", () => {
      const testFile = path.join(tempDir, "test.txt");
      fs.writeFileSync(testFile, "content 1");
      const oldMetadata = cache.getFileMetadata(testFile);
      expect(oldMetadata).not.toBeNull();

      fs.writeFileSync(testFile, "content 2");
      const newMetadata = cache.getFileMetadata(testFile);
      expect(newMetadata).not.toBeNull();

      const oldCache = new Map();
      if (oldMetadata) {
        oldCache.set(testFile, oldMetadata);
      }

      const currentFiles = [testFile];
      const result = cache.getChangedFiles(currentFiles, oldCache);
      expect(result.changed).toContain(testFile);
    });

    it("should detect deleted files", () => {
      const testFile = path.join(tempDir, "test.txt");
      fs.writeFileSync(testFile, "content");
      const metadata = cache.getFileMetadata(testFile);
      expect(metadata).not.toBeNull();

      const oldCache = new Map();
      if (metadata) {
        oldCache.set(testFile, metadata);
      }

      fs.unlinkSync(testFile);

      const result = cache.getChangedFiles([], oldCache);
      expect(result.deleted).toContain(testFile);
    });
  });

  describe("AST cache operations", () => {
    it("should save and load cached AST", () => {
      const testFile = path.join(tempDir, "test.ts");
      fs.writeFileSync(testFile, "export const x = 1;");
      const hash = cache.getFileHash(testFile);

      const node: DependencyNode = {
        file: testFile,
        imports: [],
        importDetails: new Map(),
        dynamicImports: [],
        exports: new Map([["x", { name: "x", type: "named" }]]),
        reExports: new Map(),
        functions: new Map(),
        classes: new Map(),
        variables: new Map(),
        types: new Map(),
        variableReferences: new Set(),
        functionCalls: new Set(),
        jsxElements: new Set(),
        cssClasses: new Set(),
        isEntryPoint: false,
      };

      cache.saveCachedAST(testFile, node, hash);
      const loaded = cache.loadCachedAST(testFile, hash);
      expect(loaded).not.toBeNull();
      expect(loaded?.file).toBe(testFile);
    });

    it("should return null for mismatched hash", () => {
      const testFile = path.join(tempDir, "test.ts");
      fs.writeFileSync(testFile, "export const x = 1;");
      const hash1 = cache.getFileHash(testFile);

      const node: DependencyNode = {
        file: testFile,
        imports: [],
        importDetails: new Map(),
        dynamicImports: [],
        exports: new Map(),
        reExports: new Map(),
        functions: new Map(),
        classes: new Map(),
        variables: new Map(),
        types: new Map(),
        variableReferences: new Set(),
        functionCalls: new Set(),
        jsxElements: new Set(),
        cssClasses: new Set(),
        isEntryPoint: false,
      };

      cache.saveCachedAST(testFile, node, hash1);
      const loaded = cache.loadCachedAST(testFile, "different-hash");
      expect(loaded).toBeNull();
    });

    it("should return null for non-existent AST cache", () => {
      const testFile = path.join(tempDir, "test.ts");
      const hash = cache.getFileHash(testFile);
      const loaded = cache.loadCachedAST(testFile, hash);
      expect(loaded).toBeNull();
    });
  });

  describe("clearAll", () => {
    it("should clear cache and AST cache", () => {
      const testFile = path.join(tempDir, "test.txt");
      fs.writeFileSync(testFile, "content");
      const metadata = cache.getFileMetadata(testFile);
      expect(metadata).not.toBeNull();

      const cacheMap = new Map();
      if (metadata) {
        cacheMap.set(testFile, metadata);
      }
      cache.saveCache(cacheMap);

      cache.clearAll();

      const loaded = cache.loadCache();
      expect(loaded.size).toBe(0);
    });
  });

  describe("corner cases", () => {
    it("should handle empty files", () => {
      const emptyFile = path.join(tempDir, "empty.txt");
      fs.writeFileSync(emptyFile, "");
      const hash = cache.getFileHash(emptyFile);
      expect(hash).toBeTruthy();
      expect(hash.length).toBeGreaterThan(0);
    });

    it("should handle very large files", () => {
      const largeFile = path.join(tempDir, "large.txt");
      const largeContent = "x".repeat(10 * 1024 * 1024);
      fs.writeFileSync(largeFile, largeContent);
      const hash = cache.getFileHash(largeFile);
      expect(hash).toBeTruthy();
      const metadata = cache.getFileMetadata(largeFile);
      expect(metadata?.size).toBe(largeContent.length);
    });

    it("should handle files with unicode characters", () => {
      const unicodeFile = path.join(tempDir, "测试文件.txt");
      const content = "Hello 世界 🌍";
      fs.writeFileSync(unicodeFile, content, "utf-8");
      const hash = cache.getFileHash(unicodeFile);
      expect(hash).toBeTruthy();
      const metadata = cache.getFileMetadata(unicodeFile);
      expect(metadata).not.toBeNull();
    });

    it("should handle files with special characters in name", () => {
      const specialFile = path.join(
        tempDir,
        "file with spaces & special@chars#123.txt",
      );
      fs.writeFileSync(specialFile, "content");
      const hash = cache.getFileHash(specialFile);
      expect(hash).toBeTruthy();
    });

    it("should handle very long file paths", () => {
      const longPath = path.join(tempDir, "a".repeat(200), "file.txt");
      fs.mkdirSync(path.dirname(longPath), { recursive: true });
      fs.writeFileSync(longPath, "content");
      const hash = cache.getFileHash(longPath);
      expect(hash).toBeTruthy();
    });

    it("should handle files with binary content", () => {
      const binaryFile = path.join(tempDir, "binary.bin");
      const buffer = Buffer.from([0x00, 0x01, 0x02, 0xff, 0xfe, 0xfd]);
      fs.writeFileSync(binaryFile, buffer);
      const hash = cache.getFileHash(binaryFile);
      expect(hash).toBeTruthy();
    });

    it("should handle cache with many files", () => {
      const cacheMap = new Map();
      for (let i = 0; i < 1000; i++) {
        const testFile = path.join(tempDir, `file${i}.txt`);
        fs.writeFileSync(testFile, `content ${i}`);
        const metadata = cache.getFileMetadata(testFile);
        if (metadata) {
          cacheMap.set(testFile, metadata);
        }
      }
      cache.saveCache(cacheMap);
      const loaded = cache.loadCache();
      expect(loaded.size).toBe(1000);
    });

    it("should handle AST cache with empty node", () => {
      const testFile = path.join(tempDir, "empty.ts");
      fs.writeFileSync(testFile, "");
      const hash = cache.getFileHash(testFile);

      const emptyNode: DependencyNode = {
        file: testFile,
        imports: [],
        importDetails: new Map(),
        dynamicImports: [],
        exports: new Map(),
        reExports: new Map(),
        functions: new Map(),
        classes: new Map(),
        variables: new Map(),
        types: new Map(),
        variableReferences: new Set(),
        functionCalls: new Set(),
        jsxElements: new Set(),
        cssClasses: new Set(),
        isEntryPoint: false,
      };

      cache.saveCachedAST(testFile, emptyNode, hash);
      const loaded = cache.loadCachedAST(testFile, hash);
      expect(loaded).not.toBeNull();
      expect(loaded?.exports.size).toBe(0);
    });

    it("should handle AST cache with large node", () => {
      const testFile = path.join(tempDir, "large.ts");
      fs.writeFileSync(testFile, "export const x = 1;");
      const hash = cache.getFileHash(testFile);

      const largeNode: DependencyNode = {
        file: testFile,
        imports: Array.from({ length: 10 }, (_, i) => `import${i}`),
        importDetails: new Map(
          Array.from({ length: 10 }, (_, i) => [
            `import${i}`,
            {
              path: `path${i}`,
              specifiers: new Set([`spec${i}`]),
              isDefault: false,
              isNamespace: false,
              isTypeOnly: false,
              typeSpecifiers: new Set(),
            },
          ]),
        ),
        dynamicImports: [],
        exports: new Map(
          Array.from({ length: 10 }, (_, i) => [
            `export${i}`,
            { name: `export${i}`, type: "named" as const },
          ]),
        ),
        reExports: new Map(),
        functions: new Map(),
        classes: new Map(),
        variables: new Map(),
        types: new Map(),
        variableReferences: new Set(),
        functionCalls: new Set(),
        jsxElements: new Set(),
        cssClasses: new Set(),
        isEntryPoint: false,
      };

      cache.saveCachedAST(testFile, largeNode, hash);
      const loaded = cache.loadCachedAST(testFile, hash);
      expect(loaded).not.toBeNull();
      expect(Array.isArray(loaded?.imports)).toBe(true);
      expect(loaded?.imports.length).toBe(10);
      expect(loaded?.exports).toBeInstanceOf(Map);
      expect(loaded?.file).toBe(testFile);
      expect(loaded?.isEntryPoint).toBe(false);
    });

    it("should handle getChangedFiles with empty arrays", () => {
      const result = cache.getChangedFiles([], new Map());
      expect(result.new).toHaveLength(0);
      expect(result.changed).toHaveLength(0);
      expect(result.unchanged).toHaveLength(0);
      expect(result.deleted).toHaveLength(0);
    });

    it("should handle getChangedFiles with all files deleted", () => {
      const oldCache = new Map();
      for (let i = 0; i < 10; i++) {
        const file = path.join(tempDir, `file${i}.txt`);
        oldCache.set(file, {
          path: file,
          hash: "old-hash",
          mtime: Date.now(),
          size: 100,
        });
      }
      const result = cache.getChangedFiles([], oldCache);
      expect(result.deleted.length).toBe(10);
    });

    it("should handle file that changes immediately after creation", () => {
      const testFile = path.join(tempDir, "test.txt");
      fs.writeFileSync(testFile, "content 1");
      const metadata1 = cache.getFileMetadata(testFile);
      expect(metadata1).not.toBeNull();

      fs.writeFileSync(testFile, "content 2");
      const metadata2 = cache.getFileMetadata(testFile);
      expect(metadata2).not.toBeNull();
      expect(metadata1?.hash).not.toBe(metadata2?.hash);
    });

    it("should handle cache file corruption gracefully", () => {
      const cacheFile = path.join(tempDir, ".unreach", "cache.json");
      fs.writeFileSync(cacheFile, "invalid json {");
      const loaded = cache.loadCache();
      expect(loaded).toBeInstanceOf(Map);
      expect(loaded.size).toBe(0);
    });

    it("should handle AST cache file corruption gracefully", () => {
      const testFile = path.join(tempDir, "test.ts");
      fs.writeFileSync(testFile, "export const x = 1;");
      const hash = cache.getFileHash(testFile);
      const astCachePath = path.join(
        tempDir,
        ".unreach",
        "asts",
        cache.getASTCachePath(testFile).split(path.sep).pop() || "",
      );
      fs.writeFileSync(astCachePath, "invalid json");
      const loaded = cache.loadCachedAST(testFile, hash);
      expect(loaded).toBeNull();
    });

    it("should handle concurrent cache operations", () => {
      const testFile = path.join(tempDir, "test.txt");
      fs.writeFileSync(testFile, "content");
      const metadata = cache.getFileMetadata(testFile);
      expect(metadata).not.toBeNull();

      const cacheMap1 = new Map();
      const cacheMap2 = new Map();
      if (metadata) {
        cacheMap1.set(testFile, metadata);
        cacheMap2.set(testFile, metadata);
      }

      cache.saveCache(cacheMap1);
      cache.saveCache(cacheMap2);

      const loaded = cache.loadCache();
      expect(loaded.size).toBe(1);
    });
  });
});
