import fg from "fast-glob";
import * as fs from "fs";
import * as path from "path";
export class EntryPointDetector {
  private cwd: string;
  constructor(cwd: string = process.cwd()) {
    this.cwd = cwd;
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
    const packageJsonPath = path.join(this.cwd, "package.json");
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(
          fs.readFileSync(packageJsonPath, "utf-8"),
        );
        if (packageJson.bin) {
          if (typeof packageJson.bin === "string") {
            const binPath = this.resolvePath(packageJson.bin);
            if (binPath) {
              const sourcePath = this.findSourceFile(binPath);
              if (sourcePath) {
                entries.push(sourcePath);
              } else {
                entries.push(binPath);
              }
            }
          } else {
            for (const binPath of Object.values(packageJson.bin)) {
              const resolved = this.resolvePath(binPath as string);
              if (resolved) {
                const sourcePath = this.findSourceFile(resolved);
                if (sourcePath) {
                  entries.push(sourcePath);
                } else {
                  entries.push(resolved);
                }
              }
            }
          }
        }
        if (packageJson.main) {
          const mainPath = this.resolvePath(packageJson.main);
          if (mainPath) {
            const sourcePath = this.findSourceFile(mainPath);
            if (sourcePath) {
              entries.push(sourcePath);
            } else {
              entries.push(mainPath);
            }
          }
        }
      } catch (error) {
        console.warn("Failed to read package.json:", error);
      }
    }
    const commonPatterns = [
      "src/index.ts",
      "src/index.tsx",
      "src/index.js",
      "src/index.jsx",
      "src/main.ts",
      "src/main.tsx",
      "src/main.js",
      "index.ts",
      "index.tsx",
      "index.js",
      "index.jsx",
    ];
    for (const pattern of commonPatterns) {
      const fullPath = path.join(this.cwd, pattern);
      if (fs.existsSync(fullPath)) {
        entries.push(fullPath);
        break;
      }
    }
    const testFiles = await fg(
      ["**/*.test.{ts,tsx,js,jsx}", "**/*.spec.{ts,tsx,js,jsx}"],
      {
        cwd: this.cwd,
        absolute: true,
        ignore: ["**/node_modules/**", "**/dist/**", "**/build/**"],
      },
    );
    entries.push(...testFiles);
    return [...new Set(entries)];
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
  private findSourceFile(distPath: string): string | null {
    if (distPath.includes("/dist/") || distPath.includes("\\dist\\")) {
      const relativePath = path.relative(this.cwd, distPath);
      let sourcePath = relativePath.replace(/^dist[\\/]/, "src/");
      if (sourcePath.endsWith(".js")) {
        sourcePath = sourcePath.slice(0, -3) + ".ts";
      } else if (sourcePath.endsWith(".jsx")) {
        sourcePath = sourcePath.slice(0, -4) + ".tsx";
      }
      const fullSourcePath = path.resolve(this.cwd, sourcePath);
      const normalizedPath = path.normalize(fullSourcePath);
      if (fs.existsSync(normalizedPath)) {
        return normalizedPath;
      }
    }
    return null;
  }
}
