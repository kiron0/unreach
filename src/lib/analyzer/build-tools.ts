import * as fs from "fs";
import * as path from "path";

export function markBuildToolsAndConfigs(
  cwd: string,
  usedPackages: Set<string>,
  reachableFiles: Set<string>,
): void {
  const packageJsonPath = path.join(cwd, "package.json");
  if (!fs.existsSync(packageJsonPath)) {
    return;
  }
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
    const scripts = packageJson.scripts || {};
    const scriptContent = Object.values(scripts).join(" ");

    const tools: Array<{
      tool: string;
      packageName: string;
      regex: RegExp;
      configFiles?: string[];
    }> = [
      {
        tool: "tsup",
        packageName: "tsup",
        regex: /\btsup\b/,
        configFiles: [
          "tsup.config.ts",
          "tsup.config.js",
          "tsup.config.mjs",
          "tsup.config.cjs",
        ],
      },
      {
        tool: "vite",
        packageName: "vite",
        regex: /\bvite\b/,
        configFiles: ["vite.config.ts", "vite.config.js", "vite.config.mjs"],
      },
      {
        tool: "webpack",
        packageName: "webpack",
        regex: /\bwebpack\b/,
        configFiles: ["webpack.config.js", "webpack.config.ts"],
      },
      {
        tool: "rollup",
        packageName: "rollup",
        regex: /\brollup\b/,
        configFiles: ["rollup.config.js", "rollup.config.ts"],
      },
      {
        tool: "esbuild",
        packageName: "esbuild",
        regex: /\besbuild\b/,
        configFiles: ["esbuild.config.js", "esbuild.config.ts"],
      },
      {
        tool: "prettier",
        packageName: "prettier",
        regex: /\bprettier\b/,
        configFiles: [
          ".prettierrc",
          ".prettierrc.js",
          ".prettierrc.json",
          "prettier.config.js",
        ],
      },
      {
        tool: "eslint",
        packageName: "eslint",
        regex: /\beslint\b/,
        configFiles: [
          ".eslintrc",
          ".eslintrc.js",
          ".eslintrc.json",
          "eslint.config.js",
        ],
      },
      {
        tool: "jest",
        packageName: "jest",
        regex: /\bjest\b/,
        configFiles: ["jest.config.js", "jest.config.ts", "jest.config.json"],
      },
      {
        tool: "vitest",
        packageName: "vitest",
        regex: /\bvitest\b/,
        configFiles: ["vitest.config.ts", "vitest.config.js"],
      },
      {
        tool: "vitepress",
        packageName: "vitepress",
        regex: /\bvitepress\b/,
        configFiles: [".vitepress/config.ts", ".vitepress/config.js"],
      },
      { tool: "tsx", packageName: "tsx", regex: /\btsx\b/ },
      { tool: "terser", packageName: "terser", regex: /\bterser\b/ },
    ];

    for (const { regex, packageName, configFiles } of tools) {
      if (!regex.test(scriptContent)) continue;
      usedPackages.add(packageName);
      if (configFiles) {
        for (const configFile of configFiles) {
          const configPath = path.join(cwd, configFile);
          if (fs.existsSync(configPath)) {
            reachableFiles.add(configPath);
          }
        }
      }
    }

    if (scriptContent.includes("tsc") || scriptContent.includes("typescript")) {
      usedPackages.add("typescript");
      const tsconfigPath = path.join(cwd, "tsconfig.json");
      if (fs.existsSync(tsconfigPath)) {
        reachableFiles.add(tsconfigPath);
      }
    }
    if (scriptContent.includes("tsup")) {
      usedPackages.add("tsup");
      usedPackages.add("typescript");
      const tsupConfigs = [
        "tsup.config.ts",
        "tsup.config.js",
        "tsup.config.mjs",
        "tsup.config.cjs",
      ];
      for (const config of tsupConfigs) {
        const configPath = path.join(cwd, config);
        if (fs.existsSync(configPath)) {
          reachableFiles.add(configPath);
          try {
            const configContent = fs.readFileSync(configPath, "utf-8");
            if (
              configContent.includes("terser") ||
              configContent.includes("minify")
            ) {
              usedPackages.add("terser");
            }
          } catch {}
          break;
        }
      }
    }
  } catch {}
}
