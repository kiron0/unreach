import * as fs from "fs";
import type { UnusedCSSClass } from "../../../types/index.js";
import type { DependencyGraph } from "../../graph.js";

export function findUnusedCSSClasses(
  graph: DependencyGraph,
  usedCSSClasses: Set<string>,
): UnusedCSSClass[] {
  const unused: UnusedCSSClass[] = [];
  const cssFiles = graph.getCSSFiles();

  for (const [cssFile, definedClasses] of cssFiles) {
    for (const className of definedClasses) {
      if (!usedCSSClasses.has(className)) {
        let line: number | undefined;
        try {
          const content = fs.readFileSync(cssFile, "utf-8");
          const lines = content.split("\n");
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes(`.${className}`)) {
              line = i + 1;
              break;
            }
          }
        } catch {}

        unused.push({
          file: cssFile,
          className,
          line,
        });
      }
    }
  }

  return unused;
}
