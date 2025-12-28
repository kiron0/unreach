import type { UnusedType } from "../../../types/index.js";
import type { DependencyGraph } from "../../graph.js";
import { normalizeNode } from "../utils.js";

export function findUnusedTypes(
  graph: DependencyGraph,
  reachableFiles: Set<string>,
  usedTypes: Map<string, Set<string>>,
  reachableExports: Map<string, Set<string>>,
): UnusedType[] {
  const unused: UnusedType[] = [];
  const nodes = graph.getNodes();

  for (const [file, node] of nodes) {
    normalizeNode(node);
    if (!reachableFiles.has(file)) {
      continue;
    }

    const usedTypesForFile = usedTypes.get(file) || new Set();
    const reachableExportsForFile = reachableExports.get(file) || new Set();

    for (const [typeName, typeInfo] of node.types) {
      if (usedTypesForFile.has(typeName)) {
        continue;
      }

      if (typeInfo.isExported && reachableExportsForFile.has(typeName)) {
        continue;
      }

      if (node.isEntryPoint) {
        continue;
      }

      const isReferenced =
        node.variableReferences.has(typeName) ||
        node.functionCalls.has(typeName);

      if (!isReferenced) {
        unused.push({
          file,
          typeName,
          typeKind: typeInfo.kind,
          line: typeInfo.line,
          column: typeInfo.column,
        });
      }
    }
  }

  return unused;
}
