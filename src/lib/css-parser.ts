import * as fs from "fs";
import * as path from "path";

export class CSSParser {
  static parseCSSFile(filePath: string): Set<string> {
    const classes = new Set<string>();
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      return this.extractClasses(content);
    } catch {
      return classes;
    }
  }

  static extractClasses(cssContent: string): Set<string> {
    const classes = new Set<string>();

    const classSelectorRegex = /\.([a-zA-Z_-][a-zA-Z0-9_-]*)/g;
    let match;
    while ((match = classSelectorRegex.exec(cssContent)) !== null) {
      const className = match[1];
      if (
        !className.startsWith(":") &&
        !className.includes("(") &&
        !className.includes(")")
      ) {
        classes.add(className);
      }
    }

    const applyRegex = /@apply\s+([^;]+);/g;
    while ((match = applyRegex.exec(cssContent)) !== null) {
      const applyClasses = match[1].trim().split(/\s+/);
      for (const className of applyClasses) {
        if (className && !className.startsWith("!")) {
          classes.add(className);
        }
      }
    }

    return classes;
  }

  static isCSSFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return [".css", ".scss", ".sass", ".less", ".styl"].includes(ext);
  }
}
