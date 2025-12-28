import * as fs from "fs";
import * as path from "path";
import type { UnusedImport } from "../../../types/index.js";
import type { DependencyGraph } from "../../graph.js";
import { normalizeNode } from "../utils.js";

export function findUnusedImports(
  graph: DependencyGraph,
  reachableFiles: Set<string>,
  usedImports: Map<string, Set<string>>,
  importedSymbols: Map<string, Set<string>>,
): UnusedImport[] {
  const unused: UnusedImport[] = [];
  const nodes = graph.getNodes();
  for (const [file, node] of nodes) {
    normalizeNode(node);
    if (node.importDetails) {
      for (const [importPath, importInfo] of node.importDetails) {
        if (importPath.startsWith(".")) {
          const importExt = path.extname(importPath).toLowerCase();
          const isAssetImport =
            [".css", ".scss", ".sass", ".less", ".styl"].includes(importExt) ||
            importPath.endsWith(".css") ||
            importPath.endsWith(".scss") ||
            importPath.endsWith(".sass") ||
            importPath.endsWith(".less");

          if (isAssetImport) {
            const assetPath = path.resolve(path.dirname(file), importPath);
            if (fs.existsSync(assetPath)) {
              continue;
            }
          }

          const resolved = graph.resolveImport(importPath, file);
          if (!resolved || !reachableFiles.has(resolved)) {
            unused.push({
              file,
              importPath,
              line: importInfo.line,
              column: importInfo.column,
            });
          } else {
            const usedImportsForFile = usedImports.get(file) || new Set();
            if (!usedImportsForFile.has(importPath)) {
              unused.push({
                file,
                importPath,
                line: importInfo.line,
                column: importInfo.column,
              });
            } else if (
              importInfo.specifiers.size > 0 &&
              !importInfo.isNamespace &&
              !importInfo.isDefault
            ) {
              const importedSymbolsForFile =
                importedSymbols.get(file) || new Set();
              const unusedSpecifiers: string[] = [];
              for (const specifier of importInfo.specifiers) {
                if (!importedSymbolsForFile.has(specifier)) {
                  unusedSpecifiers.push(specifier);
                }
              }
            }
          }
        }
      }
    }
    const importsArrayForUnused = Array.isArray(node.imports)
      ? node.imports
      : [];
    for (const importPath of importsArrayForUnused) {
      if (importPath.startsWith(".")) {
        const importExt = path.extname(importPath).toLowerCase();
        const isAssetImport =
          [".css", ".scss", ".sass", ".less", ".styl"].includes(importExt) ||
          importPath.endsWith(".css") ||
          importPath.endsWith(".scss") ||
          importPath.endsWith(".sass") ||
          importPath.endsWith(".less");

        if (isAssetImport) {
          const assetPath = path.resolve(path.dirname(file), importPath);
          if (fs.existsSync(assetPath)) {
            continue;
          }
        }

        const resolved = graph.resolveImport(importPath, file);
        const usedImportsForFile = usedImports.get(file) || new Set();
        if (
          (!resolved || !reachableFiles.has(resolved)) &&
          !usedImportsForFile.has(importPath)
        ) {
          unused.push({
            file,
            importPath,
          });
        }
      }
    }
  }
  return unused;
}
