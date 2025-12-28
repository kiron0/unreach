import * as path from "path";

export function createFileLink(
  filePath: string,
  line?: number,
  column?: number,
): string {
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(process.cwd(), filePath);
  const normalizedPath = path.normalize(absolutePath);

  if (supportsHyperlinks()) {
    const fileUrl = `file://${normalizedPath}${line ? `:${line}` : ""}${column ? `:${column}` : ""}`;
    return `\x1b]8;;${fileUrl}\x1b\\${path.relative(process.cwd(), normalizedPath)}${line ? `:${line}` : ""}${column ? `:${column}` : ""}\x1b]8;;\x1b\\`;
  }

  return `${path.relative(process.cwd(), normalizedPath)}${line ? `:${line}` : ""}${column ? `:${column}` : ""}`;
}

export function supportsHyperlinks(): boolean {
  return !!(
    process.env.TERM_PROGRAM === "vscode" ||
    process.env.VSCODE_INJECTION === "1" ||
    process.env.JETBRAINS_IDE === "1" ||
    process.env.TERM_PROGRAM === "Hyper" ||
    (process.env.TERM && process.env.TERM.includes("xterm"))
  );
}
