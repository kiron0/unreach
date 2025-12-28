import type { UnusedVariable } from "../../../types/index.js";
import type { DependencyGraph } from "../../graph.js";
import { normalizeNode } from "../utils.js";

export function findUnusedVariables(
  graph: DependencyGraph,
  reachableFiles: Set<string>,
  reachableVariables: Map<string, Set<string>>,
): UnusedVariable[] {
  const unused: UnusedVariable[] = [];
  const nodes = graph.getNodes();
  for (const [file, node] of nodes) {
    normalizeNode(node);
    if (!reachableFiles.has(file)) {
      continue;
    }
    const reachableVariablesForFile = reachableVariables.get(file) || new Set();
    const variableReferences = node.variableReferences || new Set<string>();
    for (const [varName, varInfo] of node.variables) {
      if (varInfo.isExported) {
        continue;
      }
      if (!reachableVariablesForFile.has(varName)) {
        if (!variableReferences.has(varName)) {
          unused.push({
            file,
            variableName: varName,
            line: varInfo.line,
            column: varInfo.column,
          });
        }
      }
    }
  }
  return unused;
}
