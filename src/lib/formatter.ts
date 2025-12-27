import chalk from "chalk";
import type { ScanResult } from "../types/index.js";
export class ResultFormatter {
  format(result: ScanResult, json: boolean = false): string {
    if (json) {
      return JSON.stringify(result, null, 2);
    }
    return this.formatText(result);
  }
  private formatText(result: ScanResult): string {
    const lines: string[] = [];
    if (result.unusedPackages.length > 0) {
      lines.push(
        chalk.bold(`Unused packages: ${result.unusedPackages.length}`),
      );
      for (const pkg of result.unusedPackages) {
        lines.push(`  - ${pkg.name}${pkg.version ? ` (${pkg.version})` : ""}`);
      }
      lines.push("");
    }
    if (result.unusedImports.length > 0) {
      lines.push(chalk.bold(`Unused imports: ${result.unusedImports.length}`));
      for (const imp of result.unusedImports.slice(0, 20)) {
        lines.push(`  - ${imp.importPath} [${imp.file}]`);
      }
      if (result.unusedImports.length > 20) {
        lines.push(`  ... and ${result.unusedImports.length - 20} more`);
      }
      lines.push("");
    }
    if (result.unusedExports.length > 0) {
      lines.push(chalk.bold(`Unused exports: ${result.unusedExports.length}`));
      for (const exp of result.unusedExports.slice(0, 20)) {
        lines.push(
          `  - ${exp.exportName} [${exp.file}]${exp.line ? `:${exp.line}` : ""}`,
        );
      }
      if (result.unusedExports.length > 20) {
        lines.push(`  ... and ${result.unusedExports.length - 20} more`);
      }
      lines.push("");
    }
    if (result.unusedFunctions.length > 0) {
      lines.push(
        chalk.bold(`Unused functions: ${result.unusedFunctions.length}`),
      );
      for (const func of result.unusedFunctions.slice(0, 20)) {
        lines.push(
          `  - ${func.functionName} [${func.file}]${func.line ? `:${func.line}` : ""}`,
        );
      }
      if (result.unusedFunctions.length > 20) {
        lines.push(`  ... and ${result.unusedFunctions.length - 20} more`);
      }
      lines.push("");
    }
    if (result.unusedVariables.length > 0) {
      lines.push(
        chalk.bold(`Unused variables: ${result.unusedVariables.length}`),
      );
      for (const variable of result.unusedVariables.slice(0, 20)) {
        lines.push(
          `  - ${variable.variableName} [${variable.file}]${variable.line ? `:${variable.line}` : ""}`,
        );
      }
      if (result.unusedVariables.length > 20) {
        lines.push(`  ... and ${result.unusedVariables.length - 20} more`);
      }
      lines.push("");
    }
    if (result.unusedFiles.length > 0) {
      lines.push(chalk.bold(`Unused files: ${result.unusedFiles.length}`));
      for (const file of result.unusedFiles.slice(0, 20)) {
        lines.push(`  - ${file.file}`);
      }
      if (result.unusedFiles.length > 20) {
        lines.push(`  ... and ${result.unusedFiles.length - 20} more`);
      }
      lines.push("");
    }
    if (result.unusedConfigs.length > 0) {
      lines.push(chalk.bold(`Unused configs: ${result.unusedConfigs.length}`));
      for (const config of result.unusedConfigs) {
        lines.push(`  - ${config.configKey} [${config.file}]`);
      }
      lines.push("");
    }
    if (result.unusedScripts.length > 0) {
      lines.push(chalk.bold(`Unused scripts: ${result.unusedScripts.length}`));
      for (const script of result.unusedScripts) {
        lines.push(`  - ${script.scriptName}`);
      }
      lines.push("");
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
    if (totalUnused === 0) {
      lines.push(chalk.green("✓ No unused code found!"));
    } else {
      lines.push(
        chalk.yellow(
          `Safe to remove: ${totalUnused > 0 ? "yes" : "no"} (${totalUnused} items)`,
        ),
      );
    }
    return lines.join("\n");
  }
}
