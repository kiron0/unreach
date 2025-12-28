import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import type { DependencyNode } from "../types/index.js";

export interface FileMetadata {
  path: string;
  hash: string;
  mtime: number;
  size: number;
}

export interface CachedAST {
  node: DependencyNode;
  hash: string;
  timestamp: number;
}

export class AnalysisCache {
  private cacheDir: string;
  private cacheFile: string;
  private astCacheDir: string;
  private maxCacheSize: number = 100 * 1024 * 1024;

  constructor(cwd: string) {
    this.cacheDir = path.join(cwd, ".unreach");
    this.cacheFile = path.join(this.cacheDir, "cache.json");
    this.astCacheDir = path.join(this.cacheDir, "asts");
    this.ensureCacheDir();
    this.ensureGitignore(cwd);
  }

  private ensureCacheDir(): void {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
    if (!fs.existsSync(this.astCacheDir)) {
      fs.mkdirSync(this.astCacheDir, { recursive: true });
    }
  }

  private ensureGitignore(cwd: string): void {
    const gitDir = path.join(cwd, ".git");
    const gitignorePath = path.join(cwd, ".gitignore");

    if (!fs.existsSync(gitDir)) {
      return;
    }

    if (!fs.existsSync(gitignorePath)) {
      try {
        fs.writeFileSync(gitignorePath, ".unreach\n", "utf-8");
      } catch {}
      return;
    }

    try {
      const content = fs.readFileSync(gitignorePath, "utf-8");
      const lines = content.split(/\r?\n/);

      const hasUnreach = lines.some((line) => {
        const trimmed = line.trim();
        return (
          trimmed === ".unreach" ||
          trimmed === "/.unreach" ||
          (trimmed.startsWith("#") === false && trimmed === ".unreach")
        );
      });

      if (!hasUnreach) {
        const trimmed = content.trimEnd();
        const needsNewline = trimmed.length > 0 && !trimmed.endsWith("\n");
        const newContent =
          trimmed + (needsNewline ? "\n\n" : "") + ".unreach\n\n";
        fs.writeFileSync(gitignorePath, newContent, "utf-8");
      }
    } catch {}
  }

