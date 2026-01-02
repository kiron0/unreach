import * as path from "path";

export function resolveDirectoryPath(dir: string): string {
  if (path.isAbsolute(dir)) {
    return path.normalize(dir);
  }
  return path.resolve(process.cwd(), dir);
}
