import * as fs from "fs";
import * as path from "path";

export interface UnreachConfig {
  ignore?: {
    files?: string[];
    packages?: string[];
    exports?: string[];
    functions?: string[];
    variables?: string[];
    imports?: string[];
    types?: string[];
    cssClasses?: string[];
    assets?: string[];
  };
  entryPoints?: string[];
  excludePatterns?: string[];
  rules?: {
    unusedPackages?: boolean;
    unusedImports?: boolean;
    unusedExports?: boolean;
    unusedFunctions?: boolean;
    unusedVariables?: boolean;
    unusedFiles?: boolean;
    unusedConfigs?: boolean;
    unusedScripts?: boolean;
    unusedTypes?: boolean;
    unusedCSSClasses?: boolean;
    unusedAssets?: boolean;
  };
  fix?: {
    enabled?: boolean;
    backup?: boolean;
    interactive?: boolean;
  };
}

export class ConfigLoader {
  private cwd: string;

  constructor(cwd: string) {
    this.cwd = cwd;
  }

  load(): UnreachConfig | null {
    const configPaths = [
      path.join(this.cwd, ".unreachrc.json"),
      path.join(this.cwd, "unreach.config.json"),
      path.join(this.cwd, ".unreachrc.js"),
      path.join(this.cwd, "unreach.config.js"),
    ];

    for (const configPath of configPaths) {
      if (fs.existsSync(configPath)) {
        try {
          if (configPath.endsWith(".json")) {
            const content = fs.readFileSync(configPath, "utf-8");
            return JSON.parse(content);
          } else if (configPath.endsWith(".js")) {
            try {
              const content = fs.readFileSync(configPath, "utf-8");
              if (
                content.includes("export default") ||
                content.includes("module.exports")
              ) {
                continue;
              }
            } catch {
              continue;
            }
          }
        } catch (error) {
          continue;
        }
      }
    }

    return null;
  }

  mergeWithDefaults(config: UnreachConfig | null): UnreachConfig {
    return {
      ignore: {
        files: config?.ignore?.files || [],
        packages: config?.ignore?.packages || [],
        exports: config?.ignore?.exports || [],
        functions: config?.ignore?.functions || [],
        variables: config?.ignore?.variables || [],
        imports: config?.ignore?.imports || [],
        types: config?.ignore?.types || [],
        cssClasses: config?.ignore?.cssClasses || [],
        assets: config?.ignore?.assets || [],
      },
      entryPoints: config?.entryPoints,
      excludePatterns: config?.excludePatterns || [],
      rules: {
        unusedPackages: config?.rules?.unusedPackages ?? true,
        unusedImports: config?.rules?.unusedImports ?? true,
        unusedExports: config?.rules?.unusedExports ?? true,
        unusedFunctions: config?.rules?.unusedFunctions ?? true,
        unusedVariables: config?.rules?.unusedVariables ?? true,
        unusedFiles: config?.rules?.unusedFiles ?? true,
        unusedConfigs: config?.rules?.unusedConfigs ?? true,
        unusedScripts: config?.rules?.unusedScripts ?? true,
        unusedTypes: config?.rules?.unusedTypes ?? true,
        unusedCSSClasses: config?.rules?.unusedCSSClasses ?? true,
        unusedAssets: config?.rules?.unusedAssets ?? true,
      },
      fix: {
        enabled: config?.fix?.enabled ?? false,
        backup: config?.fix?.backup ?? true,
        interactive: config?.fix?.interactive ?? false,
      },
    };
  }

  matchesIgnorePattern(value: string, patterns: string[]): boolean {
    for (const pattern of patterns) {
      if (this.matchGlob(value, pattern)) {
        return true;
      }
    }
    return false;
  }

  shouldExcludeFile(filePath: string, patterns: string[]): boolean {
    const normalizedPath = filePath.replace(/\\/g, "/");
    const relativePath = path.relative(this.cwd, filePath).replace(/\\/g, "/");

    for (const pattern of patterns) {
      if (
        this.matchGlob(normalizedPath, pattern) ||
        this.matchGlob(relativePath, pattern)
      ) {
        return true;
      }
    }
    return false;
  }

  private matchGlob(value: string, pattern: string): boolean {
    const escaped = pattern
      .replace(/[.+^${}()|[\]\\]/g, "\\$&")
      .replace(/\*/g, ".*")
      .replace(/\?/g, ".");

    const regex = new RegExp(`^${escaped}$`, "i");
    return regex.test(value);
  }
}
