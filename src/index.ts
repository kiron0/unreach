#!/usr/bin/env node

import chalk from "chalk";
import * as process from "process";
import { createCommand, parseArgs } from "./cli/args.js";
import { runWithExit } from "./cli/handler.js";
import {
  convertToScanOptions,
  showInteractiveMenu,
} from "./cli/interactive.js";
import { showHomePage } from "./cli/ui.js";

export type { ConfigValidationError, UnreachConfig } from "./lib/config.js";

async function main() {
  if (process.argv.length === 2 && process.stdin.isTTY) {
    showHomePage();
    process.exit(0);
    return;
  }
  if (process.argv.length === 2 && !process.stdin.isTTY) {
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
    process.exit(0);
    return;
  }
  const command = process.argv[2];
  if (command === "check-update") {
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
    return;
  }

  const program = createCommand();
  program.exitOverride((err) => {
    if (
      err.code === "commander.help" ||
      err.code === "commander.helpDisplayed"
    ) {
      process.exit(0);
    }
    if (err.code === "commander.unknownCommand") {
      const command = (err as any).args?.[0] || "unknown";
      process.stderr.write(
        chalk.red.bold(`\n❌ Error: Unknown command: '${command}'\n\n`) +
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
    if (err.code === "commander.missingArgument") {
      process.exit(1);
    }
    throw err;
  });
  const args = parseArgs();

  if (args.interactive && process.stdin.isTTY) {
    try {
      const interactiveOptions = await showInteractiveMenu(args.cwd);
      const scanOptions = convertToScanOptions(interactiveOptions);
      const mergedOptions = {
        ...scanOptions,
        ...args,
        quiet: args.quiet,
        debug: args.debug,
        verbose: args.verbose,
      };
      await runWithExit(mergedOptions);
      return;
    } catch (error) {
      if (error && typeof error === "object" && "isTtyError" in error) {
        console.error(
          chalk.red("\n❌ Error: Interactive mode requires a TTY terminal."),
        );
        console.error(
          chalk.gray("   Run without --interactive flag or use a terminal.\n"),
        );
        process.exit(1);
        return;
      }
      throw error;
    }
  }

  await runWithExit(args);
}
main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
