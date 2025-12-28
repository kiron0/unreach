import chalk from "chalk";
import * as fs from "fs";
import * as path from "path";
import { isError, UnreachError } from "../core/errors.js";
import { ReachabilityAnalyzer } from "../lib/analyzer/index.js";
import {
  ConfigLoader,
  ConfigValidationError,
  type UnreachConfig,
} from "../lib/config.js";
import { EntryPointDetector } from "../lib/entry-points.js";
import { ResultFormatter } from "../lib/formatter.js";
import { DependencyGraph } from "../lib/graph.js";
import type { ScanOptions } from "../types/index.js";
import { BenchmarkTracker } from "../utils/benchmark.js";
import { getFormatExtension } from "../utils/export.js";
import {
  checkForUpdates,
  displayUpdateNotification,
} from "../utils/version-check.js";
import { getPackageVersion } from "../utils/version.js";
import { generateDependencyGraph } from "../utils/visualization.js";

function validateDirectory(
  dir: string,
): { path: string; error: null } | { path: null; error: UnreachError } {
  const targetPath = path.resolve(dir);
  if (!fs.existsSync(targetPath)) {
    return { path: null, error: UnreachError.directoryNotFound(dir) };
  }
  const stats = fs.statSync(targetPath);
  if (!stats.isDirectory() && !stats.isFile()) {
    return { path: null, error: UnreachError.notADirectory(dir) };
  }
  return { path: targetPath, error: null };
}
function formatError(error: UnreachError, debug: boolean = false): string {
  let message = `\n${chalk.red.bold("❌ Error:")} ${chalk.red(error.message)}\n`;
  if (error.suggestion) {
    message += `\n${chalk.yellow("💡 Suggestion:")}\n${chalk.gray(error.suggestion)}\n`;
  }
  if (error.cause) {
    message += `\n${chalk.blue("📋 Details:")} ${chalk.gray(error.cause.message)}\n`;
    if (debug && error.cause.stack) {
      message += `\n${chalk.gray("🔍 Stack Trace:")}\n${chalk.gray(error.cause.stack)}\n`;
    }
  }
  if (debug && error.stack) {
    message += `\n${chalk.gray("🔍 Error Stack:")}\n${chalk.gray(error.stack)}\n`;
  }
  return message;
}
export async function runScan(
  options: ScanOptions,
  isWatchMode: boolean = false,
): Promise<void | UnreachError> {
  const debug = options.debug || false;
  const verbose = options.verbose || false;
  const cwd = options.cwd || process.cwd();
  const validation = validateDirectory(cwd);
  if (validation.error) {
    return validation.error;
  }
  const targetPath = validation.path;
  try {
    const configLoader = new ConfigLoader(targetPath);
    let rawConfig: UnreachConfig | null = null;
    try {
      rawConfig = configLoader.load(options.noConfig || false);
    } catch (error) {
      if (error instanceof ConfigValidationError) {
        console.error(chalk.red.bold("\n❌ Configuration Error:"));
        console.error(chalk.red(error.message));
        if (error.path) {
          console.error(
            chalk.gray(`   File: ${path.relative(targetPath, error.path)}`),
          );
        }
        console.error(
          chalk.yellow(
            "\n💡 Suggestion: Fix the configuration file or use --no-config to ignore it.\n",
          ),
        );
        return UnreachError.configError(error.message);
      }
      throw error;
    }
    const config = configLoader.mergeWithDefaults(rawConfig);

    if (options.watch) {
      (options as any).watchRateLimit = config.watchRateLimit;
    }

    const hasExport = options.export !== undefined;
    const showProgress = !options.quiet && !hasExport && !options.noProgress;

    const benchmark = options.benchmark ? new BenchmarkTracker() : null;

    if (!options.quiet && !hasExport) {
      console.log(chalk.cyan.bold("🔍 Scanning codebase..."));
      if (rawConfig) {
        console.log(chalk.gray("   Using configuration file"));
      }
    }
    const graph = new DependencyGraph(targetPath, config);
    const entryDetector = new EntryPointDetector(targetPath);

    if (benchmark) {
      benchmark.startParse();
    }

    const configEntryPoints = (config.entryPoints || []).map((ep) =>
      path.isAbsolute(ep) ? ep : path.resolve(targetPath, ep),
    );
    const cliEntryPoints = options.entry
      ? Array.isArray(options.entry)
        ? options.entry.map((ep) =>
            path.isAbsolute(ep) ? ep : path.resolve(targetPath, ep),
          )
        : [
            path.isAbsolute(options.entry)
              ? options.entry
              : path.resolve(targetPath, options.entry),
          ]
      : [];
    const mergedEntryPoints =
      cliEntryPoints.length > 0
        ? cliEntryPoints
        : configEntryPoints.length > 0
          ? configEntryPoints
          : undefined;

    const entryPoints =
      await entryDetector.detectEntryPoints(mergedEntryPoints);
    if (options.entry) {
      const customEntries = Array.isArray(options.entry)
        ? options.entry
        : [options.entry];
      for (const entry of customEntries) {
        const entryPath = path.resolve(targetPath, entry);
        if (!fs.existsSync(entryPath)) {
          return UnreachError.entryPointNotFound(entry);
        }
      }
    }
    const useIncremental = options.noIncremental !== true;
    await graph.build(entryPoints, showProgress, useIncremental, verbose);

    const nodeCount = graph.getNodes().size;
    if (benchmark) {
      const cache = graph.getCache();
      const oldCache = cache.loadCache();
      let cacheHits = 0;
      let cacheMisses = 0;

      if (useIncremental && oldCache.size > 0) {
        const currentFiles = new Set(Array.from(graph.getNodes().keys()));
        for (const [file] of oldCache) {
          if (currentFiles.has(file)) {
            cacheHits++;
          }
        }
        cacheMisses = nodeCount - cacheHits;
      } else {
        cacheMisses = nodeCount;
      }

      benchmark.endParse(nodeCount, cacheHits, cacheMisses);
    }

    if (!options.quiet && !hasExport) {
      if (entryPoints.length === 0) {
        console.warn(
          chalk.yellow("⚠️  Warning:") +
            chalk.yellow(" No entry points found. Using default patterns..."),
        );
      } else {
        console.log("");
        console.log(
          chalk.green.bold(`📌 Found ${entryPoints.length} entry point(s):`),
        );
        for (const entry of entryPoints) {
          console.log(chalk.gray(`   • ${path.relative(targetPath, entry)}`));
        }
      }
    }
    if (!showProgress && !options.quiet && !hasExport) {
      console.log(
        chalk.gray(`   Analyzed ${chalk.white.bold(nodeCount)} file(s)\n`),
      );
    } else if (showProgress && !options.quiet && !hasExport) {
      console.log("");
    }
    if (!options.quiet && !hasExport) {
      console.log(chalk.blue("🔬 Analyzing reachability..."));
    }

    if (benchmark) {
      benchmark.startAnalysis();
    }

    const analyzer = new ReachabilityAnalyzer(graph, targetPath, config);
    const result = analyzer.analyze();

    if (benchmark) {
      benchmark.endAnalysis();
    }

    analyzer.clearMemory();
    graph.clearMemory();

    if (!options.quiet && !hasExport) {
      console.log(chalk.gray("   Analysis complete\n"));
    }
    const formatter = new ResultFormatter();
    const formats = options.export
      ? Array.isArray(options.export)
        ? options.export
        : [options.export]
      : [];

    if (formats.length > 0) {
      const targetDir = options.exportPath
        ? path.resolve(options.exportPath)
        : path.resolve(targetPath, "reports");
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const timestamp = options.history
        ? new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5)
        : null;

      for (const format of formats) {
        const content = formatter.formatForExport(result, format);
        const ext = getFormatExtension(format);
        let filename = `unreach-report.${ext}`;
        if (timestamp) {
          filename = `unreach-report-${timestamp}.${ext}`;
        }
        const filePath = path.join(targetDir, filename);

        try {
          fs.writeFileSync(filePath, content, "utf-8");
          if (!options.quiet) {
            console.log(chalk.green(`Report written to ${filePath}`));
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          console.error(
            chalk.red(`Failed to write report to ${filePath}: ${errorMessage}`),
          );
        }
      }
    } else {
      const totalFiles = nodeCount;
      let totalPackages = 0;
      try {
        const packageJsonPath = path.join(targetPath, "package.json");
        if (fs.existsSync(packageJsonPath)) {
          const packageJson = JSON.parse(
            fs.readFileSync(packageJsonPath, "utf-8"),
          );
          const dependencies = {
            ...packageJson.dependencies,
            ...packageJson.devDependencies,
            ...packageJson.peerDependencies,
          };
          totalPackages = Object.keys(dependencies).length;
        }
      } catch {}

      const output = formatter.format(result, undefined, options.groupBy);
      console.log(output);

      if (!options.quiet) {
        const summary = formatter.formatSummary(result, {
          totalFiles,
          totalPackages,
          entryPoints: entryPoints.length,
        });
        console.log(summary);
      }
    }
    if (options.fix) {
      console.log(
        chalk.yellow(
          "\n⚠️  Auto-fix is not yet implemented. Please remove unused code manually.",
        ),
      );
    }

    if (options.visualize) {
      const outputPath = path.resolve(targetPath, "unreach-dg.html");
      try {
        generateDependencyGraph(graph, outputPath, targetPath);
        if (!options.quiet) {
          console.log(
            chalk.green(`\n📊 Dependency graph written to ${outputPath}`),
          );
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error(
          chalk.red(`Failed to generate dependency graph: ${errorMessage}`),
        );
      }
    }

    if (benchmark) {
      const metrics = benchmark.getMetrics();
      console.log(chalk.cyan(benchmark.formatMetrics(metrics)));
    }
  } catch (error) {
    if (error instanceof UnreachError) {
      return error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    const cause = error instanceof Error ? error : undefined;

    if (debug && cause?.stack) {
      console.error(chalk.gray("\n🔍 Debug Stack Trace:\n"));
      console.error(chalk.gray(cause.stack));
    }

    return UnreachError.analysisError(errorMessage, cause);
  }
}
export async function runWithExit(
  options: ScanOptions & { command?: string },
): Promise<void> {
  if (options.watch) {
    const { FileWatcher } = await import("../utils/watch.js");
    const watcher = new FileWatcher(options.cwd || process.cwd(), options);

    const shutdown = () => {
      watcher.stop();
      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

    await watcher.start();
    return;
  }
  if (!options.quiet && !options.debug) {
    const currentVersion = getPackageVersion();
    checkForUpdates(currentVersion, "unreach")
      .then(({ hasUpdate, latestVersion }) => {
        if (hasUpdate && latestVersion) {
          displayUpdateNotification(currentVersion, latestVersion);
        }
      })
      .catch(() => {});
  }

  if (options.command === "scan" || !options.command) {
    const result = await runScan(options);
    if (isError(result)) {
      console.error(formatError(result, options.debug));
      console.error(
        chalk.gray("\n  If this issue persists, please report it at:"),
      );
      console.error(chalk.cyan("  https://github.com/kiron0/unreach/issues\n"));
      process.exit(1);
    }
  } else {
    console.error(
      chalk.red.bold(`\n❌ Error: Unknown command: ${options.command}`),
    );
    console.error(chalk.gray("\n💡 Suggestion:"));
    console.error(
      chalk.gray("  Run 'unreach --help' to see all available commands.\n"),
    );
    process.exit(1);
  }
}
