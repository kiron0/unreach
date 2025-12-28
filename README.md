# Unreach

**A CLI that deeply analyzes a codebase to find what exists but is truly unused — packages, imports, exports, functions, files, and even configs — with real dependency awareness.**

## Features

### Detection Capabilities
- **Unused packages detection** - Find npm packages that are installed but never imported
- **Unused imports detection** - Identify imports that are never used in your code
- **Unused exports detection** - Find exported symbols that are never imported elsewhere
- **Unused functions detection** - Discover functions that are defined but never called
- **Unused variables detection** - Identify variables that are declared but never referenced
- **Unused types detection** - Find TypeScript types, interfaces, and enums that are never used
- **Unused files detection** - Find files that are never imported or referenced
- **Unused configs detection** - Detect unused configuration keys in `package.json` and `tsconfig.json`
- **Unused scripts detection** - Find npm scripts that are never executed
- **Unused CSS classes detection** - Identify CSS classes defined but never used in JSX/TSX
- **Unused assets detection** - Find image and font files that are never imported

### Advanced Features
- **Real dependency tracking** - Follows actual import/export chains, not just file existence
- **TypeScript support** - Full support for TypeScript, including type-only imports/exports
- **Dynamic import support** - Tracks dynamic imports (`import()`) and conditional imports
- **JSX/TSX support** - Analyzes React components and JSX element usage
- **Entry point detection** - Automatically detects entry points from `package.json` and `tsconfig.json`
- **Test file detection** - Automatically excludes test files from analysis
- **Error recovery** - Continues analysis even when individual files have parse errors
- **Incremental analysis** - Caches results for faster subsequent scans
- **File size limits** - Skips parsing files that exceed size limits (default: 10MB)
- **Watch mode** - Continuously monitors files and re-scans on changes
- **Watch rate limiting** - Prevents excessive scans in watch mode (default: 1 scan/second)
- **Package manager detection** - Automatically detects npm/yarn/pnpm/bun and shows correct install commands

### User Experience
- **Progress indicator** - Visual progress bar when analyzing large codebases
- **Interactive mode** - Menu-driven interface for configuring scans
- **Multiple export formats** - JSON, CSV, TSV, Markdown, HTML
- **Grouped output** - Group results by type or by file
- **Verbose mode** - Detailed file-by-file processing information
- **Debug mode** - Stack traces and detailed error information
- **Benchmark mode** - Performance metrics (parse time, analysis time, memory usage)
- **Dependency visualization** - Interactive HTML dependency graph
- **Configuration files** - Support for `unreach.config.js` and `unreach.config.ts`

## Quick Start

### Installation

#### Run with npx (no global install)

```bash
npx unreach@latest scan
```

#### Install globally with npm

```bash
npm install -g unreach
```

#### Install with bun

```bash
bun install -g unreach
```

#### Install with yarn

```bash
yarn global add unreach
```

#### Install with pnpm

```bash
pnpm add -g unreach
```

#### Check for updates

```bash
unreach check-updates
# or
unreach update
```

#### Check version

```bash
unreach --version
# or
unreach -v
```

### Your First Scan

```bash
# Scan current directory (shows interactive menu)
unreach

# Scan specific directory
unreach scan /path/to/directory

# Scan with custom entry point
unreach scan --entry src/index.ts

# Export as JSON
unreach scan --export json

# Export in multiple formats
unreach scan --export json,html,md

# Export to custom directory
unreach scan --export json --export-path ./reports

# Keep history with timestamps
unreach scan --export json --history
```

## Basic CLI Usage

```bash
# Scan current directory
unreach scan

# Scan specific directory
unreach scan /path/to/project

# Scan with custom entry point(s)
unreach scan --entry src/index.ts
unreach scan --entry src/index.ts src/main.ts

# Export results in JSON format
unreach scan --export json

# Export in multiple formats
unreach scan --export json,html,md

# Export to custom directory
unreach scan --export json --export-path ./reports

# Keep history with timestamps
unreach scan --export json --history

# Suppress all output except errors
unreach scan --quiet

# Disable progress indicator
unreach scan --no-progress

# Set working directory
unreach scan --cwd /path/to/project
```

