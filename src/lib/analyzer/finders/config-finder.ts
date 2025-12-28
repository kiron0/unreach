import * as fs from "fs";
import * as path from "path";
import type { UnusedConfig } from "../../../types/index.js";
import type { DependencyGraph } from "../../graph.js";
import { checkForDecorators } from "../utils.js";

export function findUnusedConfigs(
  cwd: string,
  graph: DependencyGraph,
  reachableFiles: Set<string>,
  usedPackages: Set<string>,
): UnusedConfig[] {
  const unused: UnusedConfig[] = [];
  const packageJsonPath = path.join(cwd, "package.json");
  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
      const usedKeys = new Set<string>();
      const alwaysUsedKeys = new Set([
        "name",
        "version",
        "type",
        "main",
        "types",
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
              (Array.isArray(workspaceValue) ? workspaceValue.length > 0 : true)
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
  const tsconfigPath = path.join(cwd, "tsconfig.json");
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
                const hasDecorators = checkForDecorators(graph, reachableFiles);
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
    const configPath = path.join(cwd, configFile.name);
    if (fs.existsSync(configPath) && reachableFiles.has(configPath)) {
      const toolPackage = configFile.tool;
      if (!usedPackages.has(toolPackage)) {
        unused.push({
          file: configPath,
          configKey: "file",
        });
      }
    }
  }
  return unused;
}
