import type { ScanResult } from "../../types/index.js";
import type { UnreachConfig } from "../config.js";
import { ConfigLoader } from "../config.js";
import { DependencyGraph } from "../graph.js";
import { markBuildToolsAndConfigs } from "./build-tools.js";
import {
  findUnusedAssets,
  findUnusedCSSClasses,
  findUnusedConfigs,
  findUnusedExports,
  findUnusedFiles,
  findUnusedFunctions,
  findUnusedImports,
  findUnusedPackages,
  findUnusedScripts,
  findUnusedTypes,
  findUnusedVariables,
} from "./finders/index.js";
import { applyIgnores } from "./ignore-filter.js";
import type { ReachabilityState } from "./reachability-state.js";
import { markReachable } from "./reachability.js";

export class ReachabilityAnalyzer {
  private graph: DependencyGraph;
  private cwd: string;
  private config: UnreachConfig | null = null;
  private configLoader: ConfigLoader;
  private reachableFiles = new Set<string>();
  private reachableExports = new Map<string, Set<string>>();
  private reachableFunctions = new Map<string, Set<string>>();
  private reachableVariables = new Map<string, Set<string>>();
  private usedPackages = new Set<string>();
  private importedSymbols = new Map<string, Set<string>>();
  private usedImports = new Map<string, Set<string>>();
  private usedTypes = new Map<string, Set<string>>();
  private usedCSSClasses = new Set<string>();
  private usedAssets = new Set<string>();

  constructor(
    graph: DependencyGraph,
    cwd: string = process.cwd(),
    config?: UnreachConfig,
  ) {
    this.graph = graph;
    this.cwd = cwd;
    this.config = config || null;
    this.configLoader = new ConfigLoader(cwd);
  }
  analyze(): ScanResult {
    markBuildToolsAndConfigs(this.cwd, this.usedPackages, this.reachableFiles);
    const nodes = this.graph.getNodes();
    const state: ReachabilityState = {
      reachableFiles: this.reachableFiles,
      reachableExports: this.reachableExports,
      reachableFunctions: this.reachableFunctions,
      reachableVariables: this.reachableVariables,
      importedSymbols: this.importedSymbols,
      usedImports: this.usedImports,
      usedTypes: this.usedTypes,
      usedPackages: this.usedPackages,
      usedCSSClasses: this.usedCSSClasses,
      usedAssets: this.usedAssets,
    };

    for (const [file, node] of nodes) {
      if (node.isEntryPoint) {
        markReachable(file, this.graph, state);
      }
    }

    const result: ScanResult = {
      unusedPackages:
        this.config?.rules?.unusedPackages !== false
          ? findUnusedPackages(this.cwd, this.usedPackages)
          : [],
      unusedImports:
        this.config?.rules?.unusedImports !== false
          ? findUnusedImports(
              this.graph,
              this.reachableFiles,
              this.usedImports,
              this.importedSymbols,
            )
          : [],
      unusedExports:
        this.config?.rules?.unusedExports !== false
          ? findUnusedExports(this.graph, this.reachableExports)
          : [],
      unusedFunctions:
        this.config?.rules?.unusedFunctions !== false
          ? findUnusedFunctions(
              this.graph,
              this.reachableFunctions,
              this.reachableExports,
            )
          : [],
      unusedVariables:
        this.config?.rules?.unusedVariables !== false
          ? findUnusedVariables(
              this.graph,
              this.reachableFiles,
              this.reachableVariables,
            )
          : [],
      unusedFiles:
        this.config?.rules?.unusedFiles !== false
          ? findUnusedFiles(this.graph, this.reachableFiles)
          : [],
      unusedConfigs:
        this.config?.rules?.unusedConfigs !== false
          ? findUnusedConfigs(
              this.cwd,
              this.graph,
              this.reachableFiles,
              this.usedPackages,
            )
          : [],
      unusedScripts:
        this.config?.rules?.unusedScripts !== false
          ? findUnusedScripts(this.cwd, this.usedPackages)
          : [],
      unusedTypes:
        this.config?.rules?.unusedTypes !== false
          ? findUnusedTypes(
              this.graph,
              this.reachableFiles,
              this.usedTypes,
              this.reachableExports,
            )
          : [],
      unusedCSSClasses:
        this.config?.rules?.unusedCSSClasses !== false
          ? findUnusedCSSClasses(this.graph, this.usedCSSClasses)
          : [],
      unusedAssets:
        this.config?.rules?.unusedAssets !== false
          ? findUnusedAssets(this.graph, this.usedAssets)
          : [],
    };

    return applyIgnores(result, this.config, this.configLoader);
  }

  clearMemory(): void {
    this.importedSymbols.clear();
    this.usedImports.clear();
  }
}
