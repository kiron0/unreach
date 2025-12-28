# Missing Features & Improvements

This document lists features and improvements mentioned in the reports that are **not yet implemented** (excluding multi-project support and auto-fix).

## 🔴 High Priority Features

### 1. **Ignore Comments** ⚠️ NOT IMPLEMENTED

**Feature:** Allow inline ignore comments in source code

```typescript
// @unreach-ignore-next-line
import { unused } from "./utils";

export const helper = () => {}; // @unreach-ignore
```

**Status:** Mentioned in `OPTIMIZATION_AND_FEATURES.md` (line 185-194) but not implemented

**Implementation Notes:**

- Parse comments during AST traversal
- Support `@unreach-ignore` and `@unreach-ignore-next-line`
- Filter results based on comment annotations
- Location: `src/lib/parser.ts` (comment extraction)

---

### 2. **CI/CD Integration** ⚠️ NOT IMPLEMENTED

**Feature:** Exit codes and thresholds for CI/CD pipelines

```bash
unreach scan --max-unused 100  # Exit 1 if more than 100 unused items
unreach scan --fail-on-unused-packages  # Fail CI if unused packages found
```

**Status:** Mentioned in `OPTIMIZATION_AND_FEATURES.md` (line 206-213) but not implemented

**Implementation Notes:**

- Add `--max-unused <number>` option
- Add `--fail-on-unused-packages` flag
- Add `--fail-on-unused-exports` flag
- Calculate exit code based on thresholds
- Location: `src/cli/handler.ts` (exit code logic)

---

## 🟡 Medium Priority Features

### 3. **Diff Mode** ⚠️ NOT IMPLEMENTED

**Feature:** Compare scans between versions/branches

```bash
unreach scan --diff HEAD~1
unreach scan --diff main
unreach scan --compare reports/old-report.json
```

**Status:** Mentioned in `OPTIMIZATION_AND_FEATURES.md` (line 196-204) but not implemented

**Implementation Notes:**

- Load previous scan results (from git or file)
- Compare current results with previous
- Show diff (new unused items, removed unused items)
- Location: `src/utils/diff.ts` (new file)

---

### 4. **Filter Options** ⚠️ NOT IMPLEMENTED

**Feature:** Filter output by category

```bash
unreach scan --only-packages  # Show only unused packages
unreach scan --only-exports   # Show only unused exports
unreach scan --only-functions # Show only unused functions
```

**Status:** Mentioned in `OPTIMIZATION_AND_FEATURES.md` (line 447) but not implemented

**Implementation Notes:**

- Add `--only-<category>` flags for each category
- Filter `ScanResult` before formatting
- Location: `src/cli/args.ts` (add options), `src/cli/handler.ts` (filter logic)

---

### 5. **Sort Results** ⚠️ NOT IMPLEMENTED

**Feature:** Sort output by various criteria

```bash
unreach scan --sort-by size  # Sort by file size
unreach scan --sort-by name  # Sort alphabetically
unreach scan --sort-by file  # Sort by file path
```

**Status:** Mentioned in `OPTIMIZATION_AND_FEATURES.md` (line 448) but not implemented

**Implementation Notes:**

- Add `--sort-by <criteria>` option
- Sort each category in `ScanResult`
- Location: `src/lib/formatter.ts` (sorting logic)

---

### 6. **Limit Output** ⚠️ NOT IMPLEMENTED

**Feature:** Limit number of results shown

```bash
unreach scan --max-results 50  # Show only first 50 results per category
```

**Status:** Mentioned in `OPTIMIZATION_AND_FEATURES.md` (line 449) but not implemented

**Implementation Notes:**

- Add `--max-results <number>` option
- Truncate each category in `ScanResult`
- Show summary of truncated items
- Location: `src/lib/formatter.ts` (truncation logic)

---

### 7. **`.unreachignore` File** ⚠️ NOT IMPLEMENTED

**Feature:** Ignore file patterns (like `.gitignore`)

```bash
# .unreachignore
**/*.test.ts
**/fixtures/**
**/__tests__/**
```

**Status:** Mentioned in `OPTIMIZATION_AND_FEATURES.md` (line 444) but not implemented

**Implementation Notes:**

