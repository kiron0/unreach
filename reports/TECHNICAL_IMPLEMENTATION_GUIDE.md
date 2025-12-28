# Technical Implementation Guide

## 1. Parallel File Processing Implementation

### Current Code Location

`src/lib/graph.ts` - `build()` method (lines 79-133)

### Implementation

```typescript
// Add to graph.ts
import { Worker } from 'worker_threads';
import * as os from 'os';

async build(entryPoints: string[], showProgress: boolean = true): Promise<void> {
  const sourceFiles = await fg(["**/*.{ts,tsx,js,jsx}"], {
    cwd: this.cwd,
    absolute: true,
    dot: true,
    ignore: this.getIgnorePatterns(),
    followSymbolicLinks: false,
  });

  const progressBar = showProgress && process.stderr.isTTY
    ? new ProgressBar(sourceFiles.length)
    : null;

  // Parallel processing with configurable concurrency
  const concurrency = Math.min(os.cpus().length, 8); // Cap at 8 workers
  const batches = this.chunkArray(sourceFiles, concurrency);

  let processed = 0;
  let errors = 0;

  for (const batch of batches) {
    const results = await Promise.allSettled(
      batch.map(file => this.parseFileWithErrorHandling(file))
    );

    for (const result of results) {
      processed++;
      if (result.status === 'fulfilled' && result.value) {
        const normalizedPath = path.normalize(result.value.file);
        this.nodes.set(normalizedPath, result.value);
      } else {
        errors++;
      }

      if (progressBar) {
        progressBar.update(processed, errors);
      }
    }
  }

  // ... rest of the method
}

private chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

private async parseFileWithErrorHandling(file: string): Promise<DependencyNode | null> {
  try {
    return this.parser.parseFile(file);
  } catch (error) {
    return null;
  }
}
```

### Alternative: Worker Threads (for CPU-intensive parsing)

```typescript
// Create src/lib/parser-worker.ts
import { parentPort, workerData } from "worker_threads";
import { ASTParser } from "./parser.js";

const parser = new ASTParser();
const { filePath } = workerData;

try {
  const node = parser.parseFile(filePath);
  parentPort?.postMessage({ success: true, node, filePath });
} catch (error) {
  parentPort?.postMessage({ success: false, error: error.message, filePath });
}
```

## 2. Incremental Analysis Implementation

### File Structure

```
.unreach/
  ├── cache.json          # File metadata cache
  ├── asts/               # Cached ASTs (optional)
  └── last-scan.json      # Last scan results
```

### Implementation

```typescript
// Add to src/lib/cache.ts
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

interface FileMetadata {
  path: string;
  hash: string;
  mtime: number;
  size: number;
}

export class AnalysisCache {
  private cacheDir: string;
  private cacheFile: string;

  constructor(cwd: string) {
    this.cacheDir = path.join(cwd, ".unreach");
    this.cacheFile = path.join(this.cacheDir, "cache.json");
    this.ensureCacheDir();
  }

  private ensureCacheDir(): void {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  getFileHash(filePath: string): string {
    const content = fs.readFileSync(filePath, "utf-8");
    return crypto.createHash("sha256").update(content).digest("hex");
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
      return new Map(data);
    } catch {
      return new Map();
    }
  }

  saveCache(cache: Map<string, FileMetadata>): void {
    const data = Array.from(cache.entries());
    fs.writeFileSync(this.cacheFile, JSON.stringify(data, null, 2));
  }

  getChangedFiles(
    currentFiles: string[],
    oldCache: Map<string, FileMetadata>,
  ): { changed: string[]; new: string[]; unchanged: string[] } {
    const changed: string[] = [];
    const newFiles: string[] = [];
    const unchanged: string[] = [];

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

    return { changed, new: newFiles, unchanged };
  }
}
```

### Integration in graph.ts

