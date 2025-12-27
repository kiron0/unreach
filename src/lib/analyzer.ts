import * as fs from "fs";
import * as path from "path";
import type {
  ScanResult,
  UnusedConfig,
  UnusedExport,
  UnusedFile,
  UnusedFunction,
  UnusedImport,
  UnusedPackage,
  UnusedScript,
  UnusedVariable,
} from "../types/index.js";
import { DependencyGraph } from "./graph.js";
export class ReachabilityAnalyzer {
  private graph: DependencyGraph;
  private cwd: string;
  private reachableFiles = new Set<string>();
  private reachableExports = new Map<string, Set<string>>();
  private reachableFunctions = new Map<string, Set<string>>();
  private reachableVariables = new Map<string, Set<string>>();
  private usedPackages = new Set<string>();
  private importedSymbols = new Map<string, Set<string>>();
  private usedImports = new Map<string, Set<string>>();
  constructor(graph: DependencyGraph, cwd: string = process.cwd()) {
    this.graph = graph;
    this.cwd = cwd;
  }
  analyze(): ScanResult {
    this.markBuildToolsAndConfigs();
    const nodes = this.graph.getNodes();
    for (const [file, node] of nodes) {
      if (node.isEntryPoint) {
        this.markReachable(file);
      }
    }
    return {
      unusedPackages: this.findUnusedPackages(),
      unusedImports: this.findUnusedImports(),
      unusedExports: this.findUnusedExports(),
      unusedFunctions: this.findUnusedFunctions(),
      unusedVariables: this.findUnusedVariables(),
      unusedFiles: this.findUnusedFiles(),
      unusedConfigs: this.findUnusedConfigs(),
      unusedScripts: this.findUnusedScripts(),
    };
  }
  private markBuildToolsAndConfigs(): void {
    const packageJsonPath = path.join(this.cwd, "package.json");
    if (!fs.existsSync(packageJsonPath)) {
      return;
    }
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
      const scripts = packageJson.scripts || {};
      const toolConfigMap: Record<string, string[]> = {
        tsup: [
          "tsup.config.ts",
          "tsup.config.js",
          "tsup.config.mjs",
          "tsup.config.cjs",
        ],
        vite: ["vite.config.ts", "vite.config.js", "vite.config.mjs"],
        webpack: ["webpack.config.js", "webpack.config.ts"],
        rollup: ["rollup.config.js", "rollup.config.ts"],
        esbuild: ["esbuild.config.js", "esbuild.config.ts"],
        prettier: [
          ".prettierrc",
          ".prettierrc.js",
          ".prettierrc.json",
          "prettier.config.js",
        ],
        eslint: [
          ".eslintrc",
          ".eslintrc.js",
          ".eslintrc.json",
          "eslint.config.js",
        ],
        jest: ["jest.config.js", "jest.config.ts", "jest.config.json"],
        vitest: ["vitest.config.ts", "vitest.config.js"],
        vitepress: [".vitepress/config.ts", ".vitepress/config.js"],
      };
      const scriptContent = Object.values(scripts).join(" ");
      for (const scriptCommand of Object.values(scripts)) {
        const command = String(scriptCommand);
        const toolPatterns = [
          /\btsup\b/g,
          /\bprettier\b/g,
          /\btypescript\b/g,
          /\btsc\b/g,
          /\bterser\b/g,
          /\besbuild\b/g,
          /\bwebpack\b/g,
          /\bvite\b/g,
          /\brollup\b/g,
          /\bjest\b/g,
          /\bvitest\b/g,
          /\beslint\b/g,
          /\bvitepress\b/g,
          /\btsx\b/g,
        ];
        for (const pattern of toolPatterns) {
          if (pattern.test(command)) {
            const packageMap: Record<string, string> = {
              tsup: "tsup",
              prettier: "prettier",
              typescript: "typescript",
              tsc: "typescript",
              terser: "terser",
              esbuild: "esbuild",
              webpack: "webpack",
              vite: "vite",
              rollup: "rollup",
              jest: "jest",
              vitest: "vitest",
              eslint: "eslint",
              vitepress: "vitepress",
              tsx: "tsx",
            };
            const toolName = pattern.source
              .replace(/\\b/g, "")
              .replace(/\//g, "");
            const packageName = packageMap[toolName];
            if (packageName) {
              this.usedPackages.add(packageName);
              const configFiles = toolConfigMap[toolName] || [];
              for (const configFile of configFiles) {
                const configPath = path.join(this.cwd, configFile);
                if (fs.existsSync(configPath)) {
                  this.reachableFiles.add(configPath);
                }
              }
            }
          }
        }
      }
      if (
        scriptContent.includes("tsc") ||
        scriptContent.includes("typescript")
      ) {
        this.usedPackages.add("typescript");
        const tsconfigPath = path.join(this.cwd, "tsconfig.json");
        if (fs.existsSync(tsconfigPath)) {
          this.reachableFiles.add(tsconfigPath);
        }
      }
      if (scriptContent.includes("tsup")) {
        this.usedPackages.add("tsup");
        this.usedPackages.add("typescript");
        const tsupConfigs = [
          "tsup.config.ts",
          "tsup.config.js",
          "tsup.config.mjs",
          "tsup.config.cjs",
        ];
        for (const config of tsupConfigs) {
          const configPath = path.join(this.cwd, config);
          if (fs.existsSync(configPath)) {
            this.reachableFiles.add(configPath);
            try {
              const configContent = fs.readFileSync(configPath, "utf-8");
              if (
                configContent.includes("terser") ||
                configContent.includes("minify")
              ) {
                this.usedPackages.add("terser");
              }
            } catch {}
            break;
          }
        }
      }
    } catch {}
  }
  private markReachable(filePath: string): void {
    if (this.reachableFiles.has(filePath)) {
      return;
    }
    const node = this.graph.getNode(filePath);
    if (!node) return;
    this.reachableFiles.add(filePath);
    if (!this.reachableExports.has(filePath)) {
      this.reachableExports.set(filePath, new Set());
    }
    if (!this.reachableFunctions.has(filePath)) {
      this.reachableFunctions.set(filePath, new Set());
    }
    if (!this.reachableVariables.has(filePath)) {
      this.reachableVariables.set(filePath, new Set());
    }
    if (!this.importedSymbols.has(filePath)) {
      this.importedSymbols.set(filePath, new Set());
    }
    if (!this.usedImports.has(filePath)) {
      this.usedImports.set(filePath, new Set());
    }
    for (const [importPath, importInfo] of node.importDetails || new Map()) {
      if (!importPath.startsWith(".")) {
        const packageName = this.extractPackageName(importPath);
        if (packageName) {
          this.usedPackages.add(packageName);
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
          this.usedImports.get(filePath)!.add(importPath);
          continue;
        }
      }

      const resolved = this.graph.resolveImport(importPath, filePath);
      if (resolved) {
        this.usedImports.get(filePath)!.add(importPath);
        this.markReachable(resolved);
        const importedNode = this.graph.getNode(resolved);
        if (importedNode) {
          if (importInfo.isNamespace) {
            for (const exportName of importedNode.exports.keys()) {
              const reachableExports =
                this.reachableExports.get(resolved) || new Set();
              reachableExports.add(exportName);
              this.reachableExports.set(resolved, reachableExports);
              if (importedNode.functions.has(exportName)) {
                const reachableFunctions =
                  this.reachableFunctions.get(resolved) || new Set();
                reachableFunctions.add(exportName);
                this.reachableFunctions.set(resolved, reachableFunctions);
              }
              const reExport = importedNode.reExports?.get(exportName);
              if (reExport) {
                const sourceResolved = this.graph.resolveImport(
                  reExport.sourceFile,
                  resolved,
                );
                if (sourceResolved) {
                  const sourceReachableExports =
                    this.reachableExports.get(sourceResolved) || new Set();
                  sourceReachableExports.add(reExport.exportedName);
                  this.reachableExports.set(
                    sourceResolved,
                    sourceReachableExports,
                  );
                  const sourceNode = this.graph.getNode(sourceResolved);
                  if (sourceNode?.functions.has(reExport.exportedName)) {
                    const sourceReachableFunctions =
                      this.reachableFunctions.get(sourceResolved) || new Set();
                    sourceReachableFunctions.add(reExport.exportedName);
                    this.reachableFunctions.set(
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
                this.reachableExports.get(resolved) || new Set();
              reachableExports.add("default");
              this.reachableExports.set(resolved, reachableExports);
            }
            for (const [exportName, exportInfo] of importedNode.exports) {
              if (exportInfo.type === "default") {
                const reachableExports =
                  this.reachableExports.get(resolved) || new Set();
                reachableExports.add(exportName);
                this.reachableExports.set(resolved, reachableExports);
              }
            }
          } else if (importInfo.specifiers.size > 0) {
            const reachableExports =
              this.reachableExports.get(resolved) || new Set();
            for (const specifier of importInfo.specifiers) {
              if (importedNode.exports.has(specifier)) {
                reachableExports.add(specifier);
                if (importedNode.functions.has(specifier)) {
                  const reachableFunctions =
                    this.reachableFunctions.get(resolved) || new Set();
                  reachableFunctions.add(specifier);
                  this.reachableFunctions.set(resolved, reachableFunctions);
                }
                const exportInfo = importedNode.exports.get(specifier);
                if (exportInfo && exportInfo.type === "named") {
                  reachableExports.add(specifier);
                }
              }
              const reExport = importedNode.reExports?.get(specifier);
              if (reExport) {
                const sourceResolved = this.graph.resolveImport(
                  reExport.sourceFile,
                  resolved,
                );
                if (sourceResolved) {
                  const sourceReachableExports =
                    this.reachableExports.get(sourceResolved) || new Set();
                  sourceReachableExports.add(reExport.exportedName);
                  this.reachableExports.set(
                    sourceResolved,
                    sourceReachableExports,
                  );
                  const sourceNode = this.graph.getNode(sourceResolved);
                  if (sourceNode?.functions.has(reExport.exportedName)) {
                    const sourceReachableFunctions =
                      this.reachableFunctions.get(sourceResolved) || new Set();
                    sourceReachableFunctions.add(reExport.exportedName);
                    this.reachableFunctions.set(
                      sourceResolved,
                      sourceReachableFunctions,
                    );
                  }
                }
              }
              if (importedNode.exports.has("*")) {
                for (const [importPath] of importedNode.importDetails ||
                  new Map()) {
                  if (importPath.startsWith(".")) {
                    const sourceResolved = this.graph.resolveImport(
                      importPath,
                      resolved,
                    );
                    if (sourceResolved) {
                      const sourceNode = this.graph.getNode(sourceResolved);
                      if (sourceNode?.exports.has(specifier)) {
                        const sourceReachableExports =
                          this.reachableExports.get(sourceResolved) ||
                          new Set();
                        sourceReachableExports.add(specifier);
                        this.reachableExports.set(
                          sourceResolved,
                          sourceReachableExports,
                        );
                        if (sourceNode.functions.has(specifier)) {
                          const sourceReachableFunctions =
                            this.reachableFunctions.get(sourceResolved) ||
                            new Set();
                          sourceReachableFunctions.add(specifier);
                          this.reachableFunctions.set(
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
            this.reachableExports.set(resolved, reachableExports);
            for (const specifier of importInfo.specifiers) {
              this.importedSymbols.get(filePath)!.add(specifier);
            }
          }
        }
      }
    }
    for (const importPath of node.imports) {
      if (!this.usedImports.get(filePath)!.has(importPath)) {
        if (!importPath.startsWith(".")) {
          const packageName = this.extractPackageName(importPath);
          if (packageName) {
            this.usedPackages.add(packageName);
          }
        }
        const resolved = this.graph.resolveImport(importPath, filePath);
        if (resolved) {
          this.usedImports.get(filePath)!.add(importPath);
          this.markReachable(resolved);
        }
      }
    }
    if (node.isEntryPoint) {
      for (const funcName of node.functions.keys()) {
        this.reachableFunctions.get(filePath)!.add(funcName);
      }
    }
    const reachableExports = this.reachableExports.get(filePath) || new Set();
    for (const [funcName, funcInfo] of node.functions) {
      if (funcInfo.isExported && reachableExports.has(funcName)) {
        this.reachableFunctions.get(filePath)!.add(funcName);
      }
    }
    const functionCalls = node.functionCalls || new Set<string>();
    const variableReferences = node.variableReferences || new Set<string>();
    const jsxElements = node.jsxElements || new Set<string>();
    for (const funcCall of functionCalls) {
      if (node.functions.has(funcCall)) {
        this.reachableFunctions.get(filePath)!.add(funcCall);
      }
    }
    for (const jsxElement of jsxElements) {
      if (node.functions.has(jsxElement)) {
        this.reachableFunctions.get(filePath)!.add(jsxElement);
      }
      if (node.classes.has(jsxElement)) {
        const reachableClasses =
          this.reachableFunctions.get(filePath) || new Set();
        reachableClasses.add(jsxElement);
        this.reachableFunctions.set(filePath, reachableClasses);
      }
      const reachableExports = this.reachableExports.get(filePath) || new Set();
      if (node.exports.has(jsxElement)) {
        reachableExports.add(jsxElement);
        this.reachableExports.set(filePath, reachableExports);
      }
    }
    for (const [importPath, importInfo] of node.importDetails || new Map()) {
      const resolved = this.graph.resolveImport(importPath, filePath);
      if (resolved) {
        const importedNode = this.graph.getNode(resolved);
        if (importedNode && importInfo.specifiers.size > 0) {
          for (const specifier of importInfo.specifiers) {
            if (
              functionCalls.has(specifier) ||
              variableReferences.has(specifier) ||
              jsxElements.has(specifier)
            ) {
              if (importedNode.functions.has(specifier)) {
                const sourceReachableFunctions =
                  this.reachableFunctions.get(resolved) || new Set();
                sourceReachableFunctions.add(specifier);
                this.reachableFunctions.set(resolved, sourceReachableFunctions);
                const sourceReachableExports =
                  this.reachableExports.get(resolved) || new Set();
                sourceReachableExports.add(specifier);
                this.reachableExports.set(resolved, sourceReachableExports);
              }
              const reExportForCall = importedNode.reExports?.get(specifier);
              if (reExportForCall) {
                const sourceResolved = this.graph.resolveImport(
                  reExportForCall.sourceFile,
                  resolved,
                );
                if (sourceResolved) {
                  const sourceNode = this.graph.getNode(sourceResolved);
                  if (sourceNode?.functions.has(reExportForCall.exportedName)) {
                    const sourceReachableFunctions =
                      this.reachableFunctions.get(sourceResolved) || new Set();
                    sourceReachableFunctions.add(reExportForCall.exportedName);
                    this.reachableFunctions.set(
                      sourceResolved,
                      sourceReachableFunctions,
                    );
                    const sourceReachableExports =
                      this.reachableExports.get(sourceResolved) || new Set();
                    sourceReachableExports.add(reExportForCall.exportedName);
                    this.reachableExports.set(
                      sourceResolved,
                      sourceReachableExports,
                    );
                  }
                }
              } else if (importedNode.exports.has("*")) {
                for (const [importPath] of importedNode.importDetails ||
                  new Map()) {
                  if (importPath.startsWith(".")) {
                    const sourceResolved = this.graph.resolveImport(
                      importPath,
                      resolved,
                    );
                    if (sourceResolved) {
                      const sourceNode = this.graph.getNode(sourceResolved);
                      if (
                        sourceNode &&
                        (sourceNode.exports.has(specifier) ||
                          sourceNode.functions.has(specifier))
                      ) {
                        const sourceReachableExports =
                          this.reachableExports.get(sourceResolved) ||
                          new Set();
                        sourceReachableExports.add(specifier);
                        this.reachableExports.set(
                          sourceResolved,
                          sourceReachableExports,
                        );
                        if (sourceNode.functions.has(specifier)) {
                          const sourceReachableFunctions =
                            this.reachableFunctions.get(sourceResolved) ||
                            new Set();
                          sourceReachableFunctions.add(specifier);
                          this.reachableFunctions.set(
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
    for (const varRef of node.variableReferences) {
      this.reachableVariables.get(filePath)!.add(varRef);
    }
  }
  private extractPackageName(importPath: string): string | null {
    const parts = importPath.split("/");
    if (parts[0].startsWith("@")) {
      return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : null;
    }
    return parts[0] || null;
  }
  private findUnusedPackages(): UnusedPackage[] {
    const packageJsonPath = path.join(this.cwd, "package.json");
    if (!fs.existsSync(packageJsonPath)) {
      return [];
    }
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
      const dependencies = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
        ...packageJson.peerDependencies,
      };
      const hasTypeScript =
        this.usedPackages.has("typescript") ||
        Object.keys(dependencies).includes("typescript");
      const unused: UnusedPackage[] = [];
      for (const [name, version] of Object.entries(dependencies)) {
        if (name.startsWith("@types/") && hasTypeScript) {
          continue;
        }
        if (!this.usedPackages.has(name)) {
          unused.push({
            name,
            version: version as string,
          });
        }
      }
      return unused;
    } catch {
      return [];
    }
  }
  private findUnusedImports(): UnusedImport[] {
    const unused: UnusedImport[] = [];
    const nodes = this.graph.getNodes();
    for (const [file, node] of nodes) {
      if (node.importDetails) {
        for (const [importPath, importInfo] of node.importDetails) {
          if (importPath.startsWith(".")) {
            const importExt = path.extname(importPath).toLowerCase();
            const isAssetImport =
              [".css", ".scss", ".sass", ".less", ".styl"].includes(
                importExt,
              ) ||
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

            const resolved = this.graph.resolveImport(importPath, file);
            if (!resolved || !this.reachableFiles.has(resolved)) {
              unused.push({
                file,
                importPath,
                line: importInfo.line,
                column: importInfo.column,
              });
            } else {
              const usedImports = this.usedImports.get(file) || new Set();
              if (!usedImports.has(importPath)) {
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
                const importedSymbols =
                  this.importedSymbols.get(file) || new Set();
                const unusedSpecifiers: string[] = [];
                for (const specifier of importInfo.specifiers) {
                  if (!importedSymbols.has(specifier)) {
                    unusedSpecifiers.push(specifier);
                  }
                }
              }
            }
          }
        }
      }
      for (const importPath of node.imports) {
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

          const resolved = this.graph.resolveImport(importPath, file);
          const usedImports = this.usedImports.get(file) || new Set();
          if (
            (!resolved || !this.reachableFiles.has(resolved)) &&
            !usedImports.has(importPath)
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
  private findUnusedExports(): UnusedExport[] {
    const unused: UnusedExport[] = [];
    const nodes = this.graph.getNodes();
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
      const isConfigFile = configFilePatterns.some((pattern) =>
        pattern.test(file),
      );
      if (isConfigFile) {
        continue;
      }
      const isVitePressTheme = isVitePressThemeFile(file);
      const reachableExports = this.reachableExports.get(file) || new Set();
      for (const [exportName, exportInfo] of node.exports) {
        if (exportName === "*") {
          continue;
        }
        if (!reachableExports.has(exportName)) {
          const isTypeExport =
            exportInfo.type === "named" &&
            exportName[0] === exportName[0].toUpperCase();
          const isVitePressDefaultExport =
            isVitePressTheme && exportInfo.type === "default";
          if (
            !node.isEntryPoint &&
            !isTypeExport &&
            !isVitePressDefaultExport
          ) {
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
  private findUnusedFunctions(): UnusedFunction[] {
    const unused: UnusedFunction[] = [];
    const nodes = this.graph.getNodes();
    for (const [file, node] of nodes) {
      const reachableFunctions = this.reachableFunctions.get(file) || new Set();
      const reachableExports = this.reachableExports.get(file) || new Set();
      const functionCalls = node.functionCalls || new Set<string>();
      const variableReferences = node.variableReferences || new Set<string>();
      const jsxElements = node.jsxElements || new Set<string>();
      for (const [funcName, funcInfo] of node.functions) {
        const isFunctionUsed = reachableFunctions.has(funcName);
        const isExportUsed =
          funcInfo.isExported && reachableExports.has(funcName);
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
  private findUnusedVariables(): UnusedVariable[] {
    const unused: UnusedVariable[] = [];
    const nodes = this.graph.getNodes();
    for (const [file, node] of nodes) {
      if (!this.reachableFiles.has(file)) {
        continue;
      }
      const reachableVariables = this.reachableVariables.get(file) || new Set();
      const variableReferences = node.variableReferences || new Set<string>();
      for (const [varName, varInfo] of node.variables) {
        if (varInfo.isExported) {
          continue;
        }
        if (!reachableVariables.has(varName)) {
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
  private findUnusedFiles(): UnusedFile[] {
    const unused: UnusedFile[] = [];
    const allFiles = this.graph.getAllFiles();
    const commonConfigFiles = [
      "tsconfig.json",
      "package.json",
      ".gitignore",
      ".npmignore",
      "README.md",
      "LICENSE",
    ];

    const isConventionBasedFile = (filePath: string): boolean => {
      const normalized = filePath.replace(/\\/g, "/");
      if (
        normalized.includes("/.vitepress/theme/index.") ||
        normalized.includes("\\.vitepress\\theme\\index.")
      ) {
        return true;
      }
      if (
        normalized.includes("/app/layout.") ||
        normalized.includes("/app/page.") ||
        normalized.includes("/app/loading.") ||
        normalized.includes("/app/error.") ||
        normalized.includes("/app/not-found.")
      ) {
        return true;
      }
      if (normalized.match(/\/routes\/.*\.(tsx?|jsx?)$/)) {
        return true;
      }
      return false;
    };

    for (const file of allFiles) {
      if (this.reachableFiles.has(file)) {
        continue;
      }
      const fileName = path.basename(file);
      if (commonConfigFiles.includes(fileName)) {
        continue;
      }
      if (isConventionBasedFile(file)) {
        continue;
      }
      unused.push({ file });
    }
    return unused;
  }
  private findUnusedConfigs(): UnusedConfig[] {
    const unused: UnusedConfig[] = [];
    const packageJsonPath = path.join(this.cwd, "package.json");
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(
          fs.readFileSync(packageJsonPath, "utf-8"),
        );
        const usedKeys = new Set<string>();
        const alwaysUsedKeys = new Set([
          "name",
          "version",
          "type",
          "main",
          "bin",
          "scripts",
          "dependencies",
          "devDependencies",
          "peerDependencies",
        ]);
        const metadataKeys = new Set([
          "description",
          "keywords",
          "author",
          "license",
          "repository",
          "homepage",
          "bugs",
          "funding",
        ]);
        const isPublished =
          "publishConfig" in packageJson || "repository" in packageJson;
        for (const key of Object.keys(packageJson)) {
          if (alwaysUsedKeys.has(key)) {
            usedKeys.add(key);
            continue;
          }
          if (metadataKeys.has(key)) {
            const value = packageJson[key];
            if (
              isPublished ||
              (value &&
                (typeof value === "string"
                  ? value.trim()
                  : Object.keys(value).length > 0))
            ) {
              usedKeys.add(key);
            } else {
              unused.push({
                file: packageJsonPath,
                configKey: key,
              });
            }
            continue;
          }
          switch (key) {
            case "exports":
              if (packageJson.type === "module" || packageJson.exports) {
                usedKeys.add(key);
              } else {
                unused.push({
                  file: packageJsonPath,
                  configKey: key,
                });
              }
              break;
            case "files":
              if (isPublished || "publishConfig" in packageJson) {
                usedKeys.add(key);
              } else {
                const files = packageJson.files;
                if (Array.isArray(files) && files.length > 0) {
                  usedKeys.add(key);
                } else {
                  unused.push({
                    file: packageJsonPath,
                    configKey: key,
                  });
                }
              }
              break;
            case "engines":
            case "os":
            case "cpu":
              const constraintValue = packageJson[key];
              if (constraintValue && Object.keys(constraintValue).length > 0) {
                usedKeys.add(key);
              } else {
                unused.push({
                  file: packageJsonPath,
                  configKey: key,
                });
              }
              break;
            case "private":
              usedKeys.add(key);
              break;
            case "workspaces":
            case "workspace":
              const workspaceValue = packageJson[key];
              if (
                workspaceValue &&
                (Array.isArray(workspaceValue)
                  ? workspaceValue.length > 0
                  : true)
              ) {
                usedKeys.add(key);
              } else {
                unused.push({
                  file: packageJsonPath,
                  configKey: key,
                });
              }
              break;
            default:
              const standardNpmFields = new Set([
                "publishConfig",
                "preferGlobal",
                "bundleDependencies",
                "bundledDependencies",
                "optionalDependencies",
                "peerDependenciesMeta",
                "overrides",
                "resolutions",
              ]);
              if (standardNpmFields.has(key)) {
                usedKeys.add(key);
              } else {
                unused.push({
                  file: packageJsonPath,
                  configKey: key,
                });
              }
          }
        }
      } catch (error) {}
    }
    const tsconfigPath = path.join(this.cwd, "tsconfig.json");
    if (fs.existsSync(tsconfigPath)) {
      try {
        const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, "utf-8"));
        const usedOptions = new Set<string>();
        const alwaysUsedOptions = new Set([
          "target",
          "module",
          "lib",
          "moduleResolution",
          "strict",
          "esModuleInterop",
          "skipLibCheck",
          "forceConsistentCasingInFileNames",
          "outDir",
          "rootDir",
          "declaration",
          "declarationMap",
          "sourceMap",
          "jsx",
          "jsxFactory",
          "jsxFragmentFactory",
        ]);
        if (tsconfig.compilerOptions) {
          for (const [option, value] of Object.entries(
            tsconfig.compilerOptions,
          )) {
            if (alwaysUsedOptions.has(option)) {
              usedOptions.add(option);
              continue;
            }
            switch (option) {
              case "baseUrl":
                if (value && typeof value === "string" && value.trim() !== "") {
                  usedOptions.add(option);
                } else {
                  unused.push({
                    file: tsconfigPath,
                    configKey: `compilerOptions.${option}`,
                  });
                }
                break;
              case "paths":
                if (
                  value &&
                  typeof value === "object" &&
                  Object.keys(value).length > 0
                ) {
                  usedOptions.add(option);
                } else {
                  unused.push({
                    file: tsconfigPath,
                    configKey: `compilerOptions.${option}`,
                  });
                }
                break;
              case "types":
                if (value && Array.isArray(value) && value.length > 0) {
                  usedOptions.add(option);
                } else if (
                  value &&
                  typeof value === "string" &&
                  value.trim() !== ""
                ) {
                  usedOptions.add(option);
                } else {
                  unused.push({
                    file: tsconfigPath,
                    configKey: `compilerOptions.${option}`,
                  });
                }
                break;
              case "typeRoots":
                if (value && Array.isArray(value) && value.length > 0) {
                  usedOptions.add(option);
                } else {
                  unused.push({
                    file: tsconfigPath,
                    configKey: `compilerOptions.${option}`,
                  });
                }
                break;
              case "experimentalDecorators":
              case "emitDecoratorMetadata":
                if (value === true) {
                  const hasDecorators = this.checkForDecorators();
                  if (!hasDecorators) {
                    unused.push({
                      file: tsconfigPath,
                      configKey: `compilerOptions.${option}`,
                    });
                  } else {
                    usedOptions.add(option);
                  }
                } else if (value === false) {
                  usedOptions.add(option);
                } else {
                  unused.push({
                    file: tsconfigPath,
                    configKey: `compilerOptions.${option}`,
                  });
                }
                break;
              default:
                usedOptions.add(option);
            }
          }
        }
        if (tsconfig.include) {
          const include = Array.isArray(tsconfig.include)
            ? tsconfig.include
            : [tsconfig.include];
          if (
            include.length === 0 ||
            (include.length === 1 && include[0] === "**/*")
          ) {
            unused.push({
              file: tsconfigPath,
              configKey: "include",
            });
          }
        }
        if (tsconfig.exclude) {
          const exclude = Array.isArray(tsconfig.exclude)
            ? tsconfig.exclude
            : [tsconfig.exclude];
          const defaultExclude = ["node_modules"];
          const isOnlyDefaults = exclude.every((e: string) =>
            defaultExclude.includes(e),
          );
          if (isOnlyDefaults) {
            unused.push({
              file: tsconfigPath,
              configKey: "exclude",
            });
          }
        }
      } catch (error) {}
    }
    const configFiles = [
      { name: ".prettierrc", tool: "prettier" },
      { name: "prettier.config.js", tool: "prettier" },
      { name: ".eslintrc", tool: "eslint" },
      { name: "eslint.config.js", tool: "eslint" },
      { name: "jest.config.js", tool: "jest" },
      { name: "vitest.config.ts", tool: "vitest" },
    ];
    for (const configFile of configFiles) {
      const configPath = path.join(this.cwd, configFile.name);
      if (fs.existsSync(configPath) && this.reachableFiles.has(configPath)) {
        const toolPackage = configFile.tool;
        if (!this.usedPackages.has(toolPackage)) {
          unused.push({
            file: configPath,
            configKey: "file",
          });
        }
      }
    }
    return unused;
  }
  private checkForDecorators(): boolean {
    const nodes = this.graph.getNodes();
    for (const [file] of nodes) {
      if (this.reachableFiles.has(file)) {
        try {
          const content = fs.readFileSync(file, "utf-8");
          if (/\s@\w+\s*\(/m.test(content) || /\s@\w+\s*$/m.test(content)) {
            return true;
          }
        } catch {}
      }
    }
    return false;
  }
  private findUnusedScripts(): UnusedScript[] {
    const packageJsonPath = path.join(this.cwd, "package.json");
    if (!fs.existsSync(packageJsonPath)) {
      return [];
    }
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
      const scripts = packageJson.scripts || {};
      const unused: UnusedScript[] = [];
      const usedScripts = new Set<string>();
      const commonScripts = new Set([
        "prepublish",
        "prepublishOnly",
        "prepack",
        "postpack",
        "publish",
        "postpublish",
        "preinstall",
        "install",
        "postinstall",
        "preuninstall",
        "uninstall",
        "postuninstall",
        "preversion",
        "version",
        "postversion",
        "pretest",
        "test",
        "posttest",
        "prestop",
        "stop",
        "poststop",
        "prestart",
        "start",
        "poststart",
        "prerestart",
        "restart",
        "postrestart",
        "preshrinkwrap",
        "shrinkwrap",
        "postshrinkwrap",
        "dev",
        "build",
        "format",
        "lint",
        "typecheck",
      ]);
      for (const [scriptName, scriptCommand] of Object.entries(scripts)) {
        const command = String(scriptCommand);
        const isReferenced = Object.entries(scripts).some(
          ([otherName, otherCmd]) =>
            otherName !== scriptName &&
            (String(otherCmd).includes(`npm run ${scriptName}`) ||
              String(otherCmd).includes(`npm ${scriptName}`) ||
              String(otherCmd).includes(`yarn ${scriptName}`) ||
              String(otherCmd).includes(`pnpm ${scriptName}`) ||
              String(otherCmd).includes(`bun run ${scriptName}`)),
        );
        if (commonScripts.has(scriptName)) {
          usedScripts.add(scriptName);
          continue;
        }
        if (packageJson.bin) {
          const binScripts =
            typeof packageJson.bin === "string"
              ? [packageJson.bin]
              : Object.values(packageJson.bin);
          const binScriptNames = binScripts.map((b: string) =>
            path.basename(b as string),
          );
          if (binScriptNames.includes(scriptName)) {
            usedScripts.add(scriptName);
            continue;
          }
        }
        if (isReferenced) {
          usedScripts.add(scriptName);
          continue;
        }
        const toolPatterns = [
          /\btsup\b/g,
          /\bprettier\b/g,
          /\btypescript\b/g,
          /\btsc\b/g,
          /\bterser\b/g,
          /\besbuild\b/g,
          /\bwebpack\b/g,
          /\bvite\b/g,
          /\brollup\b/g,
          /\bjest\b/g,
          /\bvitest\b/g,
          /\beslint\b/g,
          /\bvitepress\b/g,
          /\btsx\b/g,
        ];
        let hasTool = false;
        for (const pattern of toolPatterns) {
          if (pattern.test(command)) {
            hasTool = true;
            const toolName = pattern.source
              .replace(/\\b/g, "")
              .replace(/\//g, "");
            const packageMap: Record<string, string> = {
              tsup: "tsup",
              prettier: "prettier",
              typescript: "typescript",
              tsc: "typescript",
              terser: "terser",
              esbuild: "esbuild",
              webpack: "webpack",
              vite: "vite",
              rollup: "rollup",
              jest: "jest",
              vitest: "vitest",
              eslint: "eslint",
              vitepress: "vitepress",
              tsx: "tsx",
            };
            const packageName = packageMap[toolName];
            if (packageName) {
              this.usedPackages.add(packageName);
            }
            break;
          }
        }
        if (!hasTool && !usedScripts.has(scriptName)) {
          unused.push({ scriptName });
        }
      }
      return unused;
    } catch {
      return [];
    }
  }
}
