export interface ReachabilityState {
  reachableFiles: Set<string>;
  reachableExports: Map<string, Set<string>>;
  reachableFunctions: Map<string, Set<string>>;
  reachableVariables: Map<string, Set<string>>;
  importedSymbols: Map<string, Set<string>>;
  usedImports: Map<string, Set<string>>;
  usedTypes: Map<string, Set<string>>;
  usedPackages: Set<string>;
  usedCSSClasses: Set<string>;
  usedAssets: Set<string>;
}
