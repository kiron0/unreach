import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let cachedVersion: string | null = null;

export function getPackageVersion(): string {
  if (cachedVersion) return cachedVersion;
  try {
    const possiblePaths = [
      join(__dirname, "../package.json"),
      join(__dirname, "../../package.json"),
      join(process.cwd(), "package.json"),
    ];
    for (const pkgPath of possiblePaths) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
        if (pkg.version) {
          cachedVersion = String(pkg.version);
          return cachedVersion;
        }
      } catch {
        continue;
      }
    }
    cachedVersion = "0.0.0";
    return cachedVersion;
  } catch (error) {
    cachedVersion = "0.0.0";
    return cachedVersion;
  }
}
