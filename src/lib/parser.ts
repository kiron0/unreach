import { parse } from "@typescript-eslint/typescript-estree";
import * as fs from "fs";
import type {
  ClassInfo,
  DependencyNode,
  ExportInfo,
  FunctionInfo,
  ImportInfo,
  VariableInfo,
} from "../types/index.js";
export class ASTParser {
  private fileCache = new Map<string, string>();
  parseFile(filePath: string): DependencyNode | null {
    try {
      const content = this.readFile(filePath);
      if (!content) return null;
      const ast = parse(content, {
        loc: true,
        range: true,
        jsx: true,
        useJSXTextNode: true,
      });
      this.addParentReferences(ast);
      const imports: string[] = [];
      const importDetails = new Map<string, ImportInfo>();
      const exports = new Map<string, ExportInfo>();
      const reExports = new Map<
        string,
        { sourceFile: string; exportedName: string }
      >();
      const functions = new Map<string, FunctionInfo>();
      const classes = new Map<string, ClassInfo>();
      const variables = new Map<string, VariableInfo>();
      const variableReferences = new Set<string>();
      const functionCalls = new Set<string>();
      this.traverseAST(ast, {
        onImport: (importPath, specifiers, isDefault, isNamespace, loc) => {
          imports.push(importPath);
          if (!importDetails.has(importPath)) {
            importDetails.set(importPath, {
              path: importPath,
              specifiers: new Set(specifiers || []),
              isDefault: isDefault || false,
              isNamespace: isNamespace || false,
              line: loc?.start.line,
              column: loc?.start.column,
            });
          } else {
            const existing = importDetails.get(importPath)!;
            for (const spec of specifiers || []) {
              existing.specifiers.add(spec);
            }
            if (isDefault) existing.isDefault = true;
            if (isNamespace) existing.isNamespace = true;
          }
        },
        onExport: (name, type, loc) => {
          exports.set(name, {
            name,
            type,
            line: loc?.start.line,
            column: loc?.start.column,
          });
        },
        onFunction: (name, loc, isExported) => {
          functions.set(name, {
            name,
            line: loc?.start.line,
            column: loc?.start.column,
            isExported: isExported ?? false,
          });
        },
        onClass: (name, loc, isExported) => {
          classes.set(name, {
            name,
            line: loc?.start.line,
            column: loc?.start.column,
            isExported: isExported ?? false,
          });
        },
        onVariable: (name, loc, isExported) => {
          variables.set(name, {
            name,
            line: loc?.start.line,
            column: loc?.start.column,
            isExported: isExported ?? false,
          });
        },
        onVariableReference: (name) => {
          variableReferences.add(name);
        },
        onFunctionCall: (name) => {
          functionCalls.add(name);
        },
        onReExport: (exportedName, sourcePath, importedName) => {
          reExports.set(exportedName, {
            sourceFile: sourcePath,
            exportedName: importedName,
          });
        },
      });
      return {
        file: filePath,
        imports,
        importDetails,
        exports,
        reExports,
        functions,
        classes,
        variables,
        variableReferences,
        functionCalls,
        isEntryPoint: false,
      };
    } catch (error) {
      const parseError =
        error instanceof Error ? error : new Error(String(error));
      console.warn(`Failed to parse ${filePath}:`, parseError.message);
      return null;
    }
  }
  private addParentReferences(node: any, parent: any = null): void {
    if (!node || typeof node !== "object") return;
    (node as any).parent = parent;
    for (const key in node) {
      if (
        key === "parent" ||
        key === "leadingComments" ||
        key === "trailingComments"
      ) {
        continue;
      }
      const child = node[key];
      if (Array.isArray(child)) {
        for (const item of child) {
          if (item && typeof item === "object") {
            this.addParentReferences(item, node);
          }
        }
      } else if (child && typeof child === "object") {
        this.addParentReferences(child, node);
      }
    }
  }
  private readFile(filePath: string): string | null {
    if (this.fileCache.has(filePath)) {
      return this.fileCache.get(filePath)!;
    }
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      this.fileCache.set(filePath, content);
      return content;
    } catch {
      return null;
    }
  }
  private traverseAST(
    node: any,
    callbacks: {
      onImport: (
        path: string,
        specifiers?: string[],
        isDefault?: boolean,
        isNamespace?: boolean,
        loc?: any,
      ) => void;
      onExport: (
        name: string,
        type: "named" | "default" | "namespace",
        loc?: any,
      ) => void;
      onFunction: (name: string, loc?: any, isExported?: boolean) => void;
      onClass: (name: string, loc?: any, isExported?: boolean) => void;
      onVariable: (name: string, loc?: any, isExported?: boolean) => void;
      onVariableReference: (name: string) => void;
      onFunctionCall: (name: string) => void;
      onReExport: (
        exportedName: string,
        sourcePath: string,
        importedName: string,
      ) => void;
    },
    isInDeclaration: boolean = false,
  ) {
    if (!node || typeof node !== "object") return;
    if (node.type === "ImportDeclaration" && node.source?.value) {
      const importPath = node.source.value;
      const specifiers: string[] = [];
      let isDefault = false;
      let isNamespace = false;
      if (node.specifiers) {
        for (const spec of node.specifiers) {
          if (spec.type === "ImportDefaultSpecifier") {
            isDefault = true;
            if (spec.local?.name) {
              specifiers.push(spec.local.name);
            }
          } else if (spec.type === "ImportNamespaceSpecifier") {
            isNamespace = true;
            if (spec.local?.name) {
              specifiers.push(spec.local.name);
            }
          } else if (spec.type === "ImportSpecifier") {
            const importedName = spec.imported?.name || spec.local?.name;
            if (importedName) {
              specifiers.push(importedName);
            }
          }
        }
      }
      callbacks.onImport(
        importPath,
        specifiers.length > 0 ? specifiers : undefined,
        isDefault,
        isNamespace,
        node.loc,
      );
    }
    if (
      node.type === "CallExpression" &&
      node.callee?.type === "Import" &&
      node.arguments[0]?.type === "Literal"
    ) {
      callbacks.onImport(
        node.arguments[0].value,
        undefined,
        false,
        false,
        node.loc,
      );
    }
    if (node.type === "ExportNamedDeclaration") {
      if (node.source?.value) {
        const reExportSpecifiers: string[] = [];
        if (node.specifiers) {
          for (const spec of node.specifiers) {
            if (spec.exported?.name) {
              reExportSpecifiers.push(spec.exported.name);
              const importedName = spec.imported?.name || spec.exported.name;
              callbacks.onReExport(
                spec.exported.name,
                node.source.value,
                importedName,
              );
            }
          }
        }
        callbacks.onImport(
          node.source.value,
          reExportSpecifiers.length > 0 ? reExportSpecifiers : undefined,
          false,
          false,
          node.loc,
        );
      }
      if (node.declaration) {
        this.extractFromDeclaration(node.declaration, callbacks, true);
      }
      if (node.specifiers) {
        for (const spec of node.specifiers) {
          if (spec.exported?.name) {
            callbacks.onExport(spec.exported.name, "named", spec.exported.loc);
          }
        }
      }
    }
    if (node.type === "ExportDefaultDeclaration") {
      if (node.declaration) {
        const name = this.getNameFromDeclaration(node.declaration);
        if (name) {
          callbacks.onExport(name, "default", node.loc);
        } else {
          callbacks.onExport("default", "default", node.loc);
        }
        this.extractFromDeclaration(node.declaration, callbacks, true);
      }
    }
    if (node.type === "ExportAllDeclaration") {
      if (node.source?.value) {
        callbacks.onImport(node.source.value, undefined, false, true, node.loc);
      }
      callbacks.onExport("*", "namespace", node.loc);
    }
    if (node.type === "FunctionDeclaration" && node.id?.name) {
      callbacks.onFunction(node.id.name, node.loc, false);
    }
    if (node.type === "ClassDeclaration" && node.id?.name) {
      callbacks.onClass(node.id.name, node.loc, false);
    }
    if (node.type === "VariableDeclaration") {
      for (const declarator of node.declarations || []) {
        if (declarator.id?.type === "Identifier" && declarator.id?.name) {
          const isExported =
            node.parent?.type === "ExportNamedDeclaration" ||
            node.parent?.type === "ExportDefaultDeclaration";
          callbacks.onVariable(
            declarator.id.name,
            declarator.id.loc,
            isExported,
          );
        } else if (declarator.id?.type === "ObjectPattern") {
          for (const prop of declarator.id.properties || []) {
            if (prop.type === "Property" && prop.key?.type === "Identifier") {
              const isExported =
                node.parent?.type === "ExportNamedDeclaration" ||
                node.parent?.type === "ExportDefaultDeclaration";
              callbacks.onVariable(prop.key.name, prop.key.loc, isExported);
            }
          }
        } else if (declarator.id?.type === "ArrayPattern") {
          for (const element of declarator.id.elements || []) {
            if (element?.type === "Identifier" && element.name) {
              const isExported =
                node.parent?.type === "ExportNamedDeclaration" ||
                node.parent?.type === "ExportDefaultDeclaration";
              callbacks.onVariable(element.name, element.loc, isExported);
            }
          }
        }
      }
    }
    if (
      node.type === "FunctionDeclaration" ||
      node.type === "FunctionExpression" ||
      node.type === "ArrowFunctionExpression"
    ) {
      for (const param of node.params || []) {
        if (param.type === "Identifier" && param.name) {
          callbacks.onVariableReference(param.name);
        } else if (param.type === "ObjectPattern") {
          for (const prop of param.properties || []) {
            if (prop.type === "Property" && prop.key?.type === "Identifier") {
              callbacks.onVariableReference(prop.key.name);
            }
          }
        } else if (param.type === "ArrayPattern") {
          for (const element of param.elements || []) {
            if (element?.type === "Identifier" && element.name) {
              callbacks.onVariableReference(element.name);
            }
          }
        }
      }
    }
    if (node.type === "CallExpression" && node.callee) {
      if (node.callee.type === "Identifier" && node.callee.name) {
        callbacks.onFunctionCall(node.callee.name);
      } else if (node.callee.type === "MemberExpression") {
        if (
          node.callee.property?.type === "Identifier" &&
          node.callee.property.name
        ) {
          callbacks.onFunctionCall(node.callee.property.name);
        }
      }
    }
    if (node.type === "TSInterfaceDeclaration" && node.id?.name) {
      const isExported =
        node.parent?.type === "ExportNamedDeclaration" ||
        node.parent?.type === "ExportDefaultDeclaration";
      callbacks.onExport(node.id.name, "named", node.id.loc);
    }
    if (node.type === "TSTypeAliasDeclaration" && node.id?.name) {
      const isExported =
        node.parent?.type === "ExportNamedDeclaration" ||
        node.parent?.type === "ExportDefaultDeclaration";
      callbacks.onExport(node.id.name, "named", node.id.loc);
    }
    if (node.type === "TSEnumDeclaration" && node.id?.name) {
      const isExported =
        node.parent?.type === "ExportNamedDeclaration" ||
        node.parent?.type === "ExportDefaultDeclaration";
      callbacks.onExport(node.id.name, "named", node.id.loc);
    }
    if (node.type === "Identifier" && node.name) {
      const parent = (node as any).parent;
      const isDeclaration =
        parent &&
        (parent.type === "VariableDeclarator" ||
          (parent.type === "FunctionDeclaration" && parent.id === node) ||
          (parent.type === "ClassDeclaration" && parent.id === node) ||
          parent.type === "PropertyDefinition" ||
          parent.type === "MethodDefinition" ||
          (parent.type === "Property" &&
            parent.key === node &&
            parent.kind !== "init") ||
          parent.type === "ImportSpecifier" ||
          parent.type === "ImportDefaultSpecifier" ||
          parent.type === "ImportNamespaceSpecifier" ||
          parent.type === "ExportSpecifier" ||
          (parent.type === "ObjectPattern" &&
            parent.properties?.some(
              (p: any) =>
                (p.type === "Property" && p.key === node) ||
                (p.type === "Identifier" && p === node),
            )) ||
          (parent.type === "ArrayPattern" && parent.elements?.includes(node)) ||
          (parent.type === "ForInStatement" && parent.left === node) ||
          (parent.type === "ForOfStatement" && parent.left === node) ||
          (parent.type === "ForStatement" && parent.init === node));
      if (!isDeclaration) {
        callbacks.onVariableReference(node.name);
      }
    }
    for (const key in node) {
      if (
        key === "parent" ||
        key === "leadingComments" ||
        key === "trailingComments"
      ) {
        continue;
      }
      const child = node[key];
      if (Array.isArray(child)) {
        for (const item of child) {
          this.traverseAST(item, callbacks, isInDeclaration);
        }
      } else if (child && typeof child === "object") {
        this.traverseAST(child, callbacks, isInDeclaration);
      }
    }
  }
  private extractFromDeclaration(
    declaration: any,
    callbacks: {
      onFunction: (name: string, loc?: any, isExported?: boolean) => void;
      onClass: (name: string, loc?: any, isExported?: boolean) => void;
    },
    isExported: boolean,
  ) {
    if (declaration.type === "FunctionDeclaration" && declaration.id?.name) {
      callbacks.onFunction(declaration.id.name, declaration.loc, isExported);
    }
    if (declaration.type === "ClassDeclaration" && declaration.id?.name) {
      callbacks.onClass(declaration.id.name, declaration.loc, isExported);
    }
  }
  private getNameFromDeclaration(declaration: any): string | null {
    if (declaration.id?.name) return declaration.id.name;
    if (declaration.name) return declaration.name;
    return null;
  }
}
