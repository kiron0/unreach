import * as fs from "fs";
import * as path from "path";
import type { UnusedScript } from "../../../types/index.js";

export function findUnusedScripts(
  cwd: string,
  usedPackages: Set<string>,
): UnusedScript[] {
  const packageJsonPath = path.join(cwd, "package.json");
  if (!fs.existsSync(packageJsonPath)) {
    return [];
  }
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
    const scripts = packageJson.scripts || {};
    const unused: UnusedScript[] = [];
    const usedScripts = new Set<string>();
    const commonScripts = new Set([
      "prepublish",
      "prepublishOnly",
      "prepack",
      "postpack",
      "publish",
      "postpublish",
      "preinstall",
      "install",
      "postinstall",
      "preuninstall",
      "uninstall",
      "postuninstall",
      "preversion",
      "version",
      "postversion",
      "pretest",
      "test",
      "posttest",
      "prestop",
      "stop",
      "poststop",
      "prestart",
      "start",
      "poststart",
      "prerestart",
      "restart",
      "postrestart",
      "preshrinkwrap",
      "shrinkwrap",
      "postshrinkwrap",
      "dev",
      "build",
      "format",
      "lint",
      "typecheck",
    ]);
    for (const [scriptName, scriptCommand] of Object.entries(scripts)) {
      const command = String(scriptCommand);
      const isReferenced = Object.entries(scripts).some(
        ([otherName, otherCmd]) =>
          otherName !== scriptName &&
          (String(otherCmd).includes(`npm run ${scriptName}`) ||
            String(otherCmd).includes(`npm ${scriptName}`) ||
            String(otherCmd).includes(`yarn ${scriptName}`) ||
            String(otherCmd).includes(`pnpm ${scriptName}`) ||
            String(otherCmd).includes(`bun run ${scriptName}`)),
      );
      if (commonScripts.has(scriptName)) {
        usedScripts.add(scriptName);
        continue;
      }
      if (packageJson.bin) {
        const binScripts =
          typeof packageJson.bin === "string"
            ? [packageJson.bin]
            : Object.values(packageJson.bin);
        const binScriptNames = binScripts.map((b: string) =>
          path.basename(b as string),
        );
        if (binScriptNames.includes(scriptName)) {
          usedScripts.add(scriptName);
          continue;
        }
      }
      if (isReferenced) {
        usedScripts.add(scriptName);
        continue;
      }
      const toolPatterns = [
        /\btsup\b/g,
        /\bprettier\b/g,
        /\btypescript\b/g,
        /\btsc\b/g,
        /\bterser\b/g,
        /\besbuild\b/g,
        /\bwebpack\b/g,
        /\bvite\b/g,
        /\brollup\b/g,
        /\bjest\b/g,
        /\bvitest\b/g,
        /\beslint\b/g,
        /\bvitepress\b/g,
        /\btsx\b/g,
      ];
      let hasTool = false;
      for (const pattern of toolPatterns) {
        if (pattern.test(command)) {
          hasTool = true;
          const toolName = pattern.source
            .replace(/\\b/g, "")
            .replace(/\//g, "");
          const packageMap: Record<string, string> = {
            tsup: "tsup",
            prettier: "prettier",
            typescript: "typescript",
            tsc: "typescript",
            terser: "terser",
            esbuild: "esbuild",
            webpack: "webpack",
            vite: "vite",
            rollup: "rollup",
            jest: "jest",
            vitest: "vitest",
            eslint: "eslint",
            vitepress: "vitepress",
            tsx: "tsx",
          };
          const packageName = packageMap[toolName];
          if (packageName) {
            usedPackages.add(packageName);
          }
          break;
        }
      }
      if (!hasTool && !usedScripts.has(scriptName)) {
        unused.push({ scriptName });
      }
    }
    return unused;
  } catch {
    return [];
  }
}
