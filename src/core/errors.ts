import * as path from "path";
export class UnreachError extends Error {
  public suggestion?: string;
  constructor(
    message: string,
    public cause?: Error,
    suggestion?: string,
  ) {
    super(message);
    this.name = "UnreachError";
    this.suggestion = suggestion;
  }
  static io(message: string, cause?: Error): UnreachError {
    const suggestion =
      "Check if the file/directory exists, you have read permissions, and there's sufficient disk space.";
    return new UnreachError(`IO error: ${message}`, cause, suggestion);
  }
  static directoryNotFound(pathStr: string): UnreachError {
    let resolvedPath: string;
    try {
      resolvedPath = path.resolve(pathStr);
    } catch {
      resolvedPath = pathStr;
    }
    const suggestion =
      `The path "${pathStr}" does not exist.\n` +
      `  - Check if the path is correct (resolved: ${resolvedPath})\n` +
      "  - Use relative paths like '.' for current directory\n" +
      "  - Verify you have read permissions\n" +
      "  - Check if it's a file instead of a directory (use the file path directly)";
    return new UnreachError(
      `Directory not found: ${pathStr}`,
      undefined,
      suggestion,
    );
  }
  static notADirectory(pathStr: string): UnreachError {
    const suggestion =
      `"${pathStr}" exists but is not a directory.\n` +
      "  - If it's a file, you can scan it directly: unreach scan <file-path>\n" +
      "  - If you meant a directory, check the path spelling\n" +
      "  - Use 'unreach scan .' to scan the current directory";
    return new UnreachError(
      `Not a directory: ${pathStr}`,
      undefined,
      suggestion,
    );
  }
  static parseError(filePath: string, cause?: Error): UnreachError {
    const suggestion =
      `Failed to parse "${filePath}".\n` +
      "  - Check if the file is valid TypeScript/JavaScript\n" +
      "  - Verify the file encoding (should be UTF-8)\n" +
      "  - Ensure the file is not corrupted\n" +
      "  - Check for syntax errors in the file";
    return new UnreachError(
      `Parse error: ${filePath}${cause ? `: ${cause.message}` : ""}`,
      cause,
      suggestion,
    );
  }
  static entryPointNotFound(entry: string): UnreachError {
    const suggestion =
      `Entry point "${entry}" not found.\n` +
      "  - Check if the file path is correct\n" +
      "  - Use relative paths from the project root\n" +
      "  - Verify the file exists and is readable\n" +
      "  - Try using 'unreach scan' without --entry to auto-detect entry points";
    return new UnreachError(
      `Entry point not found: ${entry}`,
      undefined,
      suggestion,
    );
  }
  static analysisError(message: string, cause?: Error): UnreachError {
    const suggestion =
      "An error occurred during code analysis.\n" +
      "  - Check if all source files are valid\n" +
      "  - Verify there are no circular dependencies causing issues\n" +
      "  - Ensure sufficient memory is available\n" +
      "  - Try scanning a smaller subset of files first";
    return new UnreachError(
      `Analysis error: ${message}`,
      cause,
      suggestion,
    );
  }
}
export function isError<T>(
  result: T | UnreachError,
): result is UnreachError {
  return result instanceof UnreachError;
}