```typescript
// Modify build() method
async build(entryPoints: string[], showProgress: boolean = true): Promise<void> {
  const cache = new AnalysisCache(this.cwd);
  const oldCache = cache.loadCache();

  const sourceFiles = await fg(["**/*.{ts,tsx,js,jsx}"], {
    // ... config
  });

  const { changed, new: newFiles, unchanged } = cache.getChangedFiles(
    sourceFiles,
    oldCache
  );

  // Only parse changed/new files
  const filesToParse = [...changed, ...newFiles];

  // Load unchanged nodes from cache (if AST caching is implemented)
  for (const file of unchanged) {
    const cachedNode = this.loadCachedNode(file);
    if (cachedNode) {
      this.nodes.set(path.normalize(file), cachedNode);
    } else {
      filesToParse.push(file);
    }
  }

  // Parse only changed/new files
  // ... parsing logic

  // Update cache
  const newCache = new Map<string, FileMetadata>();
  for (const file of sourceFiles) {
    const meta = cache.getFileMetadata(file);
    if (meta) newCache.set(file, meta);
  }
  cache.saveCache(newCache);
}
```

## 3. Configuration File Support

### Implementation

```typescript
// Create src/lib/config.ts
import * as fs from "fs";
import * as path from "path";

export interface UnreachConfig {
  ignore?: {
    files?: string[];
    packages?: string[];
    exports?: string[];
    functions?: string[];
  };
  entryPoints?: string[];
  excludePatterns?: string[];
  rules?: {
    unusedPackages?: boolean;
    unusedImports?: boolean;
    unusedExports?: boolean;
    unusedFunctions?: boolean;
    unusedVariables?: boolean;
    unusedFiles?: boolean;
    unusedConfigs?: boolean;
    unusedScripts?: boolean;
  };
  fix?: {
    enabled?: boolean;
    backup?: boolean;
    interactive?: boolean;
  };
}

export class ConfigLoader {
  private cwd: string;

  constructor(cwd: string) {
    this.cwd = cwd;
  }

  load(): UnreachConfig | null {
    const configPaths = [
      path.join(this.cwd, ".unreachrc.json"),
      path.join(this.cwd, "unreach.config.json"),
      path.join(this.cwd, "unreach.config.js"),
      path.join(this.cwd, "unreach.config.ts"),
      path.join(this.cwd, ".unreachrc.js"),
    ];

    for (const configPath of configPaths) {
      if (fs.existsSync(configPath)) {
        try {
          if (configPath.endsWith(".json")) {
            return JSON.parse(fs.readFileSync(configPath, "utf-8"));
          } else if (configPath.endsWith(".js") || configPath.endsWith(".ts")) {
            // For JS/TS configs, would need to use require or dynamic import
            // This is a simplified version
            delete require.cache[configPath];
            return require(configPath);
          }
        } catch (error) {
          console.warn(`Failed to load config from ${configPath}:`, error);
        }
      }
    }

    return null;
  }

  mergeWithDefaults(config: UnreachConfig | null): UnreachConfig {
    return {
      ignore: {
        files: config?.ignore?.files || [],
        packages: config?.ignore?.packages || [],
        exports: config?.ignore?.exports || [],
        functions: config?.ignore?.functions || [],
      },
      entryPoints: config?.entryPoints,
      excludePatterns: config?.excludePatterns || [],
      rules: {
        unusedPackages: config?.rules?.unusedPackages ?? true,
        unusedImports: config?.rules?.unusedImports ?? true,
        unusedExports: config?.rules?.unusedExports ?? true,
        unusedFunctions: config?.rules?.unusedFunctions ?? true,
        unusedVariables: config?.rules?.unusedVariables ?? true,
        unusedFiles: config?.rules?.unusedFiles ?? true,
        unusedConfigs: config?.rules?.unusedConfigs ?? true,
        unusedScripts: config?.rules?.unusedScripts ?? true,
      },
      fix: {
        enabled: config?.fix?.enabled ?? false,
        backup: config?.fix?.backup ?? true,
        interactive: config?.fix?.interactive ?? false,
      },
    };
  }
}
```

### Integration in analyzer.ts

