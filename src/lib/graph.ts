import chalk from "chalk";
import fg from "fast-glob";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import type { DependencyNode } from "../types/index.js";
import { ProgressBar } from "../utils/progress.js";
import { AnalysisCache } from "./cache.js";
import type { UnreachConfig } from "./config.js";
import { ConfigLoader } from "./config.js";
import { CSSParser } from "./css-parser.js";
import { ASTParser } from "./parser.js";

export class DependencyGraph {
  private nodes = new Map<string, DependencyNode>();
  private cssFiles = new Map<string, Set<string>>();
  private parser: ASTParser;
  private cwd: string;
  private detectedBuildDirs = new Set<string>();
  private cache: AnalysisCache;
  private importResolutionCache = new Map<string, string | null>();
  private config: UnreachConfig | null = null;
  private configLoader: ConfigLoader;
  private verboseMode: boolean = false;

  constructor(cwd: string = process.cwd(), config?: UnreachConfig) {
    this.cwd = cwd;
    this.cache = new AnalysisCache(cwd);
    const maxFileSize = config?.maxFileSize || 10 * 1024 * 1024;
    this.parser = new ASTParser(this.cache, maxFileSize);
    this.config = config || null;
    this.configLoader = new ConfigLoader(cwd);
    this.detectProjectStructure();
  }

  private detectProjectStructure(): void {
    try {
      const dirs = fs
        .readdirSync(this.cwd, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name);

      const commonBuildDirs = [
        "dist",
        "build",
        "out",
        "output",
        ".next",
        ".nuxt",
        ".output",
        "bundle",
        "compiled",
        "coverage",
        "reports",
      ];

      for (const dir of dirs) {
        if (commonBuildDirs.includes(dir)) {
          this.detectedBuildDirs.add(dir);
        }
      }
    } catch {}
  }

  private getIgnorePatterns(): string[] {
    const patterns = [
      "**/node_modules/**",
      "**/.git/**",
      "**/.svn/**",
      "**/.hg/**",
    ];

    const buildDirs =
      this.detectedBuildDirs.size > 0
        ? Array.from(this.detectedBuildDirs)
        : [
            "dist",
            "build",
            "out",
            "output",
            ".next",
            ".nuxt",
            ".output",
            "bundle",
            "compiled",
            "coverage",
            "reports",
          ];

    for (const buildDir of buildDirs) {
      patterns.push(`**/${buildDir}/**`);
    }

    if (this.config?.excludePatterns) {
      patterns.push(...this.config.excludePatterns);
    }

    if (this.config?.testFileDetection?.enabled !== false) {
      const testPatterns = this.config?.testFileDetection?.patterns ?? [
        "**/*.test.{ts,tsx,js,jsx}",
        "**/*.spec.{ts,tsx,js,jsx}",
        "**/__tests__/**",
        "**/test/**",
        "**/tests/**",
      ];
      patterns.push(...testPatterns);
    }

    return patterns;
  }
  async build(
    entryPoints: string[],
    showProgress: boolean = true,
    incremental: boolean = true,
    verbose: boolean = false,
  ): Promise<void> {
    this.verboseMode = verbose;
    let sourceFiles = await fg(["**/*.{ts,tsx,js,jsx}"], {
      cwd: this.cwd,
      absolute: true,
      dot: true,
      ignore: this.getIgnorePatterns(),
      followSymbolicLinks: false,
    });

    if (this.config?.excludePatterns) {
      sourceFiles = sourceFiles.filter(
        (file) =>
          !this.configLoader.shouldExcludeFile(
            file,
            this.config!.excludePatterns!,
          ),
      );
    }

    let filesToProcess: string[] = sourceFiles;
    if (incremental) {
      const oldCache = this.cache.loadCache();
      const {
        changed,
        new: newFiles,
        unchanged,
        deleted,
      } = this.cache.getChangedFiles(sourceFiles, oldCache);

      for (const file of unchanged) {
        const normalizedPath = path.normalize(file);
        const cachedNode = this.cache.loadCachedAST(
          file,
          this.cache.getFileHash(file),
        );
        if (cachedNode) {
          this.nodes.set(normalizedPath, cachedNode);
        } else {
          filesToProcess.push(file);
        }
      }

      for (const file of deleted) {
        const normalizedPath = path.normalize(file);
        this.nodes.delete(normalizedPath);
      }

      filesToProcess = [...changed, ...newFiles];
    }

    const progressBar = showProgress
      ? new ProgressBar(filesToProcess.length)
      : null;

    let processed = 0;
    let errors = 0;
    const parseErrors: Array<{ file: string; error: Error }> = [];

    const concurrency = Math.min(os.cpus().length, 8);
    const batches = this.chunkArray(filesToProcess, concurrency);

    for (const batch of batches) {
      const results = await Promise.allSettled(
        batch.map((file) =>
          this.parseFileWithErrorHandling(file, this.verboseMode),
        ),
      );

      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const file = batch[i];
        processed++;

        if (progressBar) {
          const relativeFile = path.relative(this.cwd, file);
          progressBar.setCurrentFile(relativeFile);
          progressBar.update(processed, errors);
        }

        if (result.status === "fulfilled" && result.value) {
          const normalizedPath = path.normalize(result.value.file);
          this.nodes.set(normalizedPath, result.value);
        } else {
          errors++;
          if (result.status === "rejected") {
            parseErrors.push({
              file,
              error:
                result.reason instanceof Error
                  ? result.reason
                  : new Error(String(result.reason)),
            });
          }
        }
      }
    }

