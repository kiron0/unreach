import type { ScanResult } from "../../types/index.js";
import type { UnreachConfig } from "../config.js";
import { ConfigLoader } from "../config.js";

export function applyIgnores(
  result: ScanResult,
  config: UnreachConfig | null,
  configLoader: ConfigLoader,
): ScanResult {
  if (!config?.ignore) {
    return result;
  }

  const { ignore } = config;

  if (ignore.packages && ignore.packages.length > 0) {
    result.unusedPackages = result.unusedPackages.filter(
      (pkg) => !configLoader.matchesIgnorePattern(pkg.name, ignore.packages!),
    );
  }

  if (ignore.files && ignore.files.length > 0) {
    result.unusedFiles = result.unusedFiles.filter(
      (file) => !configLoader.matchesIgnorePattern(file.file, ignore.files!),
    );
  }

  if (ignore.exports && ignore.exports.length > 0) {
    result.unusedExports = result.unusedExports.filter(
      (exp) =>
        !configLoader.matchesIgnorePattern(exp.exportName, ignore.exports!),
    );
  }

  if (ignore.functions && ignore.functions.length > 0) {
    result.unusedFunctions = result.unusedFunctions.filter(
      (func) =>
        !configLoader.matchesIgnorePattern(
          func.functionName,
          ignore.functions!,
        ),
    );
  }

  if (ignore.variables && ignore.variables.length > 0) {
    result.unusedVariables = result.unusedVariables.filter(
      (var_) =>
        !configLoader.matchesIgnorePattern(
          var_.variableName,
          ignore.variables!,
        ),
    );
  }

  if (ignore.imports && ignore.imports.length > 0) {
    result.unusedImports = result.unusedImports.filter(
      (imp) =>
        !configLoader.matchesIgnorePattern(imp.importPath, ignore.imports!),
    );
  }

  if (ignore.types && ignore.types.length > 0) {
    result.unusedTypes = result.unusedTypes.filter(
      (type) =>
        !configLoader.matchesIgnorePattern(type.typeName, ignore.types!),
    );
  }

  if (ignore.cssClasses && ignore.cssClasses.length > 0) {
    result.unusedCSSClasses = result.unusedCSSClasses.filter(
      (css) =>
        !configLoader.matchesIgnorePattern(css.className, ignore.cssClasses!),
    );
  }

  if (ignore.assets && ignore.assets.length > 0) {
    result.unusedAssets = result.unusedAssets.filter(
      (asset) =>
        !configLoader.matchesIgnorePattern(asset.assetPath, ignore.assets!),
    );
  }

  return result;
}