```typescript
// Modify ReachabilityAnalyzer
constructor(
  graph: DependencyGraph,
  cwd: string = process.cwd(),
  config?: UnreachConfig
) {
  this.graph = graph;
  this.cwd = cwd;
  this.config = config;
}

analyze(): ScanResult {
  // ... existing code
  const result = {
    unusedPackages: this.config?.rules?.unusedPackages
      ? this.findUnusedPackages()
      : [],
    unusedImports: this.config?.rules?.unusedImports
      ? this.findUnusedImports()
      : [],
    // ... apply rules to all find methods
  };

  // Apply ignore patterns
  return this.applyIgnores(result);
}

private applyIgnores(result: ScanResult): ScanResult {
  if (!this.config?.ignore) return result;

  const { ignore } = this.config;

  // Filter unused packages
  if (ignore.packages) {
    result.unusedPackages = result.unusedPackages.filter(
      pkg => !ignore.packages!.some(pattern =>
        this.matchPattern(pkg.name, pattern)
      )
    );
  }

  // Filter unused files
  if (ignore.files) {
    result.unusedFiles = result.unusedFiles.filter(
      file => !ignore.files!.some(pattern =>
        this.matchPattern(file.file, pattern)
      )
    );
  }

  // ... apply to other categories

  return result;
}

private matchPattern(value: string, pattern: string): boolean {
  // Simple glob matching (or use minimatch library)
  const regex = new RegExp(
    '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
  );
  return regex.test(value);
}
```

## 4. Auto-Fix Implementation

### Implementation

```typescript
// Create src/lib/fixer.ts
import * as fs from "fs";
import * as path from "path";
import type { ScanResult } from "../types/index.js";
import { parse } from "@typescript-eslint/typescript-estree";

export class CodeFixer {
  private cwd: string;
  private backupDir: string;

  constructor(cwd: string) {
    this.cwd = cwd;
    this.backupDir = path.join(cwd, ".unreach", "backups");
    this.ensureBackupDir();
  }

  private ensureBackupDir(): void {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  async fix(
    result: ScanResult,
    options: {
      backup?: boolean;
      interactive?: boolean;
    },
  ): Promise<FixResult> {
    const fixed: string[] = [];
    const errors: string[] = [];

    // Backup files if needed
    if (options.backup) {
      await this.createBackup(result);
    }

    // Fix unused imports
    for (const unusedImport of result.unusedImports) {
      try {
        await this.removeUnusedImport(unusedImport);
        fixed.push(
          `Removed unused import: ${unusedImport.importPath} from ${unusedImport.file}`,
        );
      } catch (error) {
        errors.push(`Failed to fix import in ${unusedImport.file}: ${error}`);
      }
    }

    // Fix unused exports (comment them out)
    for (const unusedExport of result.unusedExports) {
      try {
        await this.commentUnusedExport(unusedExport);
        fixed.push(
          `Commented unused export: ${unusedExport.exportName} in ${unusedExport.file}`,
        );
      } catch (error) {
        errors.push(`Failed to fix export in ${unusedExport.file}: ${error}`);
      }
    }

    // Delete unused files (with confirmation)
    for (const unusedFile of result.unusedFiles) {
      if (options.interactive) {
        // Would use inquirer here
        // const confirmed = await this.confirmDelete(unusedFile.file);
        // if (confirmed) {
        //   fs.unlinkSync(unusedFile.file);
        // }
      } else {
        // Auto-delete (risky, but can be enabled)
        // fs.unlinkSync(unusedFile.file);
      }
    }

    return { fixed, errors };
  }

  private async removeUnusedImport(unusedImport: {
    file: string;
    importPath: string;
    line?: number;
  }): Promise<void> {
    const content = fs.readFileSync(unusedImport.file, "utf-8");
    const lines = content.split("\n");

    // Find and remove the import line
    // This is simplified - real implementation would need AST manipulation
    const importLineIndex = unusedImport.line ? unusedImport.line - 1 : -1;

    if (importLineIndex >= 0 && importLineIndex < lines.length) {
      const line = lines[importLineIndex];
      if (line.includes(unusedImport.importPath)) {
        // Check if it's a multi-line import or single line
        // Remove the line(s)
        lines.splice(importLineIndex, 1);
        fs.writeFileSync(unusedImport.file, lines.join("\n"), "utf-8");
      }
    }
  }

  private async commentUnusedExport(unusedExport: {
    file: string;
    exportName: string;
    line?: number;
  }): Promise<void> {
    const content = fs.readFileSync(unusedExport.file, "utf-8");
    const lines = content.split("\n");

    if (unusedExport.line) {
      const lineIndex = unusedExport.line - 1;
      if (lineIndex >= 0 && lineIndex < lines.length) {
        lines[lineIndex] = `// ${lines[lineIndex]}`;
        fs.writeFileSync(unusedExport.file, lines.join("\n"), "utf-8");
      }
    }
  }

  private async createBackup(result: ScanResult): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = path.join(this.backupDir, `backup-${timestamp}`);

    const filesToBackup = new Set<string>();

    result.unusedImports.forEach((imp) => filesToBackup.add(imp.file));
    result.unusedExports.forEach((exp) => filesToBackup.add(exp.file));
    result.unusedFiles.forEach((file) => filesToBackup.add(file.file));

    fs.mkdirSync(backupPath, { recursive: true });

    for (const file of filesToBackup) {
      const relativePath = path.relative(this.cwd, file);
      const backupFile = path.join(backupPath, relativePath);
      const backupDir = path.dirname(backupFile);

      fs.mkdirSync(backupDir, { recursive: true });
      fs.copyFileSync(file, backupFile);
    }
  }
}

