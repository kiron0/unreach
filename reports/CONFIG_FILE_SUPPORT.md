# Configuration File Support

## Overview

Unreach now supports configuration files to customize analysis behavior without command-line flags. Configuration files allow you to:

- Ignore specific files, packages, exports, functions, variables, or imports
- Define custom entry points
- Exclude file patterns from analysis
- Enable/disable specific analysis rules
- Configure auto-fix behavior (when implemented)

## Supported Configuration Files

Unreach looks for configuration files in the following order (first found is used):

1. `unreach.config.js` ✅ **IMPLEMENTED**
2. `unreach.config.ts` ✅ **IMPLEMENTED** (requires `ts-node` to be installed)

## Configuration File Location

Configuration files should be placed in the project root directory (same level as `package.json`).

**Note:** Only `unreach.config.js` and `unreach.config.ts` are supported. JSON configuration files (`.unreachrc.json`, `unreach.config.json`) are no longer supported.

## Configuration Schema

```json
{
  "ignore": {
    "files": ["**/*.test.ts", "**/fixtures/**"],
    "packages": ["@types/*"],
    "exports": ["**/index.ts"],
    "functions": ["main", "test"],
    "variables": [],
    "imports": []
  },
  "entryPoints": ["src/index.ts"],
  "excludePatterns": ["**/node_modules/**", "**/dist/**"],
  "rules": {
    "unusedPackages": true,
    "unusedImports": true,
    "unusedExports": true,
    "unusedFunctions": true,
    "unusedVariables": true,
    "unusedFiles": true,
    "unusedConfigs": true,
    "unusedScripts": true
  },
  "fix": {
    "enabled": false,
    "backup": true,
    "interactive": false
  }
}
```

## Configuration Options

### `ignore`

Patterns to ignore in analysis results. Uses glob pattern matching.

#### `ignore.files`

Array of file path patterns to exclude from unused files detection.

**Example:**

```javascript
// unreach.config.js
module.exports = {
  ignore: {
    files: ["**/*.test.ts", "**/fixtures/**", "**/__tests__/**"],
  },
};
```

#### `ignore.packages`

Array of package name patterns to exclude from unused packages detection.

**Example:**

```javascript
// unreach.config.js
module.exports = {
  ignore: {
    packages: ["@types/*", "eslint-*"],
  },
};
```

#### `ignore.exports`

Array of export name patterns to exclude from unused exports detection.

**Example:**

```javascript
// unreach.config.js
module.exports = {
  ignore: {
    exports: ["**/index.ts"],
  },
};
```

#### `ignore.functions`

Array of function name patterns to exclude from unused functions detection.

**Example:**

```javascript
// unreach.config.js
module.exports = {
  ignore: {
    functions: ["main", "test", "setup*"],
  },
};
```

#### `ignore.variables`

Array of variable name patterns to exclude from unused variables detection.

**Example:**

```javascript
// unreach.config.js
module.exports = {
  ignore: {
    variables: ["_unused", "temp*"],
  },
};
```

#### `ignore.imports`

Array of import path patterns to exclude from unused imports detection.

**Example:**

```javascript
// unreach.config.js
module.exports = {
  ignore: {
    imports: ["**/*.css", "**/*.scss"],
  },
};
```

### `entryPoints`

Custom entry points for analysis. If not specified, Unreach will auto-detect entry points.

**Example:**

```javascript
// unreach.config.js
module.exports = {
  entryPoints: ["src/index.ts", "src/cli.ts"],
};
```

**Note:** CLI `--entry` option takes precedence over config entry points.

### `excludePatterns`

Additional file patterns to exclude from analysis (beyond the default exclusions).

**Example:**

```javascript
// unreach.config.js
module.exports = {
  excludePatterns: ["**/node_modules/**", "**/dist/**", "**/*.d.ts"],
};
```

### `rules`

Enable or disable specific analysis rules. All rules are enabled by default (`true`).

**Example:**

```javascript
// unreach.config.js
module.exports = {
  rules: {
    unusedPackages: true,
    unusedImports: true,
    unusedExports: true,
    unusedFunctions: true,
    unusedVariables: false,
    unusedFiles: true,
    unusedConfigs: true,
    unusedScripts: true,
  },
};
```

### `fix`

Auto-fix configuration (for future implementation).

**Example:**

```javascript
// unreach.config.js
module.exports = {
  fix: {
    enabled: false,
    backup: true,
    interactive: false,
  },
};
```

## Glob Pattern Matching

Configuration files use glob patterns for matching. Supported patterns:

- `*` - Matches any sequence of characters (except path separators)
- `?` - Matches a single character
- `**` - Matches any sequence of characters including path separators

**Examples:**

- `**/*.test.ts` - Matches all `.test.ts` files in any directory
- `src/**` - Matches all files in `src` directory and subdirectories
- `@types/*` - Matches all packages starting with `@types/`
- `setup*` - Matches all names starting with `setup`

