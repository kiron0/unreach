import fg from "fast-glob";
import * as fs from "fs";
import * as path from "path";
import type { DependencyNode } from "../types/index.js";
import { ProgressBar } from "../utils/progress.js";
import { ASTParser } from "./parser.js";

export class DependencyGraph {
  private nodes = new Map<string, DependencyNode>();
  private parser: ASTParser;
  private cwd: string;
  private detectedBuildDirs = new Set<string>();
  constructor(cwd: string = process.cwd()) {
    this.cwd = cwd;
    this.parser = new ASTParser();
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

    return patterns;
  }
  async build(
    entryPoints: string[],
    showProgress: boolean = true,
  ): Promise<void> {
    const sourceFiles = await fg(["**/*.{ts,tsx,js,jsx}"], {
      cwd: this.cwd,
      absolute: true,
      dot: true,
      ignore: this.getIgnorePatterns(),
      followSymbolicLinks: false,
    });
    const progressBar =
      showProgress && process.stderr.isTTY
        ? new ProgressBar(sourceFiles.length)
        : null;
    let processed = 0;
    let errors = 0;
    for (const file of sourceFiles) {
      try {
        const node = this.parser.parseFile(file);
        if (node) {
          const normalizedPath = path.normalize(file);
          this.nodes.set(normalizedPath, node);
        }
        processed++;
      } catch (error) {
        errors++;
        processed++;
      }
      if (progressBar) {
        progressBar.update(processed, errors);
      }
    }
    if (progressBar) {
      progressBar.finish();
    }
    for (const entry of entryPoints) {
      let normalizedEntry = path.normalize(entry);
      if (!path.isAbsolute(normalizedEntry)) {
        normalizedEntry = path.resolve(this.cwd, normalizedEntry);
      }
      normalizedEntry = path.normalize(normalizedEntry);
      let node = this.nodes.get(normalizedEntry);
      if (!node) {
        const parsedNode = this.parser.parseFile(normalizedEntry);
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
  getNodes(): Map<string, DependencyNode> {
    return this.nodes;
  }
  getNode(filePath: string): DependencyNode | undefined {
    const normalizedPath = path.normalize(filePath);
    return this.nodes.get(normalizedPath);
  }
  resolveImport(importPath: string, fromFile: string): string | null {
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
          return normalizedWithExt;
        }
        const indexPath = path.join(normalizedResolved, "index" + ext);
        const normalizedIndexPath = path.normalize(indexPath);
        if (this.nodes.has(normalizedIndexPath)) {
          return normalizedIndexPath;
        }
      }
      if (importPath !== importWithoutExt) {
        const originalResolved = path.resolve(
          path.dirname(fromFile),
          importPath,
        );
        const normalizedOriginal = path.normalize(originalResolved);
        if (this.nodes.has(normalizedOriginal)) {
          return normalizedOriginal;
        }
      }
      return null;
    }
    return null;
  }
  getAllFiles(): string[] {
    return Array.from(this.nodes.keys());
  }
}