## What Can Unreach Find?

### Unused Packages

Finds npm packages in `dependencies`, `devDependencies`, and `peerDependencies` that are never imported in your code.

```bash
unreach scan
# Output:
# Unused packages: 3
#   - lodash (1.2.3)
#   - moment (2.29.4)
#   - axios (0.21.1)
```

### Unused Imports

Identifies import statements that import symbols which are never used in the file.

```bash
unreach scan
# Output:
# Unused imports: 5
#   - ./utils.ts [src/components/Button.tsx]
#   - ./types.ts [src/components/Button.tsx]
```

### Unused Exports

Finds exported symbols (functions, classes, variables, types) that are never imported by other files.

```bash
unreach scan
# Output:
# Unused exports: 8
#   - helperFunction [src/utils/helpers.ts]:15
#   - OldComponent [src/components/Old.tsx]:3
```

### Unused Functions

Discovers functions that are defined but never called, either directly or through exports.

```bash
unreach scan
# Output:
# Unused functions: 12
#   - calculateTotal [src/utils/math.ts]:42
#   - formatDate [src/utils/date.ts]:18
```

### Unused Variables

Identifies variables that are declared but never referenced.

```bash
unreach scan
# Output:
# Unused variables: 4
#   - unusedVar [src/utils/helpers.ts]:9
#   - tempData [src/components/App.tsx]:23
```

### Unused Files

Finds files that are never imported or referenced by any other file.

```bash
unreach scan
# Output:
# Unused files: 2
#   - src/utils/old-helper.ts
#   - src/components/Deprecated.tsx
```

### Unused Configs

Detects unused configuration keys in `package.json` and `tsconfig.json`.

```bash
unreach scan
# Output:
# Unused configs: 3
#   - homepage [package.json]
#   - compilerOptions.baseUrl [tsconfig.json]
#   - compilerOptions.experimentalDecorators [tsconfig.json]
```

### Unused Scripts

Finds npm scripts in `package.json` that are never executed.

```bash
unreach scan
# Output:
# Unused scripts: 2
#   - old-build
#   - deprecated-test
```

## Quick Examples

```bash
# Scan TypeScript project
unreach scan /path/to/typescript-project

# Scan with custom entry point
unreach scan --entry src/main.ts

# Scan with multiple entry points
unreach scan --entry src/index.ts --entry src/cli.ts

# Export as JSON for automation (saved to reports/ by default)
unreach scan --export json

# Export in multiple formats
unreach scan --export json,html,md

# Export with history (keeps previous reports)
unreach scan --export json --history

# Export to custom directory
unreach scan --export json --export-path ./reports

# Quiet mode (suppress all output except errors)
unreach scan --quiet

# Scan without progress bar
unreach scan --no-progress

# Watch mode (continuous monitoring)
unreach scan --watch

# Interactive mode (menu-driven configuration)
unreach scan --interactive

# Verbose mode (detailed output)
unreach scan --verbose

# Debug mode (stack traces and detailed errors)
unreach scan --debug

# Benchmark mode (performance metrics)
unreach scan --benchmark

# Generate dependency graph visualization
unreach scan --visualize

# Group output by file instead of type
unreach scan --group-by file

# Disable incremental analysis (full re-scan)
unreach scan --no-incremental

# Ignore configuration file
unreach scan --no-config

# Check for updates
unreach check-updates
```

## How It Works

Unreach uses advanced static analysis to:

1. **Parse your codebase** - Uses TypeScript's parser to build an Abstract Syntax Tree (AST) of all files
2. **Build dependency graph** - Creates a graph of all imports, exports, and function calls
3. **Track reachability** - Starting from entry points, marks all reachable code
4. **Identify unused code** - Reports everything that isn't reachable from entry points

This approach ensures **100% accuracy** - if code is truly unused, Unreach will find it.

## Output Formats

### Text Output (Default)

