import chalk from "chalk";
import { Command } from "commander";
import type { ScanOptions } from "../types/index.js";
import { parseOutputFormat } from "../utils/export.js";
import { resolveDirectoryPath } from "../utils/path-utils.js";
import { getPackageVersion } from "../utils/version.js";

export function createCommand(): Command {
  const program = new Command();
  program
    .name("unreach")
    .description(
      "A CLI that deeply analyzes a codebase to find what exists but is truly unused",
    )
    .version(getPackageVersion(), "-v, --version", "Show version number");
  program.configureOutput({
    writeErr: (str) => {
      if (str.includes("too many arguments")) {
        const match = str.match(/Expected (\d+) argument but got (\d+)/);
        if (match) {
          const expected = match[1];
          const got = match[2];
          process.stderr.write(
            chalk.red.bold("\n❌ Error: Too many arguments provided\n\n") +
              chalk.yellow("💡 Suggestion:\n") +
              chalk.gray(
                `  The 'scan' command expects ${expected} argument (directory path), but ${got} were provided.\n` +
                  "  - Use quotes for paths with spaces: unreach scan '/path/with spaces'\n" +
                  "  - Only provide one directory path as an argument\n" +
                  "  - Use '--entry' for multiple entry points: unreach scan --entry src/index.ts,src/main.ts\n" +
                  "  - Run 'unreach scan --help' to see usage examples\n\n",
              ),
          );
          process.exit(1);
        }
      }
      if (str.includes("unknown option")) {
        const match = str.match(/unknown option ['"]--?([^'"]+)['"]/);
        if (match) {
          const unknownOption = match[1];
          const scanOptions = [
            "entry",
            "e",
            "fix",
            "export",
            "export-path",
            "quiet",
            "no-progress",
            "history",
            "no-incremental",
            "visualize",
            "benchmark",
            "verbose",
            "debug",
            "group-by",
            "interactive",
            "watch",
            "stats",
          ];

          if (scanOptions.includes(unknownOption)) {
            process.stderr.write(
              chalk.red.bold(
                `\n❌ Error: Option '--${unknownOption}' requires the 'scan' command\n\n`,
              ) +
                chalk.yellow("💡 Suggestion:\n") +
                chalk.gray(
                  `  Use 'unreach scan --${unknownOption}' instead.\n` +
                    "  - Run 'unreach scan --help' to see all available options\n" +
                    "  - Run 'unreach --help' to see all commands\n\n",
                ),
            );
          } else {
            process.stderr.write(
              chalk.red.bold(
                `\n❌ Error: Unknown option: '--${unknownOption}'\n\n`,
              ) +
                chalk.yellow("💡 Suggestion:\n") +
                chalk.gray(
                  "  This option doesn't exist. Run 'unreach scan --help' to see all available options.\n\n",
                ),
            );
          }
          process.exit(1);
        }
      }
      if (str.includes("unknown command")) {
        const match = str.match(/unknown command ['"]([^'"]+)['"]/);
        if (match) {
          const unknownCommand = match[1];
          process.stderr.write(
            chalk.red.bold(
              `\n❌ Error: Unknown command: '${unknownCommand}'\n\n`,
            ) +
              chalk.yellow("💡 Suggestion:\n") +
              chalk.gray(
                "  Available commands: 'scan', 'check-update'\n" +
                  "  - Run 'unreach scan' to scan the codebase\n" +
                  "  - Run 'unreach check-update' to check for updates\n" +
                  "  - Run 'unreach --help' to see all commands\n\n",
              ),
          );
          process.exit(1);
        }
      }
      if (str.includes("required argument")) {
        process.stderr.write(
          chalk.red.bold("\n❌ Error: Missing required argument\n\n") +
            chalk.yellow("💡 Suggestion:\n") +
            chalk.gray(
              "  Check the command syntax. Run 'unreach scan --help' to see usage examples.\n\n",
            ),
        );
        process.exit(1);
      }
      process.stderr.write(str);
    },
  });
  program
    .command("check-update")
    .description("Check for available updates")
    .action(async () => {
      const { checkForUpdates, displayUpdateNotification } =
        await import("../utils/version-check.js");
      const { getPackageVersion } = await import("../utils/version.js");
      const currentVersion = getPackageVersion();
      const cwd = process.cwd();
      console.log(chalk.cyan(`Checking for updates...`));
      const { hasUpdate, latestVersion } = await checkForUpdates(
        currentVersion,
        "unreach",
      );
      if (hasUpdate && latestVersion) {
        displayUpdateNotification(currentVersion, latestVersion, cwd);
      } else {
        console.log(
          chalk.green(
            `\n✓ You're using the latest version: ${chalk.bold(currentVersion)}\n`,
          ),
        );
      }
      process.exit(0);
    });
  program
    .command("scan")
    .description("Scan the codebase for unused code")
    .argument(
      "[directory]",
      "Directory to scan (default: current directory)",
      ".",
    )
    .option(
      "-e, --entry <entry>",
      "Custom entry point(s). Multiple entry points can be specified comma-separated (e.g., src/index.ts,src/cli.ts)",
    )
    .option("--fix", "Automatically remove unused code (coming soon)")
    .option(
      "--export [format]",
      "Write report to unreach-report.{ext} in the given format (json, csv, tsv, markdown, html). Multiple formats can be specified comma-separated (e.g., json,html,markdown)",
    )
    .option(
      "--export-path <dir>",
      "Specify output directory for exported reports. Files will use default naming (unreach-report.{ext}). Directories will be created automatically if they don't exist",
    )
    .option("--quiet", "Suppress all output except errors")
    .option("--no-progress", "Disable progress indicator (enabled by default)")
    .option(
      "--history",
      "Keep previous reports by appending timestamps (e.g., unreach-report-2024-01-15T14-30-45.json). By default, reports are replaced",
    )
    .option(
      "--no-incremental",
      "Disable incremental analysis (re-analyze all files, ignoring cache)",
    )
    .option(
      "--visualize",
      "Generate an interactive dependency graph visualization (dependency-graph.html)",
    )
    .option(
      "--benchmark",
      "Track and display performance metrics (parse time, analysis time, memory usage)",
    )
    .option(
      "--verbose",
      "Show detailed output including file-by-file processing information",
    )
    .option(
      "--debug",
      "Enable debug mode with stack traces and detailed error information",
    )
    .option(
      "--group-by <type>",
      "Group output by 'type' or 'file' (default: type)",
      "type",
    )
    .option("--interactive", "Show interactive menu to configure scan options")
    .option(
      "--watch",
      "Watch for file changes and automatically re-scan (continuous monitoring)",
    )
    .option("--no-config", "Ignore configuration file and use default settings")
    .option(
      "--stats",
      "Show summary statistics (files analyzed, packages analyzed, entry points, unused items breakdown)",
    );
  return program;
}
export function parseArgs(): ScanOptions & { command?: string } {
  const program = createCommand();
  program.exitOverride((err) => {
    if (
      err.code === "commander.help" ||
      err.code === "commander.helpDisplayed"
    ) {
      process.exit(0);
    }
    throw err;
  });
  program.parse();
  const command = program.args[0] || "scan";
  const activeCommand =
    program.commands.find((cmd) => cmd.name() === command) || program;
  const options = activeCommand.opts();

  let directory = ".";

  if (command === "scan") {
    const commandArgs =
      (activeCommand as any).processedArgs || activeCommand.args || [];
    if (commandArgs.length > 0) {
      directory = commandArgs[0];
    }
  } else if (command !== "scan" && program.args.length > 1) {
    directory = program.args[1];
  }
  const groupBy = options.groupBy === "file" ? "file" : "type";
  const noConfigPassed = process.argv.includes("--no-config");

  let entry: string | string[] | undefined = options.entry;
  if (entry && typeof entry === "string") {
    const entries = entry
      .split(",")
      .map((ep) => ep.trim())
      .filter(Boolean);
    entry =
      entries.length === 1
        ? entries[0]
        : entries.length > 1
          ? entries
          : undefined;
  }

  const resolvedDirectory = resolveDirectoryPath(directory);

  return {
    command,
    entry,
    fix: options.fix || false,
    export: parseOutputFormat(options.export),
    exportPath: options.exportPath,
    cwd: resolvedDirectory,
    quiet: options.quiet || false,
    noProgress: options.noProgress !== undefined ? options.noProgress : false,
    history: options.history || false,
    noIncremental: options.noIncremental || false,
    visualize: options.visualize || false,
    benchmark: options.benchmark || false,
    verbose: options.verbose || false,
    debug: options.debug || false,
    groupBy,
    interactive: options.interactive || false,
    watch: options.watch || false,
    noConfig: noConfigPassed || false,
    stats: options.stats || false,
  };
}
