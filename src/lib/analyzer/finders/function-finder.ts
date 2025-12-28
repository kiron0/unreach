import type { UnusedFunction } from "../../../types/index.js";
import type { DependencyGraph } from "../../graph.js";
import { normalizeNode } from "../utils.js";

export function findUnusedFunctions(
  graph: DependencyGraph,
  reachableFunctions: Map<string, Set<string>>,
  reachableExports: Map<string, Set<string>>,
): UnusedFunction[] {
  const unused: UnusedFunction[] = [];
  const nodes = graph.getNodes();
  for (const [file, node] of nodes) {
    normalizeNode(node);
    const reachableFunctionsForFile = reachableFunctions.get(file) || new Set();
    const reachableExportsForFile = reachableExports.get(file) || new Set();
    const functionCalls = node.functionCalls || new Set<string>();
    const variableReferences = node.variableReferences || new Set<string>();
    const jsxElements = node.jsxElements || new Set<string>();
    for (const [funcName, funcInfo] of node.functions) {
      const isFunctionUsed = reachableFunctionsForFile.has(funcName);
      const isExportUsed =
        funcInfo.isExported && reachableExportsForFile.has(funcName);
      const isCalledInSameFile = functionCalls.has(funcName);
      const isReferencedAsVariable = variableReferences.has(funcName);
      const isUsedInJSX = jsxElements.has(funcName);
      const isInEntryPoint = node.isEntryPoint;
      if (
        !isFunctionUsed &&
        !isExportUsed &&
        !isCalledInSameFile &&
        !isReferencedAsVariable &&
        !isUsedInJSX &&
        !isInEntryPoint
      ) {
        unused.push({
          file,
          functionName: funcName,
          line: funcInfo.line,
          column: funcInfo.column,
        });
      }
    }
  }
  return unused;
}
