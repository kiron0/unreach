import * as fs from "fs";
import * as path from "path";
import type { DependencyGraph } from "../graph.js";
import type { ReachabilityState } from "./reachability-state.js";
import {
  extractPackageName,
  normalizeNode,
  resolveDirnamePath,
} from "./utils.js";

export function markReachable(
  filePath: string,
  graph: DependencyGraph,
  state: ReachabilityState,
): void {
  if (state.reachableFiles.has(filePath)) {
    return;
  }
  const node = graph.getNode(filePath);
  if (!node) return;

  state.reachableFiles.add(filePath);
  if (!state.reachableExports.has(filePath)) {
    state.reachableExports.set(filePath, new Set());
  }
  if (!state.reachableFunctions.has(filePath)) {
    state.reachableFunctions.set(filePath, new Set());
  }
  if (!state.reachableVariables.has(filePath)) {
    state.reachableVariables.set(filePath, new Set());
  }
  if (!state.importedSymbols.has(filePath)) {
    state.importedSymbols.set(filePath, new Set());
  }
  if (!state.usedImports.has(filePath)) {
    state.usedImports.set(filePath, new Set());
  }
  if (!state.usedTypes.has(filePath)) {
    state.usedTypes.set(filePath, new Set());
  }

  if (node.cssClasses) {
    const cssClassesSet =
      node.cssClasses instanceof Set
        ? node.cssClasses
        : Array.isArray(node.cssClasses)
          ? new Set(node.cssClasses as string[])
          : new Set<string>();
    for (const className of cssClassesSet) {
      state.usedCSSClasses.add(className);
    }
  }

  const importsArray = Array.isArray(node.imports) ? node.imports : [];
  for (const importPath of importsArray) {
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
      const assetPath = path.resolve(path.dirname(filePath), importPath);
      state.usedAssets.add(assetPath);
    }
  }
  const importDetailsMap =
    node.importDetails instanceof Map
      ? node.importDetails
      : node.importDetails
        ? new Map(Object.entries(node.importDetails))
        : new Map();

  for (const [importPath, importInfo] of importDetailsMap) {
    if (importInfo) {
      if (!(importInfo.specifiers instanceof Set)) {
        (importInfo as any).specifiers = Array.isArray(importInfo.specifiers)
          ? new Set(importInfo.specifiers)
          : importInfo.specifiers || new Set();
      }
      if (!(importInfo.typeSpecifiers instanceof Set)) {
        (importInfo as any).typeSpecifiers = Array.isArray(
          importInfo.typeSpecifiers,
        )
          ? new Set(importInfo.typeSpecifiers)
          : importInfo.typeSpecifiers || new Set();
      }
    }

    if (!importPath.startsWith(".")) {
      const packageName = extractPackageName(importPath);
      if (packageName) {
        state.usedPackages.add(packageName);
      }
    }

    const importExt = path.extname(importPath).toLowerCase();
    const isAssetImport =
      [".css", ".scss", ".sass", ".less", ".styl"].includes(importExt) ||
      importPath.endsWith(".css") ||
      importPath.endsWith(".scss") ||
      importPath.endsWith(".sass") ||
      importPath.endsWith(".less");

    if (isAssetImport && importPath.startsWith(".")) {
      const assetPath = path.resolve(path.dirname(filePath), importPath);
      if (fs.existsSync(assetPath)) {
        state.usedImports.get(filePath)!.add(importPath);
        continue;
      }
    }

    const resolved = graph.resolveImport(importPath, filePath);
    if (resolved) {
      state.usedImports.get(filePath)!.add(importPath);
      markReachable(resolved, graph, state);
      const importedNode = graph.getNode(resolved);
      if (importedNode) {
        normalizeNode(importedNode);
        if (importInfo.isNamespace) {
          for (const exportName of importedNode.exports.keys()) {
            const reachableExports =
              state.reachableExports.get(resolved) || new Set();
            reachableExports.add(exportName);
            state.reachableExports.set(resolved, reachableExports);
            if (importedNode.functions.has(exportName)) {
              const reachableFunctions =
                state.reachableFunctions.get(resolved) || new Set();
              reachableFunctions.add(exportName);
              state.reachableFunctions.set(resolved, reachableFunctions);
            }
            const reExportsMap =
              importedNode.reExports instanceof Map
                ? importedNode.reExports
                : importedNode.reExports
                  ? new Map(Object.entries(importedNode.reExports))
                  : new Map();
            const reExport = reExportsMap.get(exportName);
            if (reExport) {
              const sourceResolved = graph.resolveImport(
                reExport.sourceFile,
                resolved,
              );
              if (sourceResolved) {
                const sourceReachableExports =
                  state.reachableExports.get(sourceResolved) || new Set();
                sourceReachableExports.add(reExport.exportedName);
                state.reachableExports.set(
                  sourceResolved,
                  sourceReachableExports,
                );
                const sourceNode = graph.getNode(sourceResolved);
                if (sourceNode) {
                  normalizeNode(sourceNode);
                }
                if (sourceNode?.functions.has(reExport.exportedName)) {
                  const sourceReachableFunctions =
                    state.reachableFunctions.get(sourceResolved) || new Set();
                  sourceReachableFunctions.add(reExport.exportedName);
                  state.reachableFunctions.set(
                    sourceResolved,
                    sourceReachableFunctions,
                  );
                }
              }
            }
          }
        } else if (importInfo.isDefault) {
          const defaultExport = importedNode.exports.get("default");
          if (defaultExport) {
            const reachableExports =
              state.reachableExports.get(resolved) || new Set();
            reachableExports.add("default");
            state.reachableExports.set(resolved, reachableExports);
          }
          for (const [exportName, exportInfo] of importedNode.exports) {
            if (exportInfo.type === "default") {
              const reachableExports =
                state.reachableExports.get(resolved) || new Set();
              reachableExports.add(exportName);
              state.reachableExports.set(resolved, reachableExports);
            }
          }
        } else if (
          importInfo.specifiers.size > 0 ||
          importInfo.typeSpecifiers.size > 0
        ) {
          const reachableExports =
            state.reachableExports.get(resolved) || new Set();

          const specifiersSet =
            importInfo.specifiers instanceof Set
              ? importInfo.specifiers
              : Array.isArray(importInfo.specifiers)
                ? new Set(importInfo.specifiers)
                : new Set();
          for (const specifier of specifiersSet) {
            if (importedNode.exports.has(specifier)) {
              reachableExports.add(specifier);
              if (importedNode.functions.has(specifier)) {
                const reachableFunctions =
                  state.reachableFunctions.get(resolved) || new Set();
                reachableFunctions.add(specifier);
                state.reachableFunctions.set(resolved, reachableFunctions);
              }
              if (importedNode.types.has(specifier)) {
                const usedTypesForFile =
                  state.usedTypes.get(resolved) || new Set();
                usedTypesForFile.add(specifier);
                state.usedTypes.set(resolved, usedTypesForFile);
              }
              const exportInfo = importedNode.exports.get(specifier);
              if (exportInfo && exportInfo.type === "named") {
                reachableExports.add(specifier);
              }
            }
          }

          const typeSpecifiersSet =
            importInfo.typeSpecifiers instanceof Set
              ? importInfo.typeSpecifiers
              : Array.isArray(importInfo.typeSpecifiers)
                ? new Set(importInfo.typeSpecifiers)
                : new Set();
          if (importInfo.isTypeOnly || typeSpecifiersSet.size > 0) {
            for (const typeSpec of typeSpecifiersSet) {
              if (importedNode.types.has(typeSpec)) {
                const usedTypesForFile =
                  state.usedTypes.get(resolved) || new Set();
                usedTypesForFile.add(typeSpec);
                state.usedTypes.set(resolved, usedTypesForFile);
                reachableExports.add(typeSpec);
              }
            }
          }

          for (const specifier of specifiersSet) {
            const reExportsMap =
              importedNode.reExports instanceof Map
                ? importedNode.reExports
                : importedNode.reExports
                  ? new Map(Object.entries(importedNode.reExports))
                  : new Map();
            const reExport = reExportsMap.get(specifier);
            if (reExport) {
              const sourceResolved = graph.resolveImport(
                reExport.sourceFile,
                resolved,
              );
              if (sourceResolved) {
                const sourceReachableExports =
                  state.reachableExports.get(sourceResolved) || new Set();
                sourceReachableExports.add(reExport.exportedName);
                state.reachableExports.set(
                  sourceResolved,
                  sourceReachableExports,
                );
                const sourceNode = graph.getNode(sourceResolved);
                if (sourceNode) {
                  normalizeNode(sourceNode);
                }
                if (sourceNode?.functions.has(reExport.exportedName)) {
                  const sourceReachableFunctions =
                    state.reachableFunctions.get(sourceResolved) || new Set();
                  sourceReachableFunctions.add(reExport.exportedName);
                  state.reachableFunctions.set(
                    sourceResolved,
                    sourceReachableFunctions,
                  );
                }
              }
            }
            if (importedNode.exports.has("*")) {
              const importedNodeImportDetails =
                importedNode.importDetails instanceof Map
                  ? importedNode.importDetails
                  : importedNode.importDetails
                    ? new Map(Object.entries(importedNode.importDetails))
                    : new Map();
              for (const [importPath] of importedNodeImportDetails) {
                if (importPath.startsWith(".")) {
                  const sourceResolved = graph.resolveImport(
                    importPath,
                    resolved,
                  );
                  if (sourceResolved) {
                    const sourceNode = graph.getNode(sourceResolved);
                    if (sourceNode) {
                      normalizeNode(sourceNode);
                    }
                    if (sourceNode?.exports.has(specifier)) {
                      const sourceReachableExports =
                        state.reachableExports.get(sourceResolved) || new Set();
                      sourceReachableExports.add(specifier);
                      state.reachableExports.set(
                        sourceResolved,
                        sourceReachableExports,
                      );
                      if (sourceNode.functions.has(specifier)) {
                        const sourceReachableFunctions =
                          state.reachableFunctions.get(sourceResolved) ||
                          new Set();
                        sourceReachableFunctions.add(specifier);
                        state.reachableFunctions.set(
                          sourceResolved,
                          sourceReachableFunctions,
                        );
                      }
                    }
                  }
                }
              }
            }
            if (importedNode.exports.has("default")) {
              reachableExports.add("default");
            }
          }
          state.reachableExports.set(resolved, reachableExports);
          for (const specifier of specifiersSet) {
            state.importedSymbols.get(filePath)!.add(specifier);
          }
        }
      }
    }
  }
  const importsArray2 = Array.isArray(node.imports) ? node.imports : [];
  for (const importPath of importsArray2) {
    if (!state.usedImports.get(filePath)!.has(importPath)) {
      if (!importPath.startsWith(".")) {
        const packageName = extractPackageName(importPath);
        if (packageName) {
          state.usedPackages.add(packageName);
        }
      }
      const resolved = graph.resolveImport(importPath, filePath);
      if (resolved) {
        state.usedImports.get(filePath)!.add(importPath);
        markReachable(resolved, graph, state);
      }
    }
  }
  if (node.isEntryPoint) {
    const functionsMap =
      node.functions instanceof Map ? node.functions : new Map();
    for (const funcName of functionsMap.keys()) {
      state.reachableFunctions.get(filePath)!.add(funcName);
    }
  }
  const reachableExports = state.reachableExports.get(filePath) || new Set();
  const functionsMapForReach =
    node.functions instanceof Map ? node.functions : new Map();
  for (const [funcName, funcInfo] of functionsMapForReach) {
    if (funcInfo.isExported && reachableExports.has(funcName)) {
      state.reachableFunctions.get(filePath)!.add(funcName);
    }
  }
  const functionCalls = node.functionCalls || new Set<string>();
  const variableReferences = node.variableReferences || new Set<string>();
  const jsxElements = node.jsxElements || new Set<string>();
  for (const funcCall of functionCalls) {
    if (node.functions.has(funcCall)) {
      state.reachableFunctions.get(filePath)!.add(funcCall);
    }
  }
  for (const jsxElement of jsxElements) {
    if (node.functions.has(jsxElement)) {
      state.reachableFunctions.get(filePath)!.add(jsxElement);
    }
    if (node.classes.has(jsxElement)) {
      const reachableClasses =
        state.reachableFunctions.get(filePath) || new Set();
      reachableClasses.add(jsxElement);
      state.reachableFunctions.set(filePath, reachableClasses);
    }
    const reachableExports = state.reachableExports.get(filePath) || new Set();
    if (node.exports.has(jsxElement)) {
      reachableExports.add(jsxElement);
      state.reachableExports.set(filePath, reachableExports);
    }
  }
  for (const [importPath, importInfo] of importDetailsMap) {
    if (importInfo) {
      if (!(importInfo.specifiers instanceof Set)) {
        (importInfo as any).specifiers = Array.isArray(importInfo.specifiers)
          ? new Set(importInfo.specifiers)
          : importInfo.specifiers || new Set();
      }
      if (!(importInfo.typeSpecifiers instanceof Set)) {
        (importInfo as any).typeSpecifiers = Array.isArray(
          importInfo.typeSpecifiers,
        )
          ? new Set(importInfo.typeSpecifiers)
          : importInfo.typeSpecifiers || new Set();
      }
    }

    const resolved = graph.resolveImport(importPath, filePath);
    if (resolved) {
      const importedNode = graph.getNode(resolved);
      if (importedNode) {
        normalizeNode(importedNode);
      }
      const specifiersSet =
        importInfo.specifiers instanceof Set
          ? importInfo.specifiers
          : Array.isArray(importInfo.specifiers)
            ? new Set(importInfo.specifiers)
            : new Set();
      if (importedNode && specifiersSet.size > 0) {
        for (const specifier of specifiersSet) {
          if (
            functionCalls.has(specifier) ||
            variableReferences.has(specifier) ||
            jsxElements.has(specifier)
          ) {
            if (importedNode.functions.has(specifier)) {
              const sourceReachableFunctions =
                state.reachableFunctions.get(resolved) || new Set();
              sourceReachableFunctions.add(specifier);
              state.reachableFunctions.set(resolved, sourceReachableFunctions);
              const sourceReachableExports =
                state.reachableExports.get(resolved) || new Set();
              sourceReachableExports.add(specifier);
              state.reachableExports.set(resolved, sourceReachableExports);
            }
            const reExportsMapForCall =
              importedNode.reExports instanceof Map
                ? importedNode.reExports
                : importedNode.reExports
                  ? new Map(Object.entries(importedNode.reExports))
                  : new Map();
            const reExportForCall = reExportsMapForCall.get(specifier);
            if (reExportForCall) {
              const sourceResolved = graph.resolveImport(
                reExportForCall.sourceFile,
                resolved,
              );
              if (sourceResolved) {
                const sourceNode = graph.getNode(sourceResolved);
                if (sourceNode) {
                  normalizeNode(sourceNode);
                }
                if (sourceNode?.functions.has(reExportForCall.exportedName)) {
                  const sourceReachableFunctions =
                    state.reachableFunctions.get(sourceResolved) || new Set();
                  sourceReachableFunctions.add(reExportForCall.exportedName);
                  state.reachableFunctions.set(
                    sourceResolved,
                    sourceReachableFunctions,
                  );
                  const sourceReachableExports =
                    state.reachableExports.get(sourceResolved) || new Set();
                  sourceReachableExports.add(reExportForCall.exportedName);
                  state.reachableExports.set(
                    sourceResolved,
                    sourceReachableExports,
                  );
                }
              }
            } else if (importedNode.exports.has("*")) {
              const importedNodeImportDetails =
                importedNode.importDetails instanceof Map
                  ? importedNode.importDetails
                  : importedNode.importDetails
                    ? new Map(Object.entries(importedNode.importDetails))
                    : new Map();
              for (const [importPath] of importedNodeImportDetails) {
                if (importPath.startsWith(".")) {
                  const sourceResolved = graph.resolveImport(
                    importPath,
                    resolved,
                  );
                  if (sourceResolved) {
                    const sourceNode = graph.getNode(sourceResolved);
                    if (sourceNode) {
                      normalizeNode(sourceNode);
                    }
                    if (
                      sourceNode &&
                      (sourceNode.exports.has(specifier) ||
                        sourceNode.functions.has(specifier))
                    ) {
                      const sourceReachableExports =
                        state.reachableExports.get(sourceResolved) || new Set();
                      sourceReachableExports.add(specifier);
                      state.reachableExports.set(
                        sourceResolved,
                        sourceReachableExports,
                      );
                      if (sourceNode.functions.has(specifier)) {
                        const sourceReachableFunctions =
                          state.reachableFunctions.get(sourceResolved) ||
                          new Set();
                        sourceReachableFunctions.add(specifier);
                        state.reachableFunctions.set(
                          sourceResolved,
                          sourceReachableFunctions,
                        );
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  const varRefs =
    node.variableReferences instanceof Set
      ? node.variableReferences
      : Array.isArray(node.variableReferences)
        ? new Set(node.variableReferences as string[])
        : new Set<string>();
  for (const varRef of varRefs) {
    state.reachableVariables.get(filePath)!.add(varRef as string);
  }

  const dynamicImportsArray = Array.isArray(node.dynamicImports)
    ? node.dynamicImports
    : [];
  if (dynamicImportsArray.length > 0) {
    for (const dynImport of dynamicImportsArray) {
      if (
        dynImport.isTemplateLiteral &&
        (dynImport.path.includes("${?}") || dynImport.path.includes("${"))
      ) {
        if (
          !dynImport.path.startsWith(".") &&
          !dynImport.path.startsWith("__dirname")
        ) {
          const packageName = extractPackageName(dynImport.path.split("${")[0]);
          if (packageName) {
            state.usedPackages.add(packageName);
          }
        }
        continue;
      }

      if (
        dynImport.path === "__dirname" ||
        dynImport.path === "__filename" ||
        dynImport.path.startsWith("__dirname") ||
        dynImport.path.startsWith("__filename")
      ) {
        const resolvedPath = resolveDirnamePath(dynImport.path, filePath);
        if (resolvedPath) {
          const resolved = graph.resolveImport(resolvedPath, filePath);
          if (resolved) {
            state.usedImports.get(filePath)!.add(resolvedPath);
            markReachable(resolved, graph, state);
          }
        }
        continue;
      }

      const importPath = dynImport.path;

      if (!importPath.startsWith(".")) {
        const packageName = extractPackageName(importPath);
        if (packageName) {
          state.usedPackages.add(packageName);
        }
      }

      const resolved = graph.resolveImport(importPath, filePath);
      if (resolved) {
        state.usedImports.get(filePath)!.add(importPath);
        markReachable(resolved, graph, state);
      }
    }
  }
}
