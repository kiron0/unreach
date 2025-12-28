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
  testFileDetection?: {
    enabled?: boolean;
    patterns?: string[];
  };
  maxFileSize?: number;
  watchRateLimit?: number;
}

export class ConfigValidationError extends Error {
  constructor(
    message: string,
    public path?: string,
  ) {
    super(message);
    this.name = "ConfigValidationError";
  }
}

export class ConfigLoader {
  private cwd: string;

  constructor(cwd: string) {
    this.cwd = cwd;
  }

  load(skipConfig: boolean = false): UnreachConfig | null {
    if (skipConfig) {
      return null;
    }

    const configPaths = [
      path.join(this.cwd, "unreach.config.js"),
      path.join(this.cwd, "unreach.config.ts"),
    ];

    for (const configPath of configPaths) {
      if (fs.existsSync(configPath)) {
        try {
          if (configPath.endsWith(".js")) {
            const resolvedPath = path.resolve(configPath);
            if (require.cache[resolvedPath]) {
              delete require.cache[resolvedPath];
            }
            const config = require(resolvedPath);
            const resolvedConfig =
              config.default !== undefined
                ? config.default
                : config.module?.exports !== undefined
                  ? config.module.exports
                  : config;
            this.validateConfig(resolvedConfig, configPath);
            return resolvedConfig;
          } else if (configPath.endsWith(".ts")) {
            try {
              require.resolve("ts-node/register");
              const resolvedPath = path.resolve(configPath);
              if (require.cache[resolvedPath]) {
                delete require.cache[resolvedPath];
              }
              require("ts-node/register");
              const config = require(resolvedPath);
              const resolvedConfig =
                config.default !== undefined
                  ? config.default
                  : config.module?.exports !== undefined
                    ? config.module.exports
                    : config;
              this.validateConfig(resolvedConfig, configPath);
              return resolvedConfig;
            } catch (error) {
              throw new ConfigValidationError(
                `TypeScript config files require 'ts-node'. Install it with: npm install -D ts-node\nOriginal error: ${error instanceof Error ? error.message : String(error)}`,
                configPath,
              );
            }
          }
        } catch (error) {
          if (error instanceof ConfigValidationError) {
            throw error;
          }
          continue;
        }
      }
    }

    return null;
  }