- Read `.unreachignore` file in project root
- Parse glob patterns (similar to `.gitignore`)
- Merge with config file `excludePatterns`
- Location: `src/lib/config.ts` (add ignore file loader)

---

## 🟢 Low Priority Features

### 8. **Export Enhancements** ⚠️ NOT IMPLEMENTED

**Feature:** Additional export formats

- **SARIF format** (for GitHub Security)
- **JUnit XML** (for CI systems)
- **JSON Schema** for export format validation

**Status:** Mentioned in `OPTIMIZATION_AND_FEATURES.md` (line 356-362, 451) but not implemented

**Implementation Notes:**

- Add SARIF formatter (`src/utils/export-sarif.ts`)
- Add JUnit XML formatter (`src/utils/export-junit.ts`)
- Generate JSON schema for export format
- Location: `src/utils/export.ts` (add new formatters)

---

### 9. **Export Preview** ⚠️ NOT IMPLEMENTED

**Feature:** Preview export before writing to file

```bash
unreach scan --export json --preview  # Show preview before writing
```

**Status:** Mentioned in `OPTIMIZATION_AND_FEATURES.md` (line 531) but not implemented

**Implementation Notes:**

- Add `--preview` flag
- Show formatted output in terminal
- Ask for confirmation before writing
- Location: `src/cli/handler.ts` (preview logic)

---

### 10. **Plugin System** ⚠️ NOT IMPLEMENTED

**Feature:** Allow custom analyzers via plugins

```typescript
// unreach-plugin-example.ts
export default {
  name: "custom-analyzer",
  analyze: (graph, result) => {
    // Custom analysis logic
  },
};
```

**Status:** Mentioned in `OPTIMIZATION_AND_FEATURES.md` (line 242-254) but not implemented

**Implementation Notes:**

- Define plugin interface
- Load plugins from `node_modules` or local files
- Execute plugins during analysis
- Location: `src/lib/plugins/` (new directory)

---

## 🔧 Configuration Enhancements

### 11. **JavaScript/TypeScript Config Files** ⚠️ NOT IMPLEMENTED

**Feature:** Support `.js` and `.ts` configuration files

```javascript
// .unreachrc.js
module.exports = {
  ignore: {
    files: ["**/*.test.ts"],
  },
};
```

**Status:** Mentioned in `CONFIG_FILE_SUPPORT.md` (line 19-20, 387) as "future support"

**Implementation Notes:**

- Load `.unreachrc.js` and `unreach.config.js`
- Support both CommonJS and ES modules
- Location: `src/lib/config.ts` (add JS/TS loader)

---

### 12. **`package.json` Config Field** ⚠️ NOT IMPLEMENTED

**Feature:** Support `unreach` field in `package.json`

```json
{
  "name": "my-package",
  "unreach": {
    "ignore": {
      "files": ["**/*.test.ts"]
    }
  }
}
```

**Status:** Mentioned in `CONFIG_FILE_SUPPORT.md` (line 388) as "future support"

**Implementation Notes:**

- Read `package.json` and extract `unreach` field
- Merge with other config sources
- Location: `src/lib/config.ts` (add package.json loader)

---

### 13. **Multiple Config Files** ⚠️ NOT IMPLEMENTED

**Feature:** Support project + user configuration files

```bash
# Project config: .unreachrc.json
# User config: ~/.unreachrc.json
# Merged together
```

**Status:** Mentioned in `CONFIG_FILE_SUPPORT.md` (line 389) as "future support"

**Implementation Notes:**

- Load user config from home directory
- Merge with project config (project takes precedence)
- Location: `src/lib/config.ts` (add user config loader)

---

### 14. **Configuration Validation** ✅ **IMPLEMENTED**

**Feature:** Validate configuration file and show helpful errors

```bash
unreach scan
# Error: Invalid configuration in unreach.config.js:
#   - "ignore.files" must be an array
#   - "rules.unusedPackages" must be a boolean
```

**Status:** ✅ Fully implemented

**Implementation:**

- ✅ Validates all configuration fields
- ✅ Provides clear error messages with field paths
- ✅ Shows suggestions for fixing errors
- ✅ Location: `src/lib/config.ts` (`validateConfig` method)

---

