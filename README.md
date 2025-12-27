# Unreach

**A CLI that deeply analyzes a codebase to find what exists but is truly unused — packages, imports, exports, functions, files, and even configs — with real dependency awareness.**

## Features

- **Unused packages detection** - Find npm packages that are installed but never imported
- **Unused imports detection** - Identify imports that are never used in your code
- **Unused exports detection** - Find exported symbols that are never imported elsewhere
- **Unused functions detection** - Discover functions that are defined but never called
- **Unused variables detection** - Identify variables that are declared but never referenced
- **Unused files detection** - Find files that are never imported or referenced
- **Unused configs detection** - Detect unused configuration keys in `package.json` and `tsconfig.json`
- **Unused scripts detection** - Find npm scripts that are never executed
- **Real dependency tracking** - Follows actual import/export chains, not just file existence
- **TypeScript support** - Full support for TypeScript, including type-only imports/exports
- **Progress indicator** - Visual progress bar when analyzing large codebases
- **JSON output** - Export results in JSON format for automation
- **Entry point detection** - Automatically detects entry points or use custom ones

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

# Export as JSON for automation (saved to reports/ by default)
unreach scan --export json

# Export with history (keeps previous reports)
unreach scan --export json --history

# Export to custom directory
unreach scan --export json --export-path ./reports

# Quiet mode (suppress all output except errors)
unreach scan --quiet

# Scan without progress bar
unreach scan --no-progress

# Scan with multiple entry points
unreach scan --entry src/index.ts --entry src/cli.ts
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

## Options

| Option | Description |
|--------|-------------|
| `--entry <entry...>` | Custom entry point(s) (e.g., `src/index.ts`) |
| `--export [format]` | Export report in specified format(s). Multiple formats can be comma-separated (e.g., `json,html,md`). Supported formats: `json`, `csv`, `tsv`, `md`, `html`. Reports are saved to `reports/` directory by default |
| `--export-path <dir>` | Specify output directory for exported reports. Defaults to `reports/` if not specified. Files will be named `unreach-report.{ext}`. Directories will be created automatically if they don't exist |
| `--history` | Keep previous reports by appending timestamps (e.g., `unreach-report-2024-01-15T14-30-45.json`). By default, reports are replaced |
| `--quiet` | Suppress all output except errors |
| `--no-progress` | Disable progress indicator (enabled by default) |
| `--cwd <cwd>` | Working directory (overrides directory argument) |
| `--fix` | Automatically remove unused code (coming soon) |

## License

MIT

---

_"Unreach: Find what you can delete without breaking your project."_
