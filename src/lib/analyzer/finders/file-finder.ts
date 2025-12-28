import * as path from "path";
import type { UnusedFile } from "../../../types/index.js";
import type { DependencyGraph } from "../../graph.js";

export function findUnusedFiles(
  graph: DependencyGraph,
  reachableFiles: Set<string>,
): UnusedFile[] {
  const unused: UnusedFile[] = [];
  const allFiles = graph.getAllFiles();
  const commonConfigFiles = [
    "tsconfig.json",
    "package.json",
    ".gitignore",
    ".npmignore",
    "README.md",
    "LICENSE",
  ];

  const isConventionBasedFile = (filePath: string): boolean => {
    const normalized = filePath.replace(/\\/g, "/");
    if (
      normalized.includes("/.vitepress/theme/index.") ||
      normalized.includes("\\.vitepress\\theme\\index.")
    ) {
      return true;
    }
    if (
      normalized.includes("/app/layout.") ||
      normalized.includes("/app/page.") ||
      normalized.includes("/app/loading.") ||
      normalized.includes("/app/error.") ||
      normalized.includes("/app/not-found.")
    ) {
      return true;
    }
    if (normalized.match(/\/routes\/.*\.(tsx?|jsx?)$/)) {
      return true;
    }
    return false;
  };

  for (const file of allFiles) {
    if (reachableFiles.has(file)) {
      continue;
    }
    const fileName = path.basename(file);
    if (commonConfigFiles.includes(fileName)) {
      continue;
    }
    if (isConventionBasedFile(file)) {
      continue;
    }
    unused.push({ file });
  }
  return unused;
}
