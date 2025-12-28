import chalk from "chalk";
import { getPackageVersion } from "../utils/version.js";

export function showHomePage(): void {
  const version = getPackageVersion();
  const banner = chalk.bold.cyan(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   ${chalk.bold.white("unreach")} ${chalk.gray(`v${version}`)} - Find unused code with real dependency awareness   ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`);
  console.log(banner);
  console.log(chalk.bold("What can unreach find?"));
  console.log(chalk.gray("  • Unused npm packages"));
  console.log(chalk.gray("  • Unused imports and exports"));
  console.log(chalk.gray("  • Unused functions and classes"));
  console.log(chalk.gray("  • Unused files"));
  console.log(chalk.gray("  • Dead config options"));
  console.log(chalk.gray("  • Unused scripts\n"));
  console.log(chalk.bold("Quick Start:"));
  console.log(
    chalk.cyan("  unreach scan") +
      " ".repeat(28) +
      chalk.gray("Scan current directory"),
  );
  console.log(
    chalk.cyan("  unreach scan <directory>") +
      " ".repeat(15) +
      chalk.gray("Scan specific directory"),
  );
  console.log(
    chalk.cyan("  unreach scan --entry src/index.ts") +
      " ".repeat(3) +
      chalk.gray("Scan with custom entry point"),
  );
  console.log(
    chalk.cyan("  unreach scan --export json") +
      " ".repeat(10) +
      chalk.gray("Export as JSON"),
  );
  console.log(
    chalk.cyan("  unreach scan --fix") +
      " ".repeat(20) +
      chalk.gray("Auto-remove unused code (coming soon)"),
  );
  console.log(chalk.bold("\nExamples:"));
  console.log(
    chalk.gray("  # Scan current directory"),
    chalk.cyan("unreach scan"),
  );
  console.log(
    chalk.gray("  # Scan specific directory"),
    chalk.cyan("unreach scan /path/to/project"),
  );
  console.log(
    chalk.gray("  # Scan with custom entry point"),
    chalk.cyan("unreach scan --entry src/main.ts"),
  );
  console.log(
    chalk.gray("  # Export as JSON"),
    chalk.cyan("unreach scan --export json"),
  );
  console.log(chalk.bold("\nOptions:"));
  console.log(
    chalk.gray("  -e, --entry <entry...>") +
      " ".repeat(10) +
      chalk.white("Custom entry point(s)"),
  );
  console.log(
    chalk.gray("  --fix") +
      " ".repeat(23) +
      chalk.white("Auto-remove unused code"),
  );
  console.log(
    chalk.gray("  --export [format]") +
      " ".repeat(12) +
      chalk.white("Export report (json, csv, tsv, markdown, html)"),
  );
  console.log(
    chalk.gray("  --export-path <dir>") +
      " ".repeat(10) +
      chalk.white("Output directory for exported reports"),
  );
  console.log(
    chalk.gray("  --cwd <cwd>") +
      " ".repeat(18) +
      chalk.white("Working directory"),
  );
  console.log(chalk.bold("\nDocumentation:"));
  console.log(
    chalk.cyan("  https://unreach.js.org") +
      " ".repeat(10) +
      chalk.gray("Full documentation"),
  );
  console.log(
    chalk.cyan("  unreach --help") +
      " ".repeat(19) +
      chalk.gray("Show all commands"),
  );
  console.log(chalk.gray("\n" + "─".repeat(65)));
  console.log(
    chalk.italic.gray('  "What can I delete without breaking the project?"'),
  );
  console.log(chalk.gray("─".repeat(65) + "\n"));
}
