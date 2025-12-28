import chalk from "chalk";
import inquirer from "inquirer";
import * as path from "path";
import type { ScanOptions } from "../types/index.js";

export interface InteractiveOptions {
  directory?: string;
  entryPoints?: string[];
  exportFormat?: string;
  groupBy?: "type" | "file";
  showVisualization?: boolean;
  showBenchmark?: boolean;
}

export async function showInteractiveMenu(
  defaultCwd: string = process.cwd(),
): Promise<InteractiveOptions> {
  console.log(chalk.cyan.bold("\n🔍 Unreach Interactive Setup\n"));

  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "directory",
      message: "Directory to scan:",
      default: defaultCwd,
      validate: (input: string) => {
        if (!input || input.trim().length === 0) {
          return "Directory path is required";
        }
        return true;
      },
    },
    {
      type: "input",
      name: "entryPoints",
      message:
        "Entry points (comma-separated, leave empty for auto-detection):",
      default: "",
      filter: (input: string) => {
        if (!input || input.trim().length === 0) {
          return [];
        }
        return input
          .split(",")
          .map((ep) => ep.trim())
          .filter(Boolean);
      },
    },
    {
      type: "list",
      name: "exportFormat",
      message: "Export format:",
      choices: [
        { name: "None (display in terminal)", value: "none" },
        { name: "JSON", value: "json" },
        { name: "CSV", value: "csv" },
        { name: "TSV", value: "tsv" },
        { name: "Markdown", value: "markdown" },
        { name: "HTML", value: "html" },
      ],
      default: "none",
    },
    {
      type: "list",
      name: "groupBy",
      message: "Group output by:",
      choices: [
        { name: "Type (packages, imports, exports, etc.)", value: "type" },
        { name: "File", value: "file" },
      ],
      default: "type",
    },
    {
      type: "confirm",
      name: "showVisualization",
      message: "Generate dependency graph visualization?",
      default: false,
    },
    {
      type: "confirm",
      name: "showBenchmark",
      message: "Show performance benchmarks?",
      default: false,
    },
  ]);

  return {
    directory: answers.directory,
    entryPoints:
      answers.entryPoints.length > 0 ? answers.entryPoints : undefined,
    exportFormat:
      answers.exportFormat !== "none" ? answers.exportFormat : undefined,
    groupBy: answers.groupBy,
    showVisualization: answers.showVisualization,
    showBenchmark: answers.showBenchmark,
  };
}

export function convertToScanOptions(
  interactive: InteractiveOptions,
): ScanOptions {
  return {
    cwd: path.resolve(interactive.directory || process.cwd()),
    entry: interactive.entryPoints,
    export: interactive.exportFormat as any,
    groupBy: interactive.groupBy,
    visualize: interactive.showVisualization,
    benchmark: interactive.showBenchmark,
  };
}
