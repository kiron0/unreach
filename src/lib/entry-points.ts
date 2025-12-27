import fg from "fast-glob";
import * as fs from "fs";
import * as path from "path";

export class EntryPointDetector {
  private cwd: string;
  private detectedSourceDirs = new Set<string>();
  private detectedBuildDirs = new Set<string>();
  constructor(cwd: string = process.cwd()) {
    this.cwd = cwd;
    this.detectProjectStructure();
  }
  private detectProjectStructure(): void {
    try {
      const dirs = fs
        .readdirSync(this.cwd, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name);

      const commonSourceDirs = [
        "src",
        "source",
        "lib",
        "app",
        "packages",
        "modules",
      ];
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
      ];

      for (const dir of dirs) {
        if (commonSourceDirs.includes(dir)) {
          this.detectedSourceDirs.add(dir);
        }
        if (commonBuildDirs.includes(dir)) {
          this.detectedBuildDirs.add(dir);
        }
      }

      if (this.detectedSourceDirs.size === 0) {
        this.detectedSourceDirs.add("src");
      }
    } catch (error) {
      this.detectedSourceDirs.add("src");
    }
  }
  async detectEntryPoints(
    customEntries?: string | string[],
  ): Promise<string[]> {
    const entries: string[] = [];

    if (customEntries) {
      const custom = Array.isArray(customEntries)
        ? customEntries
        : [customEntries];
      for (const entry of custom) {
        const resolved = this.resolvePath(entry);
        if (resolved && fs.existsSync(resolved)) {
          entries.push(resolved);
        }
      }
      if (entries.length > 0) return entries;
    }

    await this.detectFromPackageJson(entries);
    await this.detectFromTsConfig(entries);
    await this.detectCommonEntryPoints(entries);
    await this.detectFromFrameworks(entries);
    await this.detectTestFiles(entries);

    return [...new Set(entries)];
  }

  private async detectFromPackageJson(entries: string[]): Promise<void> {
    const packageJsonPath = path.join(this.cwd, "package.json");
    if (!fs.existsSync(packageJsonPath)) return;

    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));

      const fieldsToParse = [
        "bin",
        "main",
        "module",
        "browser",
        "exports",
        "types",
        "typings",
      ];

      for (const field of fieldsToParse) {
        if (packageJson[field]) {
          this.extractEntriesFromField(packageJson[field], entries);
        }
      }
    } catch (error) {
      console.warn("Failed to read package.json:", error);
    }
  }

  private extractEntriesFromField(field: any, entries: string[]): void {
    if (typeof field === "string") {
      const resolved = this.resolveEntry(field);
      if (resolved) entries.push(resolved);
    } else if (typeof field === "object" && field !== null) {
      if (Array.isArray(field)) {
        for (const item of field) {
          this.extractEntriesFromField(item, entries);
        }
      } else {
        for (const value of Object.values(field)) {
          this.extractEntriesFromField(value, entries);
        }
      }
    }
  }

  private resolveEntry(filePath: string): string | null {
    const resolved = this.resolvePath(filePath);
    if (!resolved) return null;

    if (this.isBuildPath(resolved)) {
      const sourcePath = this.findSourceFile(resolved);
      return sourcePath || null;
    }
    return resolved;
  }

  private async detectFromTsConfig(entries: string[]): Promise<void> {
    const tsConfigPath = path.join(this.cwd, "tsconfig.json");
    if (!fs.existsSync(tsConfigPath)) return;

    try {
      const tsConfig = JSON.parse(fs.readFileSync(tsConfigPath, "utf-8"));

      if (tsConfig.files) {
        for (const file of tsConfig.files) {
          const resolved = this.resolvePath(file);
          if (resolved && fs.existsSync(resolved)) {
            entries.push(resolved);
          }
        }
      }

      if (tsConfig.include) {
        for (const pattern of tsConfig.include) {
          const files = await fg(pattern, {
            cwd: this.cwd,
            absolute: true,
            ignore: this.getIgnorePatterns(),
          });
          entries.push(...files.slice(0, 5));
        }
      }
    } catch (error) {
      return;
    }
  }

  private async detectCommonEntryPoints(entries: string[]): Promise<void> {
    const entryFileNames = [
      "index",
      "main",
      "app",
      "server",
      "client",
      "entry",
      "start",
    ];
    const extensions = ["ts", "tsx", "js", "jsx", "mjs", "cjs"];

    for (const sourceDir of this.detectedSourceDirs) {
      for (const fileName of entryFileNames) {
        for (const ext of extensions) {
          const patterns = [
            path.join(this.cwd, sourceDir, `${fileName}.${ext}`),
            path.join(this.cwd, sourceDir, fileName, `index.${ext}`),
          ];

          for (const pattern of patterns) {
            if (fs.existsSync(pattern)) {
              entries.push(pattern);
              return;
            }
          }
        }
      }
    }

    for (const fileName of entryFileNames) {
      for (const ext of extensions) {
        const rootFile = path.join(this.cwd, `${fileName}.${ext}`);
        if (fs.existsSync(rootFile)) {
          entries.push(rootFile);
          return;
        }
      }
    }
  }

  private async detectFromFrameworks(entries: string[]): Promise<void> {
    const frameworkPatterns: Record<string, string[]> = {
      nextjs: ["pages/**/*.{ts,tsx,js,jsx}", "app/**/*.{ts,tsx,js,jsx}"],
      nuxt: ["pages/**/*.vue", "app.vue"],
      svelte: ["src/routes/**/*.svelte"],
      astro: ["src/pages/**/*.astro"],
      gatsby: ["src/pages/**/*.{ts,tsx,js,jsx}"],
      remix: ["app/routes/**/*.{ts,tsx,js,jsx}", "app/root.tsx"],
      vite: ["src/main.{ts,tsx,js,jsx}"],
      angular: ["src/main.ts", "src/app/**/*.ts"],
    };

    for (const [framework, patterns] of Object.entries(frameworkPatterns)) {
      const frameworkFiles = await fg(patterns, {
        cwd: this.cwd,
        absolute: true,
        ignore: this.getIgnorePatterns(),
      });

      if (frameworkFiles.length > 0) {
        entries.push(...frameworkFiles.slice(0, 10));
      }
    }
  }

  private async detectTestFiles(entries: string[]): Promise<void> {
    const testFiles = await fg(
      [
        "**/*.test.{ts,tsx,js,jsx}",
        "**/*.spec.{ts,tsx,js,jsx}",
        "**/__tests__/**/*.{ts,tsx,js,jsx}",
      ],
      {
        cwd: this.cwd,
        absolute: true,
        ignore: this.getIgnorePatterns(),
      },
    );
    entries.push(...testFiles);
  }

  private getIgnorePatterns(): string[] {
    const patterns = [
      "**/node_modules/**",
      "**/.git/**",
      "**/.svn/**",
      "**/.hg/**",
    ];

    for (const buildDir of this.detectedBuildDirs) {
      patterns.push(`**/${buildDir}/**`);
    }

    return patterns;
  }
  private resolvePath(relativePath: string): string | null {
    try {
      const resolved = path.resolve(this.cwd, relativePath);
      const normalized = path.normalize(resolved);
      if (fs.existsSync(normalized)) {
        return normalized;
      }
      return null;
    } catch {
      return null;
    }
  }
  private isBuildPath(filePath: string): boolean {
    const normalized = path.normalize(filePath);
    const relativePath = path.relative(this.cwd, normalized);
    const segments = relativePath.split(path.sep);

    for (const segment of segments) {
      if (this.detectedBuildDirs.has(segment)) {
        return true;
      }
    }

    return false;
  }
  private findSourceFile(buildPath: string): string | null {
    const relativePath = path.relative(this.cwd, buildPath);
    const segments = relativePath.split(path.sep);

    let buildDirIndex = -1;
    let buildDir = "";

    for (let i = 0; i < segments.length; i++) {
      if (this.detectedBuildDirs.has(segments[i])) {
        buildDirIndex = i;
        buildDir = segments[i];
        break;
      }
    }

    if (buildDirIndex === -1) return null;

    const pathAfterBuild = segments.slice(buildDirIndex + 1).join(path.sep);

    for (const sourceDir of this.detectedSourceDirs) {
      const basePath = path.join(sourceDir, pathAfterBuild);
      const possibleSources = this.generateSourceVariants(basePath);

      for (const sourcePath of possibleSources) {
        const fullPath = path.join(this.cwd, sourcePath);
        if (fs.existsSync(fullPath)) {
          return path.normalize(fullPath);
        }
      }
    }

    const possibleSources = this.generateSourceVariants(pathAfterBuild);
    for (const sourcePath of possibleSources) {
      const fullPath = path.join(this.cwd, sourcePath);
      if (fs.existsSync(fullPath)) {
        return path.normalize(fullPath);
      }
    }

    return null;
  }

  private generateSourceVariants(filePath: string): string[] {
    const variants: string[] = [];
    const ext = path.extname(filePath);
    const baseName = filePath.slice(0, -ext.length);

    const jsToTsMap: Record<string, string[]> = {
      ".js": [".tsx", ".ts", ".jsx", ".js"],
      ".jsx": [".tsx", ".jsx"],
      ".mjs": [".mts", ".mjs"],
      ".cjs": [".cts", ".cjs"],
    };

    if (jsToTsMap[ext]) {
      for (const newExt of jsToTsMap[ext]) {
        variants.push(baseName + newExt);
      }
    } else {
      variants.push(filePath);
    }

    return variants;
  }
}
