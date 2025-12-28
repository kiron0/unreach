import { parse } from "@typescript-eslint/typescript-estree";
import * as fs from "fs";
import type {
  ClassInfo,
  DependencyNode,
  DynamicImportInfo,
  ExportInfo,
  FunctionInfo,
  ImportInfo,
  TypeInfo,
  VariableInfo,
} from "../types/index.js";
import { AnalysisCache } from "./cache.js";

export class ASTParser {
  private fileCache = new Map<string, string>();
  private astCache: AnalysisCache | null = null;
  private maxFileCacheSize = 50;
  private variableValues = new Map<string, string>();
  private maxFileSize: number;

  constructor(cache?: AnalysisCache, maxFileSize: number = 10 * 1024 * 1024) {
    this.astCache = cache || null;
    this.maxFileSize = maxFileSize;
  }

  parseFile(
    filePath: string,
    useCache: boolean = true,
    verbose: boolean = false,
  ): DependencyNode | null {
    try {
      const content = this.readFile(filePath);
      if (!content) return null;

      if (useCache && this.astCache) {
        const fileHash = this.astCache.getFileHash(filePath);
        const cachedAST = this.astCache.loadCachedAST(filePath, fileHash);
        if (cachedAST) {
          return cachedAST;
        }
      }

      const ast = parse(content, {
        loc: true,
        range: true,
        jsx: true,
        useJSXTextNode: true,
        comment: true,
      });
      this.addParentReferences(ast);
      this.variableValues.clear();
      const imports: string[] = [];
      const importDetails = new Map<string, ImportInfo>();
      const dynamicImports: DynamicImportInfo[] = [];
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
      const jsxElements = new Set<string>();
      const types = new Map<string, TypeInfo>();
      const cssClasses = new Set<string>();
      this.traverseAST(ast, {
        onImport: (
          importPath,
          specifiers,
          isDefault,
          isNamespace,
          isTypeOnly,
          typeSpecifiers,
          loc,
        ) => {
          imports.push(importPath);
          if (!importDetails.has(importPath)) {
            importDetails.set(importPath, {
              path: importPath,
              specifiers: new Set(specifiers || []),
              isDefault: isDefault || false,
              isNamespace: isNamespace || false,
              isTypeOnly: isTypeOnly || false,
              typeSpecifiers: new Set(typeSpecifiers || []),
              line: loc?.start.line,
              column: loc?.start.column,
            });
          } else {
            const existing = importDetails.get(importPath)!;
            for (const spec of specifiers || []) {
              existing.specifiers.add(spec);
            }
            for (const spec of typeSpecifiers || []) {
              existing.typeSpecifiers.add(spec);
            }
            if (isDefault) existing.isDefault = true;
            if (isNamespace) existing.isNamespace = true;
            if (isTypeOnly) existing.isTypeOnly = true;
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
        onJSXElement: (name) => {
          jsxElements.add(name);
        },
        onReExport: (exportedName, sourcePath, importedName) => {
          reExports.set(exportedName, {
            sourceFile: sourcePath,
            exportedName: importedName,
          });
        },
        onDynamicImport: (
          path,
          type,
          isConditional,
          isTemplateLiteral,
          webpackChunkName,
          loc,
        ) => {
          dynamicImports.push({
            path,
            type,
            isConditional,
            isTemplateLiteral,
            webpackChunkName,
            line: loc?.start.line,
            column: loc?.start.column,
          });
        },
        onType: (name, kind, loc, isExported) => {
          types.set(name, {
            name,
            kind,
            line: loc?.start.line,
            column: loc?.start.column,
            isExported: isExported ?? false,
          });
        },
        onCSSClass: (className) => {
          cssClasses.add(className);
        },
      });

      const node: DependencyNode = {
        file: filePath,
        imports,
        importDetails,
        dynamicImports,
        exports,
        reExports,
        functions,
        classes,
        variables,
        types,
        variableReferences,
        functionCalls,
        jsxElements,
        cssClasses,
        isEntryPoint: false,
      };

      if (useCache && this.astCache) {
        const fileHash = this.astCache.getFileHash(filePath);
        this.astCache.saveCachedAST(filePath, node, fileHash);
      }

      return node;
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
      const stats = fs.statSync(filePath);
      if (stats.size > this.maxFileSize) {
        console.warn(
          `⚠️  Skipping large file: ${filePath} (${(stats.size / 1024 / 1024).toFixed(2)}MB, limit: ${(this.maxFileSize / 1024 / 1024).toFixed(2)}MB)`,
        );
        return null;
      }

      const content = fs.readFileSync(filePath, "utf-8");

      if (this.fileCache.size >= this.maxFileCacheSize) {
        const firstKey = this.fileCache.keys().next().value;
        if (firstKey) {
          this.fileCache.delete(firstKey);
        }
      }

      this.fileCache.set(filePath, content);
      return content;
    } catch {
      return null;
    }
  }

  clearFileCache(): void {
    this.fileCache.clear();
  }
  private traverseAST(
    node: any,
    callbacks: {
      onImport: (
        path: string,
        specifiers?: string[],
        isDefault?: boolean,
        isNamespace?: boolean,
        isTypeOnly?: boolean,
        typeSpecifiers?: string[],
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
      onJSXElement: (name: string) => void;
      onReExport: (
        exportedName: string,
        sourcePath: string,
        importedName: string,
      ) => void;
      onDynamicImport: (
        path: string,
        type: "import" | "require",
        isConditional: boolean,
        isTemplateLiteral: boolean,
        webpackChunkName?: string,
        loc?: any,
      ) => void;
      onType: (
        name: string,
        kind: "interface" | "type" | "enum",
        loc?: any,
        isExported?: boolean,
      ) => void;
      onCSSClass: (className: string) => void;
    },
    isInDeclaration: boolean = false,
  ) {
    if (!node || typeof node !== "object") return;
    if (node.type === "ImportDeclaration" && node.source?.value) {
      const importPath = node.source.value;
      const specifiers: string[] = [];
      const typeSpecifiers: string[] = [];
      let isDefault = false;
      let isNamespace = false;
      const isTypeOnly =
        node.importKind === "type" || node.importKind === "type";

      if (node.specifiers) {
        for (const spec of node.specifiers) {
          if (spec.type === "ImportDefaultSpecifier") {
            isDefault = true;
            if (spec.local?.name) {
              if (isTypeOnly || spec.importKind === "type") {
                typeSpecifiers.push(spec.local.name);
              } else {
                specifiers.push(spec.local.name);
              }
            }
          } else if (spec.type === "ImportNamespaceSpecifier") {
            isNamespace = true;
            if (spec.local?.name) {
              if (isTypeOnly || spec.importKind === "type") {
                typeSpecifiers.push(spec.local.name);
              } else {
                specifiers.push(spec.local.name);
              }
            }
          } else if (spec.type === "ImportSpecifier") {
            const importedName = spec.imported?.name || spec.local?.name;
            if (importedName) {
              if (isTypeOnly || spec.importKind === "type") {
                typeSpecifiers.push(importedName);
              } else {
                specifiers.push(importedName);
              }
            }
          }
        }
      }
      callbacks.onImport(
        importPath,
        specifiers.length > 0 ? specifiers : undefined,
        isDefault,
        isNamespace,
        isTypeOnly,
        typeSpecifiers.length > 0 ? typeSpecifiers : undefined,
        node.loc,
      );
    }
    if (node.type === "CallExpression" && node.callee?.type === "Import") {
      const arg = node.arguments[0];
      if (arg) {
        const webpackChunkName = this.extractWebpackMagicComment(node);

        const importPath = this.extractStringFromNode(arg, node);
        if (importPath) {
          const isTemplateLiteral = arg.type === "TemplateLiteral";
          const isConditional = this.isInConditionalContext(node);
          callbacks.onDynamicImport(
            importPath,
            "import",
            isConditional,
            isTemplateLiteral,
            webpackChunkName || undefined,
            node.loc,
          );
          callbacks.onImport(
            importPath,
            undefined,
            false,
            false,
            false,
            undefined,
            node.loc,
          );
        }
      }
    }

    if (
      node.type === "CallExpression" &&
      node.callee?.type === "MemberExpression" &&
      node.callee.object?.type === "MetaProperty" &&
      node.callee.object.meta?.name === "import" &&
      node.callee.object.property?.name === "meta" &&
      node.callee.property?.type === "Identifier" &&
      node.callee.property.name === "resolve"
    ) {
      const arg = node.arguments[0];
      if (arg) {
        const importPath = this.extractStringFromNode(arg, node);
        if (importPath) {
          const isTemplateLiteral = arg.type === "TemplateLiteral";
          const isConditional = this.isInConditionalContext(node);
          const webpackChunkName = this.extractWebpackMagicComment(node);
          callbacks.onDynamicImport(
            importPath,
            "import",
            isConditional,
            isTemplateLiteral,
            webpackChunkName || undefined,
            node.loc,
          );
          callbacks.onImport(
            importPath,
            undefined,
            false,
            false,
            false,
            undefined,
            node.loc,
          );
        }
      }
    }

    if (
      node.type === "CallExpression" &&
      node.callee?.type === "Identifier" &&
      node.callee.name === "require" &&
      node.arguments.length > 0
    ) {
      const arg = node.arguments[0];
      const importPath = this.extractStringFromNode(arg, node);
      if (importPath) {
        const isTemplateLiteral = arg.type === "TemplateLiteral";
        const isConditional = this.isInConditionalContext(node);
        const webpackChunkName = this.extractWebpackMagicComment(node);
        callbacks.onDynamicImport(
          importPath,
          "require",
          isConditional,
          isTemplateLiteral,
          webpackChunkName || undefined,
          node.loc,
        );
        callbacks.onImport(
          importPath,
          undefined,
          false,
          false,
          false,
          undefined,
          node.loc,
        );
      }
    }

    if (
      node.type === "CallExpression" &&
      node.callee?.type === "MemberExpression" &&
      node.callee.object?.type === "Identifier" &&
      node.callee.object.name === "require" &&
      node.callee.property?.type === "Identifier" &&
      node.callee.property.name === "ensure" &&
      node.arguments.length >= 2
    ) {
      const dependencies = node.arguments[0];
      if (dependencies?.type === "ArrayExpression") {
        for (const dep of dependencies.elements || []) {
          const importPath = this.extractStringFromNode(dep, node);
          if (importPath) {
            callbacks.onDynamicImport(
              importPath,
              "require",
              false,
              false,
              undefined,
              node.loc,
            );
            callbacks.onImport(
              importPath,
              undefined,
              false,
              false,
              false,
              undefined,
              node.loc,
            );
          }
        }
      }
    }

    if (
      node.type === "CallExpression" &&
      node.callee?.type === "MemberExpression" &&
      node.callee.object?.type === "Identifier" &&
      node.callee.object.name === "require" &&
      node.callee.property?.type === "Identifier" &&
      node.callee.property.name === "context" &&
      node.arguments.length >= 1
    ) {
      const directory = this.extractStringFromNode(node.arguments[0], node);
      if (directory) {
        callbacks.onDynamicImport(
          directory,
          "require",
          false,
          false,
          undefined,
          node.loc,
        );
      }
    }

    if (node.type === "VariableDeclaration") {
      for (const declarator of node.declarations || []) {
        if (
          declarator.id?.type === "Identifier" &&
          declarator.id.name &&
          declarator.init
        ) {
          const value = this.extractConstantValue(declarator.init);
          if (value !== null) {
            this.variableValues.set(declarator.id.name, value);
          }
        }
      }
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
          false,
          undefined,
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
        callbacks.onImport(
          node.source.value,
          undefined,
          false,
          true,
          false,
          undefined,
          node.loc,
        );
      }
      callbacks.onExport("*", "namespace", node.loc);
    }

    if (node.type === "TSInterfaceDeclaration" && node.id?.name) {
      const isExported =
        node.parent?.type === "ExportNamedDeclaration" ||
        node.parent?.type === "ExportDefaultDeclaration";
      callbacks.onType(node.id.name, "interface", node.id.loc, isExported);
      callbacks.onExport(node.id.name, "named", node.id.loc);
    }
    if (node.type === "TSTypeAliasDeclaration" && node.id?.name) {
      const isExported =
        node.parent?.type === "ExportNamedDeclaration" ||
        node.parent?.type === "ExportDefaultDeclaration";
      callbacks.onType(node.id.name, "type", node.id.loc, isExported);
      callbacks.onExport(node.id.name, "named", node.id.loc);
    }
    if (node.type === "TSEnumDeclaration" && node.id?.name) {
      const isExported =
        node.parent?.type === "ExportNamedDeclaration" ||
        node.parent?.type === "ExportDefaultDeclaration";
      callbacks.onType(node.id.name, "enum", node.id.loc, isExported);
      callbacks.onExport(node.id.name, "named", node.id.loc);
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
    if (node.type === "JSXElement" && node.openingElement) {
      const name = node.openingElement.name;
      if (name.type === "JSXIdentifier" && name.name) {
        callbacks.onJSXElement(name.name);
      } else if (name.type === "JSXMemberExpression") {
        if (name.property?.type === "JSXIdentifier" && name.property.name) {
          callbacks.onJSXElement(name.property.name);
        }
      }

      if (node.openingElement.attributes) {
        for (const attr of node.openingElement.attributes) {
          if (
            attr.type === "JSXAttribute" &&
            (attr.name?.name === "className" || attr.name?.name === "class")
          ) {
            if (attr.value) {
              this.extractCSSClassesFromJSXAttribute(attr.value, callbacks);
            }
          }
        }
      }
    }
    if (node.type === "Identifier" && node.name) {
      const parent = (node as any).parent;
      const isDeclaration =
        parent &&
        ((parent.type === "VariableDeclarator" && parent.id === node) ||
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

  private extractConstantValue(node: any): string | null {
    if (!node) return null;

    if (node.type === "Literal" && typeof node.value === "string") {
      return node.value;
    }

    if (node.type === "TemplateLiteral") {
      const parts: string[] = [];
      let hasDynamicParts = false;
      for (let i = 0; i < node.quasis.length; i++) {
        const quasi = node.quasis[i];
        if (quasi?.value?.raw) {
          parts.push(quasi.value.raw);
        }
        if (i < node.expressions.length) {
          const expr = node.expressions[i];
          const exprValue = this.extractConstantValue(expr);
          if (exprValue !== null) {
            parts.push(exprValue);
          } else {
            hasDynamicParts = true;
            break;
          }
        }
      }
      return hasDynamicParts ? null : parts.join("");
    }

    if (node.type === "BinaryExpression" && node.operator === "+") {
      const left = this.extractConstantValue(node.left);
      const right = this.extractConstantValue(node.right);
      if (left !== null && right !== null) {
        return left + right;
      }
    }

    if (node.type === "Identifier" && node.name) {
      return this.variableValues.get(node.name) || null;
    }

    return null;
  }

  private extractStringFromNode(node: any, contextNode?: any): string | null {
    if (!node) return null;

    if (node.type === "Literal" && typeof node.value === "string") {
      return node.value;
    }

    if (node.type === "TemplateLiteral") {
      const parts: string[] = [];
      let hasUnknownParts = false;
      for (let i = 0; i < node.quasis.length; i++) {
        const quasi = node.quasis[i];
        if (quasi?.value?.raw) {
          parts.push(quasi.value.raw);
        }
        if (i < node.expressions.length) {
          const expr = node.expressions[i];
          const exprValue = this.extractConstantValue(expr);
          if (exprValue !== null) {
            parts.push(exprValue);
          } else if (expr?.type === "Identifier" && expr.name) {
            const varValue = this.variableValues.get(expr.name);
            if (varValue !== undefined) {
              parts.push(varValue);
            } else {
              parts.push(`\${${expr.name}}`);
              hasUnknownParts = true;
            }
          } else {
            parts.push("${?}");
            hasUnknownParts = true;
          }
        }
      }
      return parts.join("");
    }

    if (node.type === "BinaryExpression" && node.operator === "+") {
      const left = this.extractStringFromNode(node.left, contextNode);
      const right = this.extractStringFromNode(node.right, contextNode);
      if (left !== null && right !== null) {
        return left + right;
      }
      if (left === "__dirname" || right === "__dirname") {
        const other = left === "__dirname" ? right : left;
        if (other && other.startsWith("/")) {
          return `__dirname${other}`;
        }
      }
    }

    if (
      node.type === "CallExpression" &&
      node.callee?.type === "MemberExpression" &&
      node.callee.object?.type === "Identifier" &&
      node.callee.object.name === "path" &&
      node.callee.property?.type === "Identifier" &&
      node.callee.property.name === "join" &&
      node.arguments.length > 0
    ) {
      const firstArg = node.arguments[0];
      if (
        firstArg?.type === "Identifier" &&
        (firstArg.name === "__dirname" || firstArg.name === "__filename")
      ) {
        const parts: string[] = [firstArg.name];
        for (let i = 1; i < node.arguments.length; i++) {
          const arg = this.extractStringFromNode(
            node.arguments[i],
            contextNode,
          );
          if (arg !== null) {
            parts.push(arg);
          } else {
            return null;
          }
        }
        return parts.join("/");
      }
    }

    if (node.type === "MemberExpression") {
      if (
        node.object?.type === "Identifier" &&
        (node.object.name === "__dirname" ||
          node.object.name === "__filename") &&
        node.property?.type === "Identifier" &&
        node.property.name
      ) {
        return `${node.object.name}.${node.property.name}`;
      }
    }

    if (node.type === "Identifier" && node.name) {
      const varValue = this.variableValues.get(node.name);
      if (varValue !== undefined) {
        return varValue;
      }
      if (node.name === "__dirname" || node.name === "__filename") {
        return node.name;
      }
    }

    return null;
  }

  private isInConditionalContext(node: any): boolean {
    let current: any = node;
    while (current) {
      const parent = (current as any).parent;
      if (!parent) break;

      if (
        parent.type === "IfStatement" ||
        parent.type === "ConditionalExpression" ||
        parent.type === "LogicalExpression" ||
        (parent.type === "CallExpression" &&
          parent.callee?.type === "Identifier" &&
          (parent.callee.name === "require" || parent.callee.name === "import"))
      ) {
        return true;
      }

      current = parent;
    }
    return false;
  }

  private extractCSSClassesFromJSXAttribute(
    value: any,
    callbacks: { onCSSClass: (className: string) => void },
  ): void {
    if (!value) return;

    if (value.type === "Literal" && typeof value.value === "string") {
      const classes = value.value.split(/\s+/).filter((c: string) => c.trim());
      for (const className of classes) {
        if (className) {
          callbacks.onCSSClass(className);
        }
      }
      return;
    }

    if (value.type === "TemplateLiteral") {
      for (const quasi of value.quasis || []) {
        if (quasi?.value?.raw) {
          const classes = quasi.value.raw
            .split(/\s+/)
            .filter((c: string) => c.trim());
          for (const className of classes) {
            if (className) {
              callbacks.onCSSClass(className);
            }
          }
        }
      }
      return;
    }

    if (value.type === "JSXExpressionContainer") {
      return;
    }
  }

  private extractWebpackMagicComment(node: any): string | null {
    if (!node.leadingComments || !Array.isArray(node.leadingComments)) {
      return null;
    }

    for (const comment of node.leadingComments) {
      if (comment.type === "Block") {
        const text = comment.value || "";
        const chunkNameMatch = text.match(
          /webpackChunkName:\s*["']([^"']+)["']/,
        );
        if (chunkNameMatch) {
          return chunkNameMatch[1];
        }
      }
    }

    return null;
  }
}