  private validateConfig(
    config: unknown,
    configPath: string,
  ): asserts config is UnreachConfig {
    if (typeof config !== "object" || config === null) {
      throw new ConfigValidationError(
        `Configuration must be an object. Found: ${typeof config}`,
        configPath,
      );
    }

    const cfg = config as Record<string, unknown>;
    const errors: string[] = [];

    if (cfg.ignore !== undefined) {
      if (typeof cfg.ignore !== "object" || cfg.ignore === null) {
        errors.push('"ignore" must be an object');
      } else {
        const ignore = cfg.ignore as Record<string, unknown>;
        const ignoreKeys = [
          "files",
          "packages",
          "exports",
          "functions",
          "variables",
          "imports",
          "types",
          "cssClasses",
          "assets",
        ];
        for (const key of ignoreKeys) {
          if (ignore[key] !== undefined) {
            if (!Array.isArray(ignore[key])) {
              errors.push(`"ignore.${key}" must be an array`);
            } else {
              const arr = ignore[key] as unknown[];
              for (const item of arr) {
                if (typeof item !== "string") {
                  errors.push(`"ignore.${key}" must contain only strings`);
                  break;
                }
              }
            }
          }
        }
      }
    }

    if (cfg.entryPoints !== undefined) {
      if (!Array.isArray(cfg.entryPoints)) {
        errors.push('"entryPoints" must be an array');
      } else {
        const arr = cfg.entryPoints as unknown[];
        for (const entry of arr) {
          if (typeof entry !== "string") {
            errors.push('"entryPoints" must contain only strings');
            break;
          }
        }
      }
    }

    if (cfg.excludePatterns !== undefined) {
      if (!Array.isArray(cfg.excludePatterns)) {
        errors.push('"excludePatterns" must be an array');
      } else {
        const arr = cfg.excludePatterns as unknown[];
        for (const pattern of arr) {
          if (typeof pattern !== "string") {
            errors.push('"excludePatterns" must contain only strings');
            break;
          }
        }
      }
    }

    if (cfg.rules !== undefined) {
      if (typeof cfg.rules !== "object" || cfg.rules === null) {
        errors.push('"rules" must be an object');
      } else {
        const rules = cfg.rules as Record<string, unknown>;
        const ruleKeys = [
          "unusedPackages",
          "unusedImports",
          "unusedExports",
          "unusedFunctions",
          "unusedVariables",
          "unusedFiles",
          "unusedConfigs",
          "unusedScripts",
          "unusedTypes",
          "unusedCSSClasses",
          "unusedAssets",
        ];
        for (const key of ruleKeys) {
          if (rules[key] !== undefined) {
            if (typeof rules[key] !== "boolean") {
              errors.push(`"rules.${key}" must be a boolean`);
            }
          }
        }
      }
    }

    if (cfg.fix !== undefined) {
      if (typeof cfg.fix !== "object" || cfg.fix === null) {
        errors.push('"fix" must be an object');
      } else {
        const fix = cfg.fix as Record<string, unknown>;
        if (fix.enabled !== undefined && typeof fix.enabled !== "boolean") {
          errors.push('"fix.enabled" must be a boolean');
        }
        if (fix.backup !== undefined && typeof fix.backup !== "boolean") {
          errors.push('"fix.backup" must be a boolean');
        }
        if (
          fix.interactive !== undefined &&
          typeof fix.interactive !== "boolean"
        ) {
          errors.push('"fix.interactive" must be a boolean');
        }
      }
    }

    if (cfg.testFileDetection !== undefined) {
      if (
        typeof cfg.testFileDetection !== "object" ||
        cfg.testFileDetection === null
      ) {
        errors.push('"testFileDetection" must be an object');
      } else {
        const testFileDetection = cfg.testFileDetection as Record<
          string,
          unknown
        >;
        if (
          testFileDetection.enabled !== undefined &&
          typeof testFileDetection.enabled !== "boolean"
        ) {
          errors.push('"testFileDetection.enabled" must be a boolean');
        }
        if (testFileDetection.patterns !== undefined) {
          if (!Array.isArray(testFileDetection.patterns)) {
            errors.push('"testFileDetection.patterns" must be an array');
          } else {
            const arr = testFileDetection.patterns as unknown[];
            for (const pattern of arr) {
              if (typeof pattern !== "string") {
                errors.push(
                  '"testFileDetection.patterns" must contain only strings',
                );
                break;
              }
            }
          }
        }
      }
    }

    if (cfg.maxFileSize !== undefined) {
      if (typeof cfg.maxFileSize !== "number" || cfg.maxFileSize <= 0) {
        errors.push('"maxFileSize" must be a positive number');
      }
    }

    if (cfg.watchRateLimit !== undefined) {
      if (typeof cfg.watchRateLimit !== "number" || cfg.watchRateLimit <= 0) {
        errors.push('"watchRateLimit" must be a positive number');
      }
    }

    if (errors.length > 0) {
      const errorMessage = `Invalid configuration in ${path.relative(this.cwd, configPath)}:\n${errors.map((e) => `  - ${e}`).join("\n")}`;
      throw new ConfigValidationError(errorMessage, configPath);
    }
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
      testFileDetection: {
        enabled: config?.testFileDetection?.enabled ?? true,
        patterns: config?.testFileDetection?.patterns ?? [
          "**/*.test.{ts,tsx,js,jsx}",
          "**/*.spec.{ts,tsx,js,jsx}",
          "**/__tests__/**",
          "**/test/**",
          "**/tests/**",
        ],
      },
      maxFileSize: config?.maxFileSize ?? 10 * 1024 * 1024,
      watchRateLimit: config?.watchRateLimit ?? 1,
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
