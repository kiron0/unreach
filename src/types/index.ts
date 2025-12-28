export interface UnusedPackage {
  name: string;
  version?: string;
}
export interface UnusedImport {
  file: string;
  importPath: string;
  line?: number;
  column?: number;
}
export interface UnusedExport {
  file: string;
  exportName: string;
  line?: number;
  column?: number;
}
export interface UnusedFunction {
  file: string;
  functionName: string;
  line?: number;
  column?: number;
}
export interface UnusedVariable {
  file: string;
  variableName: string;
  line?: number;
  column?: number;
}
export interface UnusedFile {
  file: string;
}
export interface UnusedConfig {
  file: string;
  configKey: string;
  line?: number;
}
export interface UnusedScript {
  scriptName: string;
}
export interface UnusedType {
  file: string;
  typeName: string;
  typeKind: "interface" | "type" | "enum";
  line?: number;
  column?: number;
}
export interface UnusedCSSClass {
  file: string;
  className: string;
  line?: number;
}
export interface UnusedAsset {
  file: string;
  assetPath: string;
  assetType: "image" | "font" | "other";
  line?: number;
  column?: number;
}
export interface ScanResult {
  unusedPackages: UnusedPackage[];
  unusedImports: UnusedImport[];
  unusedExports: UnusedExport[];
  unusedFunctions: UnusedFunction[];
  unusedVariables: UnusedVariable[];
  unusedFiles: UnusedFile[];
  unusedConfigs: UnusedConfig[];
  unusedScripts: UnusedScript[];
  unusedTypes: UnusedType[];
  unusedCSSClasses: UnusedCSSClass[];
  unusedAssets: UnusedAsset[];
}
import type { OutputFormat } from "../utils/export.js";

export interface ScanOptions {
  entry?: string | string[];
  fix?: boolean;
  export?: OutputFormat | OutputFormat[];
  exportPath?: string;
  cwd?: string;
  quiet?: boolean;
  noProgress?: boolean;
  history?: boolean;
  noIncremental?: boolean;
  visualize?: boolean;
  benchmark?: boolean;
  verbose?: boolean;
  debug?: boolean;
  groupBy?: "type" | "file";
  interactive?: boolean;
}
export interface ImportInfo {
  path: string;
  specifiers: Set<string>;
  isDefault: boolean;
  isNamespace: boolean;
  isTypeOnly: boolean;
  typeSpecifiers: Set<string>;
  line?: number;
  column?: number;
}
export interface DynamicImportInfo {
  path: string;
  type: "import" | "require";
  isConditional: boolean;
  isTemplateLiteral: boolean;
  webpackChunkName?: string;
  line?: number;
  column?: number;
}
export interface ReExportInfo {
  sourceFile: string;
  exportedName: string;
}
export interface TypeInfo {
  name: string;
  kind: "interface" | "type" | "enum";
  line?: number;
  column?: number;
  isExported: boolean;
}
export interface DependencyNode {
  file: string;
  imports: string[];
  importDetails: Map<string, ImportInfo>;
  dynamicImports: DynamicImportInfo[];
  exports: Map<string, ExportInfo>;
  reExports: Map<string, ReExportInfo>;
  functions: Map<string, FunctionInfo>;
  classes: Map<string, ClassInfo>;
  variables: Map<string, VariableInfo>;
  types: Map<string, TypeInfo>;
  variableReferences: Set<string>;
  functionCalls: Set<string>;
  jsxElements: Set<string>;
  cssClasses: Set<string>;
  isEntryPoint: boolean;
}
export interface ExportInfo {
  name: string;
  type: "named" | "default" | "namespace";
  line?: number;
  column?: number;
}
export interface FunctionInfo {
  name: string;
  line?: number;
  column?: number;
  isExported: boolean;
}
export interface ClassInfo {
  name: string;
  line?: number;
  column?: number;
  isExported: boolean;
}
export interface VariableInfo {
  name: string;
  line?: number;
  column?: number;
  isExported: boolean;
}