```
🔍 Scanning codebase...

📌 Found 1 entry point(s):
   • src/index.ts

📊 Building dependency graph...
████████████████████████████████████████ 100.0% | 42/42 files | 1.2s elapsed | ETA: 0.0s

🔬 Analyzing reachability...
   Analysis complete

Unused exports: 6
  - checkMaxDepth [src/core/scanner/index.ts]:2
  - createFileDetail [src/core/scanner/index.ts]:3
  ...

Unused variables: 1
  - unusedVariable [src/utils/version.ts]:9

Safe to remove: yes (7 items)
```

### Export Formats

Unreach supports exporting reports in multiple formats:

- **JSON** - Machine-readable format for automation
- **CSV** - Spreadsheet-compatible format
- **TSV** - Tab-separated values
- **Markdown (md)** - Human-readable markdown format
- **HTML** - Beautiful HTML report with styling

#### Export Examples

```bash
# Export as JSON (saved to reports/ directory by default)
unreach scan --export json

# Export in multiple formats
unreach scan --export json,html,md

# Export to custom directory
unreach scan --export json --export-path ./custom-reports

# Keep history with timestamps (preserves previous reports)
unreach scan --export json --history
# Creates: reports/unreach-report-2024-01-15T14-30-45.json
```

#### JSON Output

```bash
unreach scan --export json
```

```json
{
  "unusedPackages": [
    {
      "name": "lodash",
      "version": "4.17.21"
    }
  ],
  "unusedImports": [
    {
      "file": "src/components/Button.tsx",
      "importPath": "./utils.ts",
      "line": 5,
      "column": 10
    }
  ],
  "unusedExports": [
    {
      "file": "src/utils/helpers.ts",
      "exportName": "helperFunction",
      "line": 15,
      "column": 5
    }
  ],
  "unusedFunctions": [],
  "unusedVariables": [],
  "unusedFiles": [],
  "unusedConfigs": [],
  "unusedScripts": []
}
```

## Commands

### `scan` - Scan codebase for unused code

```bash
unreach scan [directory] [options]
```

### `check-updates` / `update` - Check for available updates

```bash
unreach check-updates
# or
unreach update
```

Automatically detects your package manager and shows the correct install command.

### `--version` / `-v` - Show version number

```bash
unreach --version
# or
unreach -v
```

## Options

### Scan Options

| Option | Short | Description |
|--------|-------|-------------|
| `--entry <entry...>` | `-e` | Custom entry point(s) (e.g., `src/index.ts`). Can be specified multiple times. |
| `--export [format]` | | Export report in specified format(s). Multiple formats can be comma-separated (e.g., `json,html,md`). Supported formats: `json`, `csv`, `tsv`, `md`, `html`. Reports are saved to `reports/` directory by default |
| `--export-path <dir>` | | Specify output directory for exported reports. Defaults to `reports/` if not specified. Files will be named `unreach-report.{ext}`. Directories will be created automatically if they don't exist |
| `--history` | | Keep previous reports by appending timestamps (e.g., `unreach-report-2024-01-15T14-30-45.json`). By default, reports are replaced |
| `--quiet` | | Suppress all output except errors |
| `--no-progress` | | Disable progress indicator (enabled by default) |
| `--cwd <cwd>` | | Working directory (overrides directory argument) |
| `--no-incremental` | | Disable incremental analysis (re-analyze all files, ignoring cache) |
| `--visualize` | | Generate an interactive dependency graph visualization (`dependency-graph.html`) |
| `--benchmark` | | Track and display performance metrics (parse time, analysis time, memory usage) |
| `--verbose` | | Show detailed output including file-by-file processing information |
| `--debug` | | Enable debug mode with stack traces and detailed error information |
| `--group-by <type>` | | Group output by `type` or `file` (default: `type`) |
| `--interactive` | | Show interactive menu to configure scan options |
| `--watch` | | Watch for file changes and automatically re-scan (continuous monitoring) |
| `--no-config` | | Ignore configuration file and use default settings |
| `--fix` | | Automatically remove unused code (coming soon) |

### Global Options