    if (parseErrors.length > 0) {
      console.warn(
        chalk.yellow(
          `\n⚠️  Warning: Failed to parse ${parseErrors.length} file(s). Continuing with remaining files...\n`,
        ),
      );
      if (this.verboseMode) {
        for (const { file, error } of parseErrors) {
          console.warn(
            chalk.gray(
              `   • ${path.relative(this.cwd, file)}: ${error.message}`,
            ),
          );
        }
      } else {
        console.warn(
          chalk.gray(
            `   Run with --verbose to see detailed error messages for each file.\n`,
          ),
        );
      }
    }

    if (progressBar) {
      progressBar.finish();
    }

    const cssFiles = await fg(["**/*.{css,scss,sass,less,styl}"], {
      cwd: this.cwd,
      absolute: true,
      dot: true,
      ignore: this.getIgnorePatterns(),
      followSymbolicLinks: false,
    });

    for (const cssFile of cssFiles) {
      const classes = CSSParser.parseCSSFile(cssFile);
      this.cssFiles.set(cssFile, classes);
    }

    if (incremental) {
      const newCache = new Map<string, import("./cache.js").FileMetadata>();
      for (const file of sourceFiles) {
        const meta = this.cache.getFileMetadata(file);
        if (meta) {
          newCache.set(file, meta);
        }
      }
      this.cache.saveCache(newCache);
    }
    for (const entry of entryPoints) {
      let normalizedEntry = path.normalize(entry);
      if (!path.isAbsolute(normalizedEntry)) {
        normalizedEntry = path.resolve(this.cwd, normalizedEntry);
      }
      normalizedEntry = path.normalize(normalizedEntry);
      let node = this.nodes.get(normalizedEntry);
      if (!node) {
        const parsedNode = this.parser.parseFile(
          normalizedEntry,
          true,
          this.verboseMode,
        );
        if (parsedNode) {
          this.nodes.set(normalizedEntry, parsedNode);
          node = parsedNode;
        }
      }
      if (node) {
        node.isEntryPoint = true;
      }
    }
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private async parseFileWithErrorHandling(
    file: string,
    verbose: boolean = false,
  ): Promise<DependencyNode | null> {
    try {
      return this.parser.parseFile(file, true, verbose);
    } catch (error) {
      if (verbose && error instanceof Error) {
        const chalk = require("chalk");
        console.warn(
          chalk.yellow(
            `   ⚠️  Parse error in ${path.relative(this.cwd, file)}: ${error.message}`,
          ),
        );
      }
      return null;
    }
  }

  getNodes(): Map<string, DependencyNode> {
    return this.nodes;
  }
  getNode(filePath: string): DependencyNode | undefined {
    const normalizedPath = path.normalize(filePath);
    return this.nodes.get(normalizedPath);
  }
  resolveImport(importPath: string, fromFile: string): string | null {
    const cacheKey = `${fromFile}::${importPath}`;
    if (this.importResolutionCache.has(cacheKey)) {
      return this.importResolutionCache.get(cacheKey)!;
    }

    let result: string | null = null;

    if (importPath.startsWith(".")) {
      let importWithoutExt = importPath;
      if (importPath.endsWith(".js") || importPath.endsWith(".jsx")) {
        importWithoutExt = importPath.slice(0, -3);
      }
      const resolved = path.resolve(path.dirname(fromFile), importWithoutExt);
      const normalizedResolved = path.normalize(resolved);
      const extensions = [".ts", ".tsx", ".js", ".jsx", ""];
      for (const ext of extensions) {
        const withExt = normalizedResolved + ext;
        const normalizedWithExt = path.normalize(withExt);
        if (this.nodes.has(normalizedWithExt)) {
          result = normalizedWithExt;
          break;
        }
        const indexPath = path.join(normalizedResolved, "index" + ext);
        const normalizedIndexPath = path.normalize(indexPath);
        if (this.nodes.has(normalizedIndexPath)) {
          result = normalizedIndexPath;
          break;
        }
      }
      if (!result && importPath !== importWithoutExt) {
        const originalResolved = path.resolve(
          path.dirname(fromFile),
          importPath,
        );
        const normalizedOriginal = path.normalize(originalResolved);
        if (this.nodes.has(normalizedOriginal)) {
          result = normalizedOriginal;
        }
      }
    }

    this.importResolutionCache.set(cacheKey, result);
    return result;
  }

  clearResolutionCache(): void {
    this.importResolutionCache.clear();
  }
  getAllFiles(): string[] {
    return Array.from(this.nodes.keys());
  }

  getCSSFiles(): Map<string, Set<string>> {
    return this.cssFiles;
  }

  getCache(): AnalysisCache {
    return this.cache;
  }

  clearMemory(): void {
    this.parser.clearFileCache();
    this.clearResolutionCache();
  }
}
