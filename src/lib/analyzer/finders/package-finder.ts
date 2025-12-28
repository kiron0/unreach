import * as fs from "fs";
import * as path from "path";
import type { UnusedPackage } from "../../../types/index.js";

export function findUnusedPackages(
  cwd: string,
  usedPackages: Set<string>,
): UnusedPackage[] {
  const packageJsonPath = path.join(cwd, "package.json");
  if (!fs.existsSync(packageJsonPath)) {
    return [];
  }
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
    const dependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
      ...packageJson.peerDependencies,
    };
    const hasTypeScript =
      usedPackages.has("typescript") ||
      Object.keys(dependencies).includes("typescript");
    const unused: UnusedPackage[] = [];
    for (const [name, version] of Object.entries(dependencies)) {
      if (name.startsWith("@types/") && hasTypeScript) {
        continue;
      }
      if (!usedPackages.has(name)) {
        unused.push({
          name,
          version: version as string,
        });
      }
    }
    return unused;
  } catch {
    return [];
  }
}
