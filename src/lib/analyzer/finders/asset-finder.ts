import * as fs from "fs";
import * as path from "path";
import type { UnusedAsset } from "../../../types/index.js";
import type { DependencyGraph } from "../../graph.js";
import { normalizeNode } from "../utils.js";

export function findUnusedAssets(
  graph: DependencyGraph,
  usedAssets: Set<string>,
): UnusedAsset[] {
  const unused: UnusedAsset[] = [];
  const nodes = graph.getNodes();

  const allAssetImports = new Map<
    string,
    { file: string; line?: number; column?: number }
  >();

  for (const [file, node] of nodes) {
    normalizeNode(node);
    const importsArrayForAssets = Array.isArray(node.imports)
      ? node.imports
      : [];
    for (const importPath of importsArrayForAssets) {
      const importExt = path.extname(importPath).toLowerCase();
      const isAsset =
        [
          ".png",
          ".jpg",
          ".jpeg",
          ".gif",
          ".svg",
          ".webp",
          ".ico",
          ".woff",
          ".woff2",
          ".ttf",
          ".eot",
          ".otf",
        ].includes(importExt) ||
        importPath.match(
          /\.(png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf|eot|otf)$/i,
        );

      if (isAsset && importPath.startsWith(".")) {
        const assetPath = path.resolve(path.dirname(file), importPath);
        const importDetailsMap =
          node.importDetails instanceof Map
            ? node.importDetails
            : node.importDetails
              ? new Map(Object.entries(node.importDetails))
              : new Map();
        const importInfo = importDetailsMap.get(importPath);
        allAssetImports.set(assetPath, {
          file,
          line: importInfo?.line,
          column: importInfo?.column,
        });
      }
    }
  }

  for (const [assetPath, info] of allAssetImports) {
    if (!usedAssets.has(assetPath) && fs.existsSync(assetPath)) {
      const ext = path.extname(assetPath).toLowerCase();
      let assetType: "image" | "font" | "other" = "other";
      if (
        [".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".ico"].includes(ext)
      ) {
        assetType = "image";
      } else if ([".woff", ".woff2", ".ttf", ".eot", ".otf"].includes(ext)) {
        assetType = "font";
      }

      unused.push({
        file: info.file,
        assetPath,
        assetType,
        line: info.line,
        column: info.column,
      });
    }
  }

  return unused;
}
