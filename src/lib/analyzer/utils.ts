import * as path from "path";
import type { DependencyNode, ImportInfo } from "../../types/index.js";

export function extractPackageName(importPath: string): string | null {
  const parts = importPath.split("/");
  if (parts[0].startsWith("@")) {
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : null;
  }
  return parts[0] || null;
}

export function resolveDirnamePath(
  pathStr: string,
  filePath: string,
): string | null {
  if (!pathStr.includes("__dirname") && !pathStr.includes("__filename")) {
    return null;
  }

  if (pathStr.includes("/")) {
    const parts = pathStr.split("/");
    const dirnameIndex = parts.findIndex(
      (p) => p === "__dirname" || p === "__filename",
    );
    if (dirnameIndex >= 0 && dirnameIndex < parts.length - 1) {
      const relativePath = parts.slice(dirnameIndex + 1).join("/");
      if (relativePath) {
        const fileDir = path.dirname(filePath);
        return path.resolve(fileDir, relativePath);
      }
    }
  }

  if (pathStr.startsWith("__dirname") || pathStr.startsWith("__filename")) {
    const relativePath = pathStr.replace(/^(__dirname|__filename)\/?/, "");
    if (relativePath && relativePath !== pathStr) {
      const fileDir = path.dirname(filePath);
      return path.resolve(fileDir, relativePath);
    }
  }

  return null;
}

export function normalizeNode(node: DependencyNode): void {
  if (!(node.importDetails instanceof Map)) {
    node.importDetails = node.importDetails
      ? new Map(
          Object.entries(node.importDetails).map(
            ([key, value]: [string, unknown]) => {
              const importInfo = value as ImportInfo;
              return [
                key,
                {
                  ...importInfo,
                  specifiers:
                    importInfo.specifiers instanceof Set
                      ? importInfo.specifiers
                      : Array.isArray(importInfo.specifiers)
                        ? new Set(importInfo.specifiers)
                        : new Set(),
                  typeSpecifiers:
                    importInfo.typeSpecifiers instanceof Set
                      ? importInfo.typeSpecifiers
                      : Array.isArray(importInfo.typeSpecifiers)
                        ? new Set(importInfo.typeSpecifiers)
                        : new Set(),
                },
              ];
            },
          ),
        )
      : new Map();
  }
  if (!(node.exports instanceof Map)) {
    node.exports = node.exports
      ? new Map(Object.entries(node.exports))
      : new Map();
  }
  if (!(node.reExports instanceof Map)) {
    node.reExports = node.reExports
      ? new Map(Object.entries(node.reExports))
      : new Map();
  }
  if (!(node.functions instanceof Map)) {
    node.functions = node.functions
      ? new Map(Object.entries(node.functions))
      : new Map();
  }
  if (!(node.classes instanceof Map)) {
    node.classes = node.classes
      ? new Map(Object.entries(node.classes))
      : new Map();
  }
  if (!(node.variables instanceof Map)) {
    node.variables = node.variables
      ? new Map(Object.entries(node.variables))
      : new Map();
  }
  if (!(node.types instanceof Map)) {
    node.types = node.types ? new Map(Object.entries(node.types)) : new Map();
  }

  if (!(node.variableReferences instanceof Set)) {
    node.variableReferences = Array.isArray(node.variableReferences)
      ? new Set(node.variableReferences)
      : node.variableReferences || new Set<string>();
  }
  if (!(node.functionCalls instanceof Set)) {
    node.functionCalls = Array.isArray(node.functionCalls)
      ? new Set(node.functionCalls)
      : node.functionCalls || new Set<string>();
  }
  if (!(node.jsxElements instanceof Set)) {
    node.jsxElements = Array.isArray(node.jsxElements)
      ? new Set(node.jsxElements)
      : node.jsxElements || new Set<string>();
  }
  if (!(node.cssClasses instanceof Set)) {
    node.cssClasses = Array.isArray(node.cssClasses)
      ? new Set(node.cssClasses)
      : node.cssClasses || new Set<string>();
  }

  if (!Array.isArray(node.imports)) {
    node.imports = [];
  }
  if (!Array.isArray(node.dynamicImports)) {
    node.dynamicImports = [];
  }
}

export function checkForDecorators(
  graph: { getNodes(): Map<string, DependencyNode> },
  reachableFiles: Set<string>,
): boolean {
  const nodes = graph.getNodes();
  for (const [file] of nodes) {
    if (reachableFiles.has(file)) {
      try {
        const fs = require("fs");
        const content = fs.readFileSync(file, "utf-8");
        if (/\s@\w+\s*\(/m.test(content) || /\s@\w+\s*$/m.test(content)) {
          return true;
        }
      } catch {}
    }
  }
  return false;
}
