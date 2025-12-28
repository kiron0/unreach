import chalk from "chalk";
import type { ScanResult } from "../types/index.js";
import { OutputFormat } from "../utils/export.js";
import { createFileLink } from "../utils/file-link.js";

export class ResultFormatter {
  format(
    result: ScanResult,
    format?: OutputFormat | OutputFormat[],
    groupBy?: "type" | "file",
  ): string {
    if (!format) {
      return groupBy === "file"
        ? this.formatTextGroupedByFile(result)
        : this.formatText(result);
    }
    const formats = Array.isArray(format) ? format : [format];
    if (formats.length === 1) {
      return this.formatForExport(result, formats[0]);
    }
    return groupBy === "file"
      ? this.formatTextGroupedByFile(result)
      : this.formatText(result);
  }

  formatForExport(result: ScanResult, format: OutputFormat): string {
    switch (format) {
      case OutputFormat.Json:
        return this.formatJson(result);
      case OutputFormat.Csv:
        return this.formatCsv(result);
      case OutputFormat.Tsv:
        return this.formatTsv(result);
      case OutputFormat.Md:
        return this.formatMd(result);
      case OutputFormat.Html:
        return this.formatHtml(result);
    }
  }
  formatSummary(
    result: ScanResult,
    stats: {
      totalFiles: number;
      totalPackages: number;
      entryPoints: number;
    },
  ): string {
    const lines: string[] = [];
    lines.push(chalk.cyan.bold("\n📊 Summary Statistics"));
    lines.push(chalk.gray("─".repeat(50)));
    lines.push(
      `   ${chalk.bold("Files analyzed:")} ${chalk.white(stats.totalFiles)}`,
    );
    lines.push(
      `   ${chalk.bold("Packages analyzed:")} ${chalk.white(stats.totalPackages)}`,
    );
    lines.push(
      `   ${chalk.bold("Entry points:")} ${chalk.white(stats.entryPoints)}`,
    );
    lines.push("");

    const categories = [
      { name: "Packages", count: result.unusedPackages.length },
      { name: "Imports", count: result.unusedImports.length },
      { name: "Exports", count: result.unusedExports.length },
      { name: "Functions", count: result.unusedFunctions.length },
      { name: "Variables", count: result.unusedVariables.length },
      { name: "Files", count: result.unusedFiles.length },
      { name: "Configs", count: result.unusedConfigs.length },
      { name: "Scripts", count: result.unusedScripts.length },
      { name: "Types", count: result.unusedTypes.length },
      { name: "CSS Classes", count: result.unusedCSSClasses.length },
      { name: "Assets", count: result.unusedAssets.length },
    ];

    const totalUnused = categories.reduce((sum, cat) => sum + cat.count, 0);

    lines.push(chalk.yellow.bold("Unused Items Breakdown:"));
    for (const category of categories) {
      if (category.count > 0) {
        lines.push(
          `   ${chalk.gray("•")} ${category.name.padEnd(15)} ${chalk.white.bold(category.count)}`,
        );
      }
    }
    lines.push("");
    lines.push(
      `   ${chalk.bold("Total unused items:")} ${chalk.white.bold(totalUnused)}`,
    );
    lines.push("");

    return lines.join("\n");
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
        const fileLink = createFileLink(imp.file, imp.line, imp.column);
        lines.push(`  - ${imp.importPath} [${fileLink}]`);
      }
      if (result.unusedImports.length > 20) {
        lines.push(`  ... and ${result.unusedImports.length - 20} more`);
      }
      lines.push("");
    }
    if (result.unusedExports.length > 0) {
      lines.push(chalk.bold(`Unused exports: ${result.unusedExports.length}`));
      for (const exp of result.unusedExports.slice(0, 20)) {
        const fileLink = createFileLink(exp.file, exp.line, exp.column);
        lines.push(`  - ${exp.exportName} [${fileLink}]`);
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
        const fileLink = createFileLink(func.file, func.line, func.column);
        lines.push(`  - ${func.functionName} [${fileLink}]`);
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
        const fileLink = createFileLink(
          variable.file,
          variable.line,
          variable.column,
        );
        lines.push(`  - ${variable.variableName} [${fileLink}]`);
      }
      if (result.unusedVariables.length > 20) {
        lines.push(`  ... and ${result.unusedVariables.length - 20} more`);
      }
      lines.push("");
    }
    if (result.unusedFiles.length > 0) {
      lines.push(chalk.bold(`Unused files: ${result.unusedFiles.length}`));
      for (const file of result.unusedFiles.slice(0, 20)) {
        const fileLink = createFileLink(file.file);
        lines.push(`  - ${fileLink}`);
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
    if (result.unusedTypes.length > 0) {
      lines.push(chalk.bold(`Unused types: ${result.unusedTypes.length}`));
      for (const type of result.unusedTypes.slice(0, 20)) {
        const fileLink = createFileLink(type.file, type.line, type.column);
        lines.push(`  - ${type.typeName} (${type.typeKind}) [${fileLink}]`);
      }
      if (result.unusedTypes.length > 20) {
        lines.push(`  ... and ${result.unusedTypes.length - 20} more`);
      }
      lines.push("");
    }
    if (result.unusedCSSClasses.length > 0) {
      lines.push(
        chalk.bold(`Unused CSS classes: ${result.unusedCSSClasses.length}`),
      );
      for (const cssClass of result.unusedCSSClasses.slice(0, 20)) {
        const fileLink = createFileLink(cssClass.file, cssClass.line);
        lines.push(`  - .${cssClass.className} [${fileLink}]`);
      }
      if (result.unusedCSSClasses.length > 20) {
        lines.push(`  ... and ${result.unusedCSSClasses.length - 20} more`);
      }
      lines.push("");
    }
    if (result.unusedAssets.length > 0) {
      lines.push(chalk.bold(`Unused assets: ${result.unusedAssets.length}`));
      for (const asset of result.unusedAssets.slice(0, 20)) {
        const fileLink = createFileLink(asset.file, asset.line, asset.column);
        lines.push(`  - ${asset.assetPath} (${asset.assetType}) [${fileLink}]`);
      }
      if (result.unusedAssets.length > 20) {
        lines.push(`  ... and ${result.unusedAssets.length - 20} more`);
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
      result.unusedScripts.length +
      result.unusedTypes.length +
      result.unusedCSSClasses.length +
      result.unusedAssets.length;
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

  private formatTextGroupedByFile(result: ScanResult): string {
    const lines: string[] = [];
    const fileMap = new Map<string, Array<{ type: string; item: any }>>();

    for (const imp of result.unusedImports) {
      if (!fileMap.has(imp.file)) {
        fileMap.set(imp.file, []);
      }
      fileMap.get(imp.file)!.push({ type: "import", item: imp });
    }

    for (const exp of result.unusedExports) {
      if (!fileMap.has(exp.file)) {
        fileMap.set(exp.file, []);
      }
      fileMap.get(exp.file)!.push({ type: "export", item: exp });
    }

    for (const func of result.unusedFunctions) {
      if (!fileMap.has(func.file)) {
        fileMap.set(func.file, []);
      }
      fileMap.get(func.file)!.push({ type: "function", item: func });
    }

    for (const variable of result.unusedVariables) {
      if (!fileMap.has(variable.file)) {
        fileMap.set(variable.file, []);
      }
      fileMap.get(variable.file)!.push({ type: "variable", item: variable });
    }

    for (const file of result.unusedFiles) {
      if (!fileMap.has(file.file)) {
        fileMap.set(file.file, []);
      }
      fileMap.get(file.file)!.push({ type: "file", item: file });
    }

    for (const config of result.unusedConfigs) {
      if (!fileMap.has(config.file)) {
        fileMap.set(config.file, []);
      }
      fileMap.get(config.file)!.push({ type: "config", item: config });
    }

    for (const type of result.unusedTypes) {
      if (!fileMap.has(type.file)) {
        fileMap.set(type.file, []);
      }
      fileMap.get(type.file)!.push({ type: "type", item: type });
    }

    for (const cssClass of result.unusedCSSClasses) {
      if (!fileMap.has(cssClass.file)) {
        fileMap.set(cssClass.file, []);
      }
      fileMap.get(cssClass.file)!.push({ type: "cssClass", item: cssClass });
    }

    for (const asset of result.unusedAssets) {
      if (!fileMap.has(asset.file)) {
        fileMap.set(asset.file, []);
      }
      fileMap.get(asset.file)!.push({ type: "asset", item: asset });
    }

    if (result.unusedPackages.length > 0) {
      lines.push(
        chalk.bold(`\n📦 Unused packages: ${result.unusedPackages.length}`),
      );
      for (const pkg of result.unusedPackages) {
        lines.push(`  - ${pkg.name}${pkg.version ? ` (${pkg.version})` : ""}`);
      }
      lines.push("");
    }

    if (result.unusedScripts.length > 0) {
      lines.push(
        chalk.bold(`📜 Unused scripts: ${result.unusedScripts.length}`),
      );
      for (const script of result.unusedScripts) {
        lines.push(`  - ${script.scriptName}`);
      }
      lines.push("");
    }

    if (fileMap.size > 0) {
      lines.push(chalk.bold(`\n📁 Unused items by file:\n`));
      const sortedFiles = Array.from(fileMap.keys()).sort();
      for (const file of sortedFiles) {
        const items = fileMap.get(file)!;
        const fileLink = createFileLink(file);
        lines.push(chalk.cyan.bold(`\n  ${fileLink}`));
        lines.push(chalk.gray(`  ${"─".repeat(60)}`));

        for (const { type, item } of items) {
          switch (type) {
            case "import":
              lines.push(
                `    ${chalk.yellow("import")} ${chalk.white(item.importPath)}`,
              );
              break;
            case "export":
              const exportLink = createFileLink(
                item.file,
                item.line,
                item.column,
              );
              lines.push(
                `    ${chalk.yellow("export")} ${chalk.white(item.exportName)} [${exportLink}]`,
              );
              break;
            case "function":
              const funcLink = createFileLink(
                item.file,
                item.line,
                item.column,
              );
              lines.push(
                `    ${chalk.yellow("function")} ${chalk.white(item.functionName)} [${funcLink}]`,
              );
              break;
            case "variable":
              const varLink = createFileLink(item.file, item.line, item.column);
              lines.push(
                `    ${chalk.yellow("variable")} ${chalk.white(item.variableName)} [${varLink}]`,
              );
              break;
            case "type":
              const typeLink = createFileLink(
                item.file,
                item.line,
                item.column,
              );
              lines.push(
                `    ${chalk.yellow("type")} ${chalk.white(item.typeName)} (${item.typeKind}) [${typeLink}]`,
              );
              break;
            case "cssClass":
              const cssLink = createFileLink(item.file, item.line);
              lines.push(
                `    ${chalk.yellow("CSS class")} ${chalk.white(`.${item.className}`)} [${cssLink}]`,
              );
              break;
            case "asset":
              const assetLink = createFileLink(
                item.file,
                item.line,
                item.column,
              );
              lines.push(
                `    ${chalk.yellow("asset")} ${chalk.white(item.assetPath)} (${item.assetType}) [${assetLink}]`,
              );
              break;
            case "config":
              lines.push(
                `    ${chalk.yellow("config")} ${chalk.white(item.configKey)}`,
              );
              break;
            case "file":
              lines.push(`    ${chalk.yellow("entire file")} (unused)`);
              break;
          }
        }
        lines.push("");
      }
    }

    const totalUnused =
      result.unusedPackages.length +
      result.unusedImports.length +
      result.unusedExports.length +
      result.unusedFunctions.length +
      result.unusedVariables.length +
      result.unusedFiles.length +
      result.unusedConfigs.length +
      result.unusedScripts.length +
      result.unusedTypes.length +
      result.unusedCSSClasses.length +
      result.unusedAssets.length;

    if (totalUnused === 0) {
      lines.push(chalk.green("\n✓ No unused code found!"));
    } else {
      lines.push(
        chalk.yellow(
          `\n📊 Total unused items: ${chalk.bold(totalUnused.toString())}`,
        ),
      );
    }

    return lines.join("\n");
  }

  private formatJson(result: ScanResult): string {
    return JSON.stringify(result, null, 2);
  }

  private formatCsv(result: ScanResult): string {
    const lines: string[] = [];
    lines.push("Type,File,Name,Line,Column");

    for (const pkg of result.unusedPackages) {
      lines.push(`Package,,${pkg.name},,`);
    }

    for (const imp of result.unusedImports) {
      lines.push(
        `Import,"${imp.file}","${imp.importPath}",${imp.line || ""},${imp.column || ""}`,
      );
    }

    for (const exp of result.unusedExports) {
      lines.push(
        `Export,"${exp.file}","${exp.exportName}",${exp.line || ""},${exp.column || ""}`,
      );
    }

    for (const func of result.unusedFunctions) {
      lines.push(
        `Function,"${func.file}","${func.functionName}",${func.line || ""},${func.column || ""}`,
      );
    }

    for (const variable of result.unusedVariables) {
      lines.push(
        `Variable,"${variable.file}","${variable.variableName}",${variable.line || ""},${variable.column || ""}`,
      );
    }

    for (const file of result.unusedFiles) {
      lines.push(`File,"${file.file}",,,`);
    }

    for (const config of result.unusedConfigs) {
      lines.push(`Config,"${config.file}","${config.configKey}",,`);
    }

    for (const script of result.unusedScripts) {
      lines.push(`Script,,"${script.scriptName}",,`);
    }

    for (const type of result.unusedTypes) {
      lines.push(
        `Type,"${type.file}","${type.typeName} (${type.typeKind})",${type.line || ""},${type.column || ""}`,
      );
    }

    for (const cssClass of result.unusedCSSClasses) {
      lines.push(
        `CSS Class,"${cssClass.file}","${cssClass.className}",${cssClass.line || ""},`,
      );
    }

    for (const asset of result.unusedAssets) {
      lines.push(
        `Asset,"${asset.file}","${asset.assetPath} (${asset.assetType})",${asset.line || ""},${asset.column || ""}`,
      );
    }

    return lines.join("\n");
  }

  private formatTsv(result: ScanResult): string {
    const lines: string[] = [];
    lines.push("Type\tFile\tName\tLine\tColumn");

    for (const pkg of result.unusedPackages) {
      lines.push(`Package\t\t${pkg.name}\t\t`);
    }

    for (const imp of result.unusedImports) {
      lines.push(
        `Import\t${imp.file}\t${imp.importPath}\t${imp.line || ""}\t${imp.column || ""}`,
      );
    }

    for (const exp of result.unusedExports) {
      lines.push(
        `Export\t${exp.file}\t${exp.exportName}\t${exp.line || ""}\t${exp.column || ""}`,
      );
    }

    for (const func of result.unusedFunctions) {
      lines.push(
        `Function\t${func.file}\t${func.functionName}\t${func.line || ""}\t${func.column || ""}`,
      );
    }

    for (const variable of result.unusedVariables) {
      lines.push(
        `Variable\t${variable.file}\t${variable.variableName}\t${variable.line || ""}\t${variable.column || ""}`,
      );
    }

    for (const file of result.unusedFiles) {
      lines.push(`File\t${file.file}\t\t\t`);
    }

    for (const config of result.unusedConfigs) {
      lines.push(`Config\t${config.file}\t${config.configKey}\t\t`);
    }

    for (const script of result.unusedScripts) {
      lines.push(`Script\t\t${script.scriptName}\t\t`);
    }

    for (const type of result.unusedTypes) {
      lines.push(
        `Type\t${type.file}\t${type.typeName} (${type.typeKind})\t${type.line || ""}\t${type.column || ""}`,
      );
    }

    for (const cssClass of result.unusedCSSClasses) {
      lines.push(
        `CSS Class\t${cssClass.file}\t${cssClass.className}\t${cssClass.line || ""}\t`,
      );
    }

    for (const asset of result.unusedAssets) {
      lines.push(
        `Asset\t${asset.file}\t${asset.assetPath} (${asset.assetType})\t${asset.line || ""}\t${asset.column || ""}`,
      );
    }

    return lines.join("\n");
  }

  private formatMd(result: ScanResult): string {
    const lines: string[] = [];
    lines.push("# Unreach Report\n");
    lines.push("## Summary\n");
    lines.push("| Type | Count |");
    lines.push("|------|-------|");
    lines.push(`| Unused Packages | ${result.unusedPackages.length} |`);
    lines.push(`| Unused Imports | ${result.unusedImports.length} |`);
    lines.push(`| Unused Exports | ${result.unusedExports.length} |`);
    lines.push(`| Unused Functions | ${result.unusedFunctions.length} |`);
    lines.push(`| Unused Variables | ${result.unusedVariables.length} |`);
    lines.push(`| Unused Files | ${result.unusedFiles.length} |`);
    lines.push(`| Unused Configs | ${result.unusedConfigs.length} |`);
    lines.push(`| Unused Scripts | ${result.unusedScripts.length} |`);
    lines.push(`| Unused Types | ${result.unusedTypes.length} |`);
    lines.push(`| Unused CSS Classes | ${result.unusedCSSClasses.length} |`);
    lines.push(`| Unused Assets | ${result.unusedAssets.length} |\n`);

    const total =
      result.unusedPackages.length +
      result.unusedImports.length +
      result.unusedExports.length +
      result.unusedFunctions.length +
      result.unusedVariables.length +
      result.unusedFiles.length +
      result.unusedConfigs.length +
      result.unusedScripts.length +
      result.unusedTypes.length +
      result.unusedCSSClasses.length +
      result.unusedAssets.length;
    lines.push(`**Total:** ${total} items\n`);

    if (result.unusedPackages.length > 0) {
      lines.push("## Unused Packages\n");
      for (const pkg of result.unusedPackages) {
        lines.push(`- ${pkg.name}${pkg.version ? ` (${pkg.version})` : ""}`);
      }
      lines.push("");
    }

    if (result.unusedImports.length > 0) {
      lines.push("## Unused Imports\n");
      lines.push("| File | Import Path | Line |");
      lines.push("|------|-------------|------|");
      for (const imp of result.unusedImports) {
        lines.push(`| ${imp.file} | ${imp.importPath} | ${imp.line || ""} |`);
      }
      lines.push("");
    }

    if (result.unusedExports.length > 0) {
      lines.push("## Unused Exports\n");
      lines.push("| File | Export Name | Line |");
      lines.push("|------|-------------|------|");
      for (const exp of result.unusedExports) {
        lines.push(`| ${exp.file} | ${exp.exportName} | ${exp.line || ""} |`);
      }
      lines.push("");
    }

    if (result.unusedFunctions.length > 0) {
      lines.push("## Unused Functions\n");
      lines.push("| File | Function Name | Line |");
      lines.push("|------|---------------|------|");
      for (const func of result.unusedFunctions) {
        lines.push(
          `| ${func.file} | ${func.functionName} | ${func.line || ""} |`,
        );
      }
      lines.push("");
    }

    if (result.unusedVariables.length > 0) {
      lines.push("## Unused Variables\n");
      lines.push("| File | Variable Name | Line |");
      lines.push("|------|---------------|------|");
      for (const variable of result.unusedVariables) {
        lines.push(
          `| ${variable.file} | ${variable.variableName} | ${variable.line || ""} |`,
        );
      }
      lines.push("");
    }

    if (result.unusedFiles.length > 0) {
      lines.push("## Unused Files\n");
      for (const file of result.unusedFiles) {
        lines.push(`- ${file.file}`);
      }
      lines.push("");
    }

    if (result.unusedConfigs.length > 0) {
      lines.push("## Unused Configs\n");
      lines.push("| File | Config Key |");
      lines.push("|------|------------|");
      for (const config of result.unusedConfigs) {
        lines.push(`| ${config.file} | ${config.configKey} |`);
      }
      lines.push("");
    }

    if (result.unusedScripts.length > 0) {
      lines.push("## Unused Scripts\n");
      for (const script of result.unusedScripts) {
        lines.push(`- ${script.scriptName}`);
      }
      lines.push("");
    }

    if (result.unusedTypes.length > 0) {
      lines.push("## Unused Types\n");
      lines.push("| File | Type Name | Kind | Line |");
      lines.push("|------|-----------|------|------|");
      for (const type of result.unusedTypes) {
        lines.push(
          `| ${type.file} | ${type.typeName} | ${type.typeKind} | ${type.line || ""} |`,
        );
      }
      lines.push("");
    }

    if (result.unusedCSSClasses.length > 0) {
      lines.push("## Unused CSS Classes\n");
      lines.push("| File | Class Name | Line |");
      lines.push("|------|------------|------|");
      for (const cssClass of result.unusedCSSClasses) {
        lines.push(
          `| ${cssClass.file} | .${cssClass.className} | ${cssClass.line || ""} |`,
        );
      }
      lines.push("");
    }

    if (result.unusedAssets.length > 0) {
      lines.push("## Unused Assets\n");
      lines.push("| File | Asset Path | Type | Line |");
      lines.push("|------|------------|------|------|");
      for (const asset of result.unusedAssets) {
        lines.push(
          `| ${asset.file} | ${asset.assetPath} | ${asset.assetType} | ${asset.line || ""} |`,
        );
      }
      lines.push("");
    }

    return lines.join("\n");
  }

  private formatHtml(result: ScanResult): string {
    const total =
      result.unusedPackages.length +
      result.unusedImports.length +
      result.unusedExports.length +
      result.unusedFunctions.length +
      result.unusedVariables.length +
      result.unusedFiles.length +
      result.unusedConfigs.length +
      result.unusedScripts.length +
      result.unusedTypes.length +
      result.unusedCSSClasses.length +
      result.unusedAssets.length;

    let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Unreach Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    h1 { color: #333; border-bottom: 3px solid #4CAF50; padding-bottom: 10px; }
    h2 { color: #555; margin-top: 30px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background: #4CAF50; color: white; padding: 12px; text-align: left; }
    td { padding: 10px; border-bottom: 1px solid #ddd; }
    tr:hover { background: #f9f9f9; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
    .summary-card { background: #f0f0f0; padding: 15px; border-radius: 5px; border-left: 4px solid #4CAF50; }
    .summary-card h3 { margin: 0 0 10px 0; color: #333; }
    .summary-card .count { font-size: 24px; font-weight: bold; color: #4CAF50; }
    ul { list-style: none; padding: 0; }
    li { padding: 5px 0; border-bottom: 1px solid #eee; }
    .total { background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Unreach Report</h1>
    <div class="summary">
      <div class="summary-card">
        <h3>Unused Packages</h3>
        <div class="count">${result.unusedPackages.length}</div>
      </div>
      <div class="summary-card">
        <h3>Unused Imports</h3>
        <div class="count">${result.unusedImports.length}</div>
      </div>
      <div class="summary-card">
        <h3>Unused Exports</h3>
        <div class="count">${result.unusedExports.length}</div>
      </div>
      <div class="summary-card">
        <h3>Unused Functions</h3>
        <div class="count">${result.unusedFunctions.length}</div>
      </div>
      <div class="summary-card">
        <h3>Unused Variables</h3>
        <div class="count">${result.unusedVariables.length}</div>
      </div>
      <div class="summary-card">
        <h3>Unused Files</h3>
        <div class="count">${result.unusedFiles.length}</div>
      </div>
      <div class="summary-card">
        <h3>Unused Configs</h3>
        <div class="count">${result.unusedConfigs.length}</div>
      </div>
      <div class="summary-card">
        <h3>Unused Scripts</h3>
        <div class="count">${result.unusedScripts.length}</div>
      </div>
      <div class="summary-card">
        <h3>Unused Types</h3>
        <div class="count">${result.unusedTypes.length}</div>
      </div>
      <div class="summary-card">
        <h3>Unused CSS Classes</h3>
        <div class="count">${result.unusedCSSClasses.length}</div>
      </div>
      <div class="summary-card">
        <h3>Unused Assets</h3>
        <div class="count">${result.unusedAssets.length}</div>
      </div>
    </div>
    <div class="total">
      <strong>Total Unused Items: ${total}</strong>
    </div>`;

    if (result.unusedPackages.length > 0) {
      html += `<h2>Unused Packages</h2><ul>`;
      for (const pkg of result.unusedPackages) {
        html += `<li>${pkg.name}${pkg.version ? ` (${pkg.version})` : ""}</li>`;
      }
      html += `</ul>`;
    }

    if (result.unusedImports.length > 0) {
      html += `<h2>Unused Imports</h2><table><thead><tr><th>File</th><th>Import Path</th><th>Line</th></tr></thead><tbody>`;
      for (const imp of result.unusedImports) {
        html += `<tr><td>${imp.file}</td><td>${imp.importPath}</td><td>${imp.line || ""}</td></tr>`;
      }
      html += `</tbody></table>`;
    }

    if (result.unusedExports.length > 0) {
      html += `<h2>Unused Exports</h2><table><thead><tr><th>File</th><th>Export Name</th><th>Line</th></tr></thead><tbody>`;
      for (const exp of result.unusedExports) {
        html += `<tr><td>${exp.file}</td><td>${exp.exportName}</td><td>${exp.line || ""}</td></tr>`;
      }
      html += `</tbody></table>`;
    }

    if (result.unusedFunctions.length > 0) {
      html += `<h2>Unused Functions</h2><table><thead><tr><th>File</th><th>Function Name</th><th>Line</th></tr></thead><tbody>`;
      for (const func of result.unusedFunctions) {
        html += `<tr><td>${func.file}</td><td>${func.functionName}</td><td>${func.line || ""}</td></tr>`;
      }
      html += `</tbody></table>`;
    }

    if (result.unusedVariables.length > 0) {
      html += `<h2>Unused Variables</h2><table><thead><tr><th>File</th><th>Variable Name</th><th>Line</th></tr></thead><tbody>`;
      for (const variable of result.unusedVariables) {
        html += `<tr><td>${variable.file}</td><td>${variable.variableName}</td><td>${variable.line || ""}</td></tr>`;
      }
      html += `</tbody></table>`;
    }

    if (result.unusedFiles.length > 0) {
      html += `<h2>Unused Files</h2><ul>`;
      for (const file of result.unusedFiles) {
        html += `<li>${file.file}</li>`;
      }
      html += `</ul>`;
    }

    if (result.unusedConfigs.length > 0) {
      html += `<h2>Unused Configs</h2><table><thead><tr><th>File</th><th>Config Key</th></tr></thead><tbody>`;
      for (const config of result.unusedConfigs) {
        html += `<tr><td>${config.file}</td><td>${config.configKey}</td></tr>`;
      }
      html += `</tbody></table>`;
    }

    if (result.unusedScripts.length > 0) {
      html += `<h2>Unused Scripts</h2><ul>`;
      for (const script of result.unusedScripts) {
        html += `<li>${script.scriptName}</li>`;
      }
      html += `</ul>`;
    }

    if (result.unusedTypes.length > 0) {
      html += `<h2>Unused Types</h2><table><thead><tr><th>File</th><th>Type Name</th><th>Kind</th><th>Line</th></tr></thead><tbody>`;
      for (const type of result.unusedTypes) {
        html += `<tr><td>${type.file}</td><td>${type.typeName}</td><td>${type.typeKind}</td><td>${type.line || ""}</td></tr>`;
      }
      html += `</tbody></table>`;
    }

    if (result.unusedCSSClasses.length > 0) {
      html += `<h2>Unused CSS Classes</h2><table><thead><tr><th>File</th><th>Class Name</th><th>Line</th></tr></thead><tbody>`;
      for (const cssClass of result.unusedCSSClasses) {
        html += `<tr><td>${cssClass.file}</td><td>.${cssClass.className}</td><td>${cssClass.line || ""}</td></tr>`;
      }
      html += `</tbody></table>`;
    }

    if (result.unusedAssets.length > 0) {
      html += `<h2>Unused Assets</h2><table><thead><tr><th>File</th><th>Asset Path</th><th>Type</th><th>Line</th></tr></thead><tbody>`;
      for (const asset of result.unusedAssets) {
        html += `<tr><td>${asset.file}</td><td>${asset.assetPath}</td><td>${asset.assetType}</td><td>${asset.line || ""}</td></tr>`;
      }
      html += `</tbody></table>`;
    }

    html += `  </div>
</body>
</html>`;

    return html;
  }
}