| Option | Short | Description |
|--------|-------|-------------|
| `--version` | `-v` | Show version number |
| `--help` | `-h` | Display help for command |

## Configuration Files

Unreach supports configuration files to customize analysis behavior without command-line flags.

### Supported Configuration Files

- `unreach.config.js` - JavaScript configuration file
- `unreach.config.ts` - TypeScript configuration file (requires `ts-node`)

### Configuration Example

Create `unreach.config.js` in your project root:

```javascript
module.exports = {
  ignore: {
    files: ["**/*.test.ts", "**/fixtures/**"],
    packages: ["@types/*"],
    exports: ["**/index.ts"],
    functions: ["main"],
    variables: [],
    imports: [],
    types: [],
    cssClasses: [],
    assets: []
  },
  entryPoints: ["src/index.ts"],
  excludePatterns: ["**/node_modules/**", "**/dist/**"],
  rules: {
    unusedPackages: true,
    unusedImports: true,
    unusedExports: true,
    unusedFunctions: true,
    unusedVariables: true,
    unusedFiles: true,
    unusedConfigs: true,
    unusedScripts: true,
    unusedTypes: true,
    unusedCSSClasses: true,
    unusedAssets: true
  },
  testFileDetection: {
    enabled: true,
    patterns: ["**/*.test.ts", "**/*.spec.ts", "**/__tests__/**"]
  },
  maxFileSize: 10 * 1024 * 1024, // 10MB
  watchRateLimit: 1 // scans per second
};
```

### TypeScript Configuration Example

Create `unreach.config.ts`:

```typescript
import type { UnreachConfig } from "unreach";

const config: UnreachConfig = {
  ignore: {
    files: ["**/*.test.ts"],
    packages: ["@types/*"]
  },
  entryPoints: ["src/index.ts"],
  rules: {
    unusedPackages: true,
    unusedImports: true
  }
};

export default config;
```

### Disable Configuration

Use `--no-config` to ignore configuration files:

```bash
unreach scan --no-config
```

## Advanced Features

### Watch Mode

Continuously monitor files and automatically re-scan on changes:

```bash
unreach scan --watch
```

Watch mode includes:
- Automatic re-scanning on file changes
- Rate limiting to prevent excessive scans (configurable via `watchRateLimit`)
- Debounced file change detection
- Support for all scan options

### Interactive Mode

Menu-driven interface for configuring scans:

```bash
unreach scan --interactive
```

The interactive menu guides you through:
- Directory selection
- Entry point configuration
- Export format selection
- Output grouping preferences
- Visualization options
- Benchmark settings

### Dependency Visualization

Generate an interactive HTML dependency graph:

```bash
unreach scan --visualize
```

Creates `dependency-graph.html` with an interactive visualization of your codebase's dependency structure.

### Benchmark Mode

Track and display performance metrics:

```bash
unreach scan --benchmark
```

Shows:
- Parse time
- Analysis time
- Memory usage
- Total execution time

### Grouped Output

Group results by type (default) or by file:

```bash
# Group by type (default)
unreach scan --group-by type

# Group by file
unreach scan --group-by file
```

### Incremental Analysis

Unreach caches analysis results for faster subsequent scans. To disable:

```bash
unreach scan --no-incremental
```

### File Size Limits

Large files are automatically skipped to prevent performance issues. Default limit is 10MB. Configure in `unreach.config.js`:

```javascript
module.exports = {
  maxFileSize: 10 * 1024 * 1024 // 10MB
};
```

### Test File Detection

Test files are automatically excluded from analysis. Configure patterns in `unreach.config.js`:

```javascript
module.exports = {
  testFileDetection: {
    enabled: true,
    patterns: ["**/*.test.ts", "**/*.spec.ts", "**/__tests__/**"]
  }
};
```

## Package Manager Detection

Unreach automatically detects your package manager (npm, yarn, pnpm, bun) and shows the correct install command in update notifications. Detection is based on:

1. Lock files (`package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `bun.lock`)
2. Environment variables
3. Defaults to npm if none detected

## License

MIT

---

_"Unreach: Find what you can delete without breaking your project."_
