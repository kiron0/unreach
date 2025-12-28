import chalk from "chalk";
import * as https from "https";
import { detectPackageManager } from "./package-manager.js";

interface PackageInfo {
  version: string;
  "dist-tags": {
    latest: string;
  };
}

export async function checkForUpdates(
  currentVersion: string,
  packageName: string = "unreach",
): Promise<{ hasUpdate: boolean; latestVersion: string | null }> {
  try {
    const latestVersion = await fetchLatestVersion(packageName);
    if (!latestVersion) {
      return { hasUpdate: false, latestVersion: null };
    }

    const hasUpdate = compareVersions(currentVersion, latestVersion) < 0;
    return { hasUpdate, latestVersion };
  } catch (error) {
    return { hasUpdate: false, latestVersion: null };
  }
}

function fetchLatestVersion(packageName: string): Promise<string | null> {
  return new Promise((resolve) => {
    const options = {
      hostname: "registry.npmjs.org",
      path: `/${packageName}`,
      method: "GET",
      headers: {
        "User-Agent": "unreach-cli",
        Accept: "application/json",
      },
      timeout: 3000,
    };

    const req = https.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        try {
          const packageInfo: PackageInfo = JSON.parse(data);
          const latestVersion =
            packageInfo["dist-tags"]?.latest || packageInfo.version;
          resolve(latestVersion);
        } catch {
          resolve(null);
        }
      });
    });

    req.on("error", () => {
      resolve(null);
    });

    req.on("timeout", () => {
      req.destroy();
      resolve(null);
    });

    req.setTimeout(3000);
    req.end();
  });
}

function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split(".").map(Number);
  const parts2 = v2.split(".").map(Number);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = parts1[i] || 0;
    const part2 = parts2[i] || 0;

    if (part1 < part2) return -1;
    if (part1 > part2) return 1;
  }

  return 0;
}

export function displayUpdateNotification(
  currentVersion: string,
  latestVersion: string,
  cwd?: string,
): void {
  const pm = detectPackageManager(cwd);
  console.log(
    chalk.yellow(
      `\n⚠️  Update available: ${chalk.bold(currentVersion)} → ${chalk.bold(latestVersion)}`,
    ),
  );
  console.log(
    chalk.gray(
      `   Run ${chalk.cyan(`${pm.globalInstallCommand} unreach`)} to update\n`,
    ),
  );
}
