import chalk from "chalk";
import { Command } from "commander";
import * as path from "path";
import type { ScanOptions } from "../types/index.js";
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
                  "  - Use '--entry' for multiple entry points: unreach scan --entry src/index.ts src/main.ts\n" +
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
          process.stderr.write(
            chalk.red.bold(
              `\n❌ Error: Unknown option: '--${unknownOption}'\n\n`,
            ) +
              chalk.yellow("💡 Suggestion:\n") +
              chalk.gray(
                "  This option doesn't exist. Run 'unreach scan --help' to see all available options.\n\n",
              ),
          );
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
                "  Available commands: 'scan'\n" +
                  "  - Run 'unreach scan' to scan the codebase\n" +
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
    .command("scan")
    .description("Scan the codebase for unused code")
    .argument("[directory]", "Directory to scan", ".")
    .option(
      "-e, --entry <entry...>",
      "Custom entry point(s) (e.g., src/index.ts)",
    )
    .option("--fix", "Automatically remove unused code (coming soon)")
    .option("--json", "Output results as JSON format")
    .option("--cwd <cwd>", "Working directory (overrides directory argument)")
    .option("--quiet", "Suppress all output except errors")
    .option("--no-progress", "Disable progress indicator (enabled by default)");
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
  if (
    command === "scan" &&
    activeCommand.args &&
    activeCommand.args.length > 0
  ) {
    directory = activeCommand.args[0];
  } else if (command !== "scan" && program.args.length > 1) {
    directory = program.args[1];
  }
  return {
    command,
    entry: options.entry,
    fix: options.fix || false,
    json: options.json || false,
    cwd: options.cwd || path.resolve(directory),
    quiet: options.quiet || false,
    noProgress: options.noProgress !== undefined ? options.noProgress : false,
  };
}
