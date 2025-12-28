import type { UnusedExport } from "../../../types/index.js";
import type { DependencyGraph } from "../../graph.js";
import { normalizeNode } from "../utils.js";

export function findUnusedExports(
  graph: DependencyGraph,
  reachableExports: Map<string, Set<string>>,
): UnusedExport[] {
  const unused: UnusedExport[] = [];
  const nodes = graph.getNodes();
  const configFilePatterns = [
    /config\.(ts|js|mjs|cjs)$/i,
    /\.config\.(ts|js|mjs|cjs)$/i,
  ];

  const isVitePressThemeFile = (filePath: string): boolean => {
    const normalized = filePath.replace(/\\/g, "/");
    return (
      normalized.includes("/.vitepress/theme/") ||
      normalized.includes("\\.vitepress\\theme\\")
    );
  };

  for (const [file, node] of nodes) {
    normalizeNode(node);
    const isConfigFile = configFilePatterns.some((pattern) =>
      pattern.test(file),
    );
    if (isConfigFile) {
      continue;
    }
    const isVitePressTheme = isVitePressThemeFile(file);
    const reachableExportsForFile = reachableExports.get(file) || new Set();
    for (const [exportName, exportInfo] of node.exports) {
      if (exportName === "*") {
        continue;
      }
      if (!reachableExportsForFile.has(exportName)) {
        const isTypeExport =
          exportInfo.type === "named" &&
          exportName[0] === exportName[0].toUpperCase();
        const isVitePressDefaultExport =
          isVitePressTheme && exportInfo.type === "default";
        if (!node.isEntryPoint && !isTypeExport && !isVitePressDefaultExport) {
          unused.push({
            file,
            exportName,
            line: exportInfo.line,
            column: exportInfo.column,
          });
        }
      }
    }
  }
  return unused;
}