## Example Configuration Files

### Basic Configuration

```json
{
  "ignore": {
    "files": ["**/*.test.ts", "**/*.spec.ts"],
    "packages": ["@types/*"]
  },
  "rules": {
    "unusedVariables": false
  }
}
```

### TypeScript Library Configuration

```json
{
  "ignore": {
    "files": ["**/*.test.ts", "**/__tests__/**"],
    "exports": ["**/index.ts"],
    "packages": ["@types/*", "typescript"]
  },
  "entryPoints": ["src/index.ts"],
  "excludePatterns": ["**/dist/**", "**/*.d.ts"],
  "rules": {
    "unusedPackages": true,
    "unusedImports": true,
    "unusedExports": true,
    "unusedFunctions": true,
    "unusedVariables": false,
    "unusedFiles": true,
    "unusedConfigs": false,
    "unusedScripts": false
  }
}
```

### React Application Configuration

```json
{
  "ignore": {
    "files": [
      "**/*.test.tsx",
      "**/*.spec.tsx",
      "**/__tests__/**",
      "**/stories/**"
    ],
    "packages": ["@types/*"],
    "imports": ["**/*.css", "**/*.scss"]
  },
  "entryPoints": ["src/index.tsx", "src/main.tsx"],
  "excludePatterns": ["**/node_modules/**", "**/dist/**", "**/.next/**"],
  "rules": {
    "unusedPackages": true,
    "unusedImports": true,
    "unusedExports": true,
    "unusedFunctions": true,
    "unusedVariables": false,
    "unusedFiles": true,
    "unusedConfigs": true,
    "unusedScripts": true
  }
}
```

## Priority Order

1. **CLI arguments** - Highest priority (e.g., `--entry`)
2. **Configuration file** - Medium priority
3. **Default behavior** - Lowest priority

## Usage

### With Configuration File

Simply create `unreach.config.js` in your project root:

```bash
# Configuration is automatically loaded
unreach scan
```

### Override Configuration

CLI options override configuration file settings:

```bash
# Use CLI entry point instead of config entry point
unreach scan --entry src/custom-entry.ts
```

### Disable Configuration

To ignore configuration file and use defaults:

```bash
# Use --no-config flag to ignore configuration file
unreach scan --no-config
```

## Migration Guide

### From CLI Flags to Config File

**Before (CLI flags):**

```bash
unreach scan --entry src/index.ts --entry src/cli.ts
```

**After (Config file):**

```javascript
// unreach.config.js
module.exports = {
  entryPoints: ["src/index.ts", "src/cli.ts"],
};
```

Then simply run:

```bash
unreach scan
```

## Troubleshooting

### Configuration Not Loading

1. Check file name: Must be `unreach.config.js` or `unreach.config.ts`
2. Check location: Must be in project root
3. Check JavaScript/TypeScript syntax: Must be valid JS/TS
4. Check file permissions: Must be readable
5. For `.ts` files: Ensure `ts-node` is installed (`npm install -D ts-node`)
6. Check for validation errors: Invalid config structure will show clear error messages

### Patterns Not Matching

1. Use absolute paths or relative paths from project root
2. Use proper glob syntax (`*`, `**`, `?`)
3. Test patterns with simple examples first
4. Check path separators (use `/` for cross-platform compatibility)

### Configuration Validation Errors

If you see validation errors:

1. Check the error message for the specific field that's invalid
2. Ensure arrays contain only strings
3. Ensure objects are properly structured
4. Ensure boolean values are `true` or `false` (not strings)
5. Use `--no-config` to temporarily ignore the config file

### Entry Points Not Working

1. Ensure entry points exist
2. Use absolute paths or paths relative to project root
3. CLI `--entry` option overrides config entry points
4. Check that files are not excluded by `excludePatterns`

## Best Practices

1. **Version Control**: Commit `unreach.config.js` to version control
2. **Team Consistency**: Share configuration across team members
3. **Documentation**: Document why certain patterns are ignored
4. **Regular Review**: Periodically review ignored patterns
5. **Start Simple**: Begin with basic configuration and add patterns as needed
6. **TypeScript Support**: Use `unreach.config.ts` for type safety (requires `ts-node`)
7. **Validation**: The config file is automatically validated with helpful error messages

## Implementation Status

✅ **JavaScript/TypeScript Config Files**: Fully implemented

- Supports `unreach.config.js` (CommonJS and ES modules)
- Supports `unreach.config.ts` (requires `ts-node`)

✅ **Configuration Validation**: Fully implemented

- Validates all configuration fields
- Provides clear error messages with field paths
- Shows suggestions for fixing errors

✅ **`--no-config` Flag**: Fully implemented

- Allows ignoring configuration file
- Uses default settings when flag is set

---

_Configuration file support implemented - January 2025_
_Updated: Only JS/TS config files supported, JSON support removed_