interface FixResult {
  fixed: string[];
  errors: string[];
}
```

## 5. Watch Mode Implementation

### Implementation

```typescript
// Add to src/cli/handler.ts
import chokidar from "chokidar";

export async function runWatch(options: ScanOptions): Promise<void> {
  const cwd = options.cwd || process.cwd();

  console.log(chalk.cyan("👀 Watching for changes..."));
  console.log(chalk.gray("Press Ctrl+C to stop\n"));

  // Initial scan
  await runScan(options);

  // Watch for changes
  const watcher = chokidar.watch(cwd, {
    ignored: [/node_modules/, /\.git/, /dist/, /build/, /\.unreach/],
    persistent: true,
  });

  let debounceTimer: NodeJS.Timeout;
  const debounceMs = 500;

  watcher.on("change", (filePath) => {
    clearTimeout(debounceTimer);

    debounceTimer = setTimeout(async () => {
      console.log(chalk.yellow(`\n📝 File changed: ${filePath}`));
      console.log(chalk.gray("Re-scanning...\n"));

      await runScan(options);

      console.log(chalk.cyan("\n👀 Watching for changes...\n"));
    }, debounceMs);
  });

  watcher.on("add", (filePath) => {
    clearTimeout(debounceTimer);

    debounceTimer = setTimeout(async () => {
      console.log(chalk.green(`\n➕ File added: ${filePath}`));
      console.log(chalk.gray("Re-scanning...\n"));

      await runScan(options);

      console.log(chalk.cyan("\n👀 Watching for changes...\n"));
    }, debounceMs);
  });

  watcher.on("unlink", (filePath) => {
    clearTimeout(debounceTimer);

    debounceTimer = setTimeout(async () => {
      console.log(chalk.red(`\n🗑️  File deleted: ${filePath}`));
      console.log(chalk.gray("Re-scanning...\n"));

      await runScan(options);

      console.log(chalk.cyan("\n👀 Watching for changes...\n"));
    }, debounceMs);
  });
}
```

### Add to package.json dependencies

```json
{
  "dependencies": {
    "chokidar": "^3.5.3"
  }
}
```

---

## Testing Recommendations

### Unit Tests Structure

```
tests/
  ├── unit/
  │   ├── parser.test.ts
  │   ├── analyzer.test.ts
  │   ├── graph.test.ts
  │   └── formatter.test.ts
  ├── integration/
  │   └── scan.test.ts
  └── fixtures/
      └── test-project/
```

### Example Test

```typescript
// tests/unit/analyzer.test.ts
import { describe, it, expect } from "vitest";
import { ReachabilityAnalyzer } from "../../src/lib/analyzer";
import { DependencyGraph } from "../../src/lib/graph";

describe("ReachabilityAnalyzer", () => {
  it("should detect unused exports", async () => {
    const graph = new DependencyGraph("./tests/fixtures/test-project");
    await graph.build(["src/index.ts"], false);

    const analyzer = new ReachabilityAnalyzer(graph);
    const result = analyzer.analyze();

    expect(result.unusedExports).toHaveLength(1);
    expect(result.unusedExports[0].exportName).toBe("unusedFunction");
  });
});
```

---

_This guide provides concrete implementation examples for the highest-priority optimizations and features._
