import chalk from "chalk";
import * as fs from "fs";
import * as path from "path";
import { isError, UnreachError } from "../core/errors.js";
import { ReachabilityAnalyzer } from "../lib/analyzer.js";
import { EntryPointDetector } from "../lib/entry-points.js";
import { ResultFormatter } from "../lib/formatter.js";
import { DependencyGraph } from "../lib/graph.js";
import type { ScanOptions } from "../types/index.js";
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
function formatError(error: UnreachError): string {
  let message = `\n${chalk.red.bold("❌ Error:")} ${chalk.red(error.message)}\n`;
  if (error.suggestion) {
    message += `\n${chalk.yellow("💡 Suggestion:")}\n${chalk.gray(error.suggestion)}\n`;
  }
  if (error.cause) {
    message += `\n${chalk.blue("📋 Details:")} ${chalk.gray(error.cause.message)}\n`;
  }
  return message;
}
export async function runScan(
  options: ScanOptions,
): Promise<void | UnreachError> {
  const cwd = options.cwd || process.cwd();
  const validation = validateDirectory(cwd);
  if (validation.error) {
    return validation.error;
  }
  const targetPath = validation.path;
  try {
    if (!options.quiet && !options.json) {
      console.log(chalk.cyan.bold("🔍 Scanning codebase...\n"));
    }
    const entryDetector = new EntryPointDetector(targetPath);
    const entryPoints = await entryDetector.detectEntryPoints(options.entry);
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
    if (!options.quiet && !options.json) {
      if (entryPoints.length === 0) {
        console.warn(
          chalk.yellow("⚠️  Warning:") +
            chalk.yellow(" No entry points found. Using default patterns..."),
        );
      } else {
        console.log(
          chalk.green.bold(`📌 Found ${entryPoints.length} entry point(s):`),
        );
        for (const entry of entryPoints) {
          console.log(chalk.gray(`   • ${path.relative(targetPath, entry)}`));
        }
        console.log("");
      }
    }
    const showProgress = !options.quiet && !options.json && !options.noProgress;
    if (!options.quiet && !options.json) {
      console.log(chalk.blue("📊 Building dependency graph..."));
    }
    const graph = new DependencyGraph(targetPath);
    await graph.build(entryPoints, showProgress);
    const nodeCount = graph.getNodes().size;
    if (!showProgress && !options.quiet && !options.json) {
      console.log(
        chalk.gray(`   Analyzed ${chalk.white.bold(nodeCount)} file(s)\n`),
      );
    } else if (showProgress && !options.quiet && !options.json) {
      console.log("");
    }
    if (!options.quiet && !options.json) {
      console.log(chalk.blue("🔬 Analyzing reachability..."));
    }
    const analyzer = new ReachabilityAnalyzer(graph, targetPath);
    const result = analyzer.analyze();
    if (!options.quiet && !options.json) {
      console.log(chalk.gray("   Analysis complete\n"));
    }
    const formatter = new ResultFormatter();
    const output = formatter.format(result, options.json || false);
    console.log(output);
    if (options.fix && !options.quiet) {
      console.log(
        chalk.yellow(
          "\n⚠️  Auto-fix is not yet implemented. Please remove unused code manually.",
        ),
      );
    }
    const totalUnused =
      result.unusedPackages.length +
      result.unusedImports.length +
      result.unusedExports.length +
      result.unusedFunctions.length +
      result.unusedVariables.length +
      result.unusedFiles.length +
      result.unusedConfigs.length +
      result.unusedScripts.length;
  } catch (error) {
    if (error instanceof UnreachError) {
      return error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    return UnreachError.analysisError(
      errorMessage,
      error instanceof Error ? error : undefined,
    );
  }
}
export async function runWithExit(
  options: ScanOptions & { command?: string },
): Promise<void> {
  if (options.command === "scan" || !options.command) {
    const result = await runScan(options);
    if (isError(result)) {
      console.error(formatError(result));
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
