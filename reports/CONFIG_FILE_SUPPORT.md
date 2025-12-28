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

1. `.unreachrc.json`
2. `unreach.config.json`
3. `.unreachrc.js` (future support)
4. `unreach.config.js` (future support)

## Configuration File Location

Configuration files should be placed in the project root directory (same level as `package.json`).

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
```json
{
  "ignore": {
    "files": ["**/*.test.ts", "**/fixtures/**", "**/__tests__/**"]
  }
}
```

#### `ignore.packages`

Array of package name patterns to exclude from unused packages detection.

**Example:**
```json
{
  "ignore": {
    "packages": ["@types/*", "eslint-*"]
  }
}
```

#### `ignore.exports`

Array of export name patterns to exclude from unused exports detection.

**Example:**
```json
{
  "ignore": {
    "exports": ["**/index.ts"]
  }
}
```

#### `ignore.functions`

Array of function name patterns to exclude from unused functions detection.

**Example:**
```json
{
  "ignore": {
    "functions": ["main", "test", "setup*"]
  }
}
```

#### `ignore.variables`

Array of variable name patterns to exclude from unused variables detection.

**Example:**
```json
{
  "ignore": {
    "variables": ["_unused", "temp*"]
  }
}
```

#### `ignore.imports`

Array of import path patterns to exclude from unused imports detection.

**Example:**
```json
{
  "ignore": {
    "imports": ["**/*.css", "**/*.scss"]
  }
}
```

### `entryPoints`

Custom entry points for analysis. If not specified, Unreach will auto-detect entry points.

**Example:**
```json
{
  "entryPoints": ["src/index.ts", "src/cli.ts"]
}
```

**Note:** CLI `--entry` option takes precedence over config entry points.

### `excludePatterns`

Additional file patterns to exclude from analysis (beyond the default exclusions).

**Example:**
```json
{
  "excludePatterns": ["**/node_modules/**", "**/dist/**", "**/*.d.ts"]
}
```

### `rules`

Enable or disable specific analysis rules. All rules are enabled by default (`true`).

**Example:**
```json
{
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

### `fix`

Auto-fix configuration (for future implementation).

**Example:**
```json
{
  "fix": {
    "enabled": false,
    "backup": true,
    "interactive": false
  }
}
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

Simply create `.unreachrc.json` in your project root:

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
# Currently, config is always loaded if present
# Future: --no-config flag may be added
```

## Migration Guide

### From CLI Flags to Config File

**Before (CLI flags):**
```bash
unreach scan --entry src/index.ts --entry src/cli.ts
```

**After (Config file):**
```json
{
  "entryPoints": ["src/index.ts", "src/cli.ts"]
}
```

Then simply run:
```bash
unreach scan
```

## Troubleshooting

### Configuration Not Loading

1. Check file name: Must be `.unreachrc.json` or `unreach.config.json`
2. Check location: Must be in project root
3. Check JSON syntax: Must be valid JSON
4. Check file permissions: Must be readable

### Patterns Not Matching

1. Use absolute paths or relative paths from project root
2. Use proper glob syntax (`*`, `**`, `?`)
3. Test patterns with simple examples first
4. Check path separators (use `/` for cross-platform compatibility)

### Entry Points Not Working

1. Ensure entry points exist
2. Use absolute paths or paths relative to project root
3. CLI `--entry` option overrides config entry points
4. Check that files are not excluded by `excludePatterns`

## Best Practices

1. **Version Control**: Commit `.unreachrc.json` to version control
2. **Team Consistency**: Share configuration across team members
3. **Documentation**: Document why certain patterns are ignored
4. **Regular Review**: Periodically review ignored patterns
5. **Start Simple**: Begin with basic configuration and add patterns as needed

## Future Enhancements

- Support for `.js` and `.ts` configuration files
- Support for `package.json` `unreach` field
- Support for multiple configuration files (project + user)
- Configuration validation and error messages
- `--no-config` flag to ignore configuration file

---

*Configuration file support implemented - January 2025*
