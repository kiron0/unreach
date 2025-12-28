import * as fs from "fs";
import * as path from "path";

export type PackageManager = "npm" | "yarn" | "pnpm" | "bun" | "unknown";

export interface PackageManagerInfo {
  name: PackageManager;
  installCommand: string;
  globalInstallCommand: string;
  runCommand: string;
}

export function detectPackageManager(
  cwd: string = process.cwd(),
): PackageManagerInfo {
  const lockFiles = {
    "package-lock.json": "npm",
    "yarn.lock": "yarn",
    "pnpm-lock.yaml": "pnpm",
    "bun.lock": "bun",
  } as const;

  for (const [lockFile, pm] of Object.entries(lockFiles)) {
    const lockFilePath = path.join(cwd, lockFile);
    if (fs.existsSync(lockFilePath)) {
      return getPackageManagerInfo(pm as PackageManager);
    }
  }

  let currentDir = cwd;
  for (let i = 0; i < 5; i++) {
    for (const [lockFile, pm] of Object.entries(lockFiles)) {
      const lockFilePath = path.join(currentDir, lockFile);
      if (fs.existsSync(lockFilePath)) {
        return getPackageManagerInfo(pm as PackageManager);
      }
    }
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) break;
    currentDir = parentDir;
  }

  if (process.env.npm_config_user_agent) {
    const userAgent = process.env.npm_config_user_agent.toLowerCase();
    if (userAgent.includes("yarn")) return getPackageManagerInfo("yarn");
    if (userAgent.includes("pnpm")) return getPackageManagerInfo("pnpm");
    if (userAgent.includes("bun")) return getPackageManagerInfo("bun");
  }

  return getPackageManagerInfo("npm");
}

function getPackageManagerInfo(pm: PackageManager): PackageManagerInfo {
  switch (pm) {
    case "yarn":
      return {
        name: "yarn",
        installCommand: "yarn add",
        globalInstallCommand: "yarn global add",
        runCommand: "yarn",
      };
    case "pnpm":
      return {
        name: "pnpm",
        installCommand: "pnpm add",
        globalInstallCommand: "pnpm add -g",
        runCommand: "pnpm",
      };
    case "bun":
      return {
        name: "bun",
        installCommand: "bun add",
        globalInstallCommand: "bun install -g",
        runCommand: "bun",
      };
    case "npm":
    default:
      return {
        name: "npm",
        installCommand: "npm install",
        globalInstallCommand: "npm install -g",
        runCommand: "npm",
      };
  }
}

export function getInstallCommand(
  packageName: string,
  cwd?: string,
  global: boolean = false,
): string {
  const pm = detectPackageManager(cwd);
  if (global) {
    return `${pm.globalInstallCommand} ${packageName}`;
  }
  return `${pm.installCommand} ${packageName}`;
}

export function getRunCommand(cwd?: string): string {
  const pm = detectPackageManager(cwd);
  return pm.runCommand;
}