### 15. **`--no-config` Flag** ✅ **IMPLEMENTED**

**Feature:** Ignore configuration file and use defaults

```bash
unreach scan --no-config  # Ignore unreach.config.js
```

**Status:** ✅ Fully implemented

**Implementation:**

- ✅ Added `--no-config` flag to CLI
- ✅ Skips config file loading when flag is set
- ✅ Uses default settings when flag is set
- ✅ Location: `src/cli/args.ts`, `src/cli/handler.ts`, `src/lib/config.ts`

---

## 🔒 Security & Performance

### 16. **File Size Limits** ✅ **IMPLEMENTED**

**Feature:** Prevent DoS on huge files

```bash
# Automatically skip files larger than 10MB (default)
# Configurable via maxFileSize in config file
```

**Status:** ✅ Fully implemented

**Implementation:**

- ✅ Checks file size before parsing
- ✅ Skips files exceeding limit with warning message
- ✅ Configurable limit in config file (`maxFileSize` in bytes)
- ✅ Default: 10MB (10 _ 1024 _ 1024 bytes)
- ✅ Location: `src/lib/parser.ts` (`readFile` method)

**Configuration:**

```javascript
// unreach.config.js
module.exports = {
  maxFileSize: 5 * 1024 * 1024, // 5MB limit
};
```

---

### 17. **Rate Limiting for Watch Mode** ✅ **IMPLEMENTED**

**Feature:** Prevent excessive scans in watch mode

```bash
# Limits scans to max 1 per second (default)
# Configurable via watchRateLimit in config file
```

**Status:** ✅ Fully implemented

**Implementation:**

- ✅ Rate limiting added to watch mode
- ✅ Configurable rate limit via `watchRateLimit` (scans per second)
- ✅ Default: 1 scan per second
- ✅ Queues scans if rate limit exceeded
- ✅ Location: `src/utils/watch.ts` (`performScanWithRateLimit` method)

**Configuration:**

```javascript
// unreach.config.js
module.exports = {
  watchRateLimit: 2, // Allow 2 scans per second
};
```

---

## 📚 Documentation

### 18. **JSDoc Comments** ⚠️ PARTIALLY IMPLEMENTED

**Feature:** Comprehensive JSDoc comments for public APIs

**Status:** Mentioned in `OPTIMIZATION_AND_FEATURES.md` (line 438) - some JSDoc exists but not comprehensive

**Implementation Notes:**

- Add JSDoc to all public functions/classes
- Document parameters, return types, examples
- Generate API documentation
- Location: All source files

---

### 19. **Contributing Guide** ✅ **IMPLEMENTED**

**Feature:** Guide for contributors

**Status:** ✅ Fully implemented

**Implementation:**
- ✅ Created `CONTRIBUTING.md` in root directory
- ✅ Includes comprehensive setup instructions
- ✅ Code style guidelines (TypeScript, Prettier, naming conventions)
- ✅ Testing requirements (Vitest, coverage, test structure)
- ✅ Pull request process (PR template, review process)
- ✅ Project structure documentation
- ✅ Development tips and common tasks
- ✅ Issue reporting guidelines

---

## 📊 Summary

### By Priority

- **High Priority:** 2 features
  - Ignore Comments
  - CI/CD Integration

- **Medium Priority:** 5 features
  - Diff Mode
  - Filter Options
  - Sort Results
  - Limit Output
  - `.unreachignore` File

- **Low Priority:** 0 features
  - Export Enhancements
  - Export Preview
  - Plugin System
  - Documentation (1 item - JSDoc comments partially implemented)

### Total Missing Features: 11

**Note:** The following features have been fully implemented:

- ✅ Configuration Enhancements (3 items):
  - JavaScript/TypeScript Config Files
  - Configuration Validation
  - `--no-config` Flag
- ✅ Security & Performance (2 items):
  - File Size Limits
  - Rate Limiting for Watch Mode
- ✅ Documentation (1 item):
  - Contributing Guide

**Note:** This excludes:

- Multi-project support (explicitly excluded)
- Auto-fix functionality (explicitly excluded)
- Features already implemented (watch mode, test file detection, error recovery, etc.)

---

_Last updated: January 2025_
_Status: Comprehensive list of missing features from all reports_