  getFileHash(filePath: string): string {
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      return crypto.createHash("sha256").update(content).digest("hex");
    } catch {
      return "";
    }
  }

  getFileMetadata(filePath: string): FileMetadata | null {
    try {
      const stats = fs.statSync(filePath);
      return {
        path: filePath,
        hash: this.getFileHash(filePath),
        mtime: stats.mtimeMs,
        size: stats.size,
      };
    } catch {
      return null;
    }
  }

  loadCache(): Map<string, FileMetadata> {
    if (!fs.existsSync(this.cacheFile)) {
      return new Map();
    }

    try {
      const data = JSON.parse(fs.readFileSync(this.cacheFile, "utf-8"));
      const cache = new Map<string, FileMetadata>();
      for (const [key, value] of data) {
        cache.set(key, value as FileMetadata);
      }
      return cache;
    } catch {
      return new Map();
    }
  }

  saveCache(cache: Map<string, FileMetadata>): void {
    try {
      const data = Array.from(cache.entries());
      fs.writeFileSync(this.cacheFile, JSON.stringify(data, null, 2));
    } catch (error) {}
  }

  getChangedFiles(
    currentFiles: string[],
    oldCache: Map<string, FileMetadata>,
  ): {
    changed: string[];
    new: string[];
    unchanged: string[];
    deleted: string[];
  } {
    const changed: string[] = [];
    const newFiles: string[] = [];
    const unchanged: string[] = [];
    const deleted: string[] = [];

    const currentFileSet = new Set(currentFiles);
    const oldFileSet = new Set(oldCache.keys());

    for (const oldFile of oldFileSet) {
      if (!currentFileSet.has(oldFile)) {
        deleted.push(oldFile);
      }
    }

    for (const file of currentFiles) {
      const currentMeta = this.getFileMetadata(file);
      if (!currentMeta) continue;

      const oldMeta = oldCache.get(file);

      if (!oldMeta) {
        newFiles.push(file);
      } else if (
        oldMeta.hash !== currentMeta.hash ||
        oldMeta.mtime !== currentMeta.mtime
      ) {
        changed.push(file);
      } else {
        unchanged.push(file);
      }
    }

    return { changed, new: newFiles, unchanged, deleted };
  }

  getASTCachePath(filePath: string): string {
    const hash = crypto
      .createHash("md5")
      .update(filePath)
      .digest("hex")
      .substring(0, 16);
    return path.join(this.astCacheDir, `${hash}.json`);
  }

  loadCachedAST(filePath: string, currentHash: string): DependencyNode | null {
    try {
      const cachePath = this.getASTCachePath(filePath);
      if (!fs.existsSync(cachePath)) {
        return null;
      }

      const cached: CachedAST = JSON.parse(fs.readFileSync(cachePath, "utf-8"));

      if (cached.hash !== currentHash) {
        return null;
      }

      const maxAge = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - cached.timestamp > maxAge) {
        return null;
      }

      return this.normalizeCachedNode(cached.node);
    } catch {
      return null;
    }
  }

  private normalizeCachedNode(node: any): DependencyNode {
    const ensureSet = (value: any): Set<string> => {
      if (value instanceof Set) return value;
      if (Array.isArray(value)) return new Set(value);
      return new Set<string>();
    };

    const ensureMap = (value: any): Map<string, any> => {
      if (value instanceof Map) return value;
      if (value && typeof value === "object")
        return new Map(Object.entries(value));
      return new Map();
    };

    const variableReferences = ensureSet(node.variableReferences);
    const functionCalls = ensureSet(node.functionCalls);
    const jsxElements = ensureSet(node.jsxElements);
    const cssClasses = ensureSet(node.cssClasses);

    const importDetails = node.importDetails
      ? new Map(
          Object.entries(node.importDetails).map(
            ([key, value]: [string, any]) => [
              key,
              {
                ...value,
                specifiers: ensureSet(value?.specifiers),
                typeSpecifiers: ensureSet(value?.typeSpecifiers),
              },
            ],
          ),
        )
      : new Map();

    const exports = ensureMap(node.exports);
    const reExports = ensureMap(node.reExports);
    const functions = ensureMap(node.functions);
    const classes = ensureMap(node.classes);
    const variables = ensureMap(node.variables);
    const types = ensureMap(node.types);

    return {
      file: node.file || "",
      imports: Array.isArray(node.imports) ? node.imports : [],
      importDetails,
      dynamicImports: Array.isArray(node.dynamicImports)
        ? node.dynamicImports
        : [],
      exports,
      reExports,
      functions,
      classes,
      variables,
      types,
      variableReferences,
      functionCalls,
      jsxElements,
      cssClasses,
      isEntryPoint: node.isEntryPoint || false,
    };
  }

  saveCachedAST(filePath: string, node: DependencyNode, hash: string): void {
    try {
      const cacheSize = this.getCacheSize();
      if (cacheSize > this.maxCacheSize) {
        this.cleanOldASTCache();
      }

      const cachePath = this.getASTCachePath(filePath);
      const cached: CachedAST = {
        node,
        hash,
        timestamp: Date.now(),
      };

      fs.writeFileSync(cachePath, JSON.stringify(cached), "utf-8");
    } catch {}
  }

  private getCacheSize(): number {
    try {
      let totalSize = 0;
      const files = fs.readdirSync(this.astCacheDir);
      for (const file of files) {
        const filePath = path.join(this.astCacheDir, file);
        const stats = fs.statSync(filePath);
        totalSize += stats.size;
      }
      return totalSize;
    } catch {
      return 0;
    }
  }

  private cleanOldASTCache(): void {
    try {
      const files = fs.readdirSync(this.astCacheDir);
      const fileStats: Array<{ path: string; mtime: number }> = [];

      for (const file of files) {
        const filePath = path.join(this.astCacheDir, file);
        const stats = fs.statSync(filePath);
        fileStats.push({ path: filePath, mtime: stats.mtimeMs });
      }

      fileStats.sort((a, b) => a.mtime - b.mtime);

      const toRemove = Math.floor(fileStats.length * 0.25);
      for (let i = 0; i < toRemove; i++) {
        try {
          fs.unlinkSync(fileStats[i].path);
        } catch {}
      }
    } catch {}
  }

  clearASTCache(): void {
    try {
      const files = fs.readdirSync(this.astCacheDir);
      for (const file of files) {
        const filePath = path.join(this.astCacheDir, file);
        try {
          fs.unlinkSync(filePath);
        } catch {}
      }
    } catch {}
  }

  clearAll(): void {
    try {
      if (fs.existsSync(this.cacheFile)) {
        fs.unlinkSync(this.cacheFile);
      }
      this.clearASTCache();
    } catch {}
  }
}
