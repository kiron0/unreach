# Contributing to Unreach

Thank you for your interest in contributing to Unreach! This document provides guidelines and instructions for contributing to the project.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Code Style Guidelines](#code-style-guidelines)
- [Testing](#testing)
- [Making Changes](#making-changes)
- [Pull Request Process](#pull-request-process)
- [Reporting Issues](#reporting-issues)

## Code of Conduct

This project adheres to a code of conduct that all contributors are expected to follow. Please be respectful, inclusive, and constructive in all interactions.

## Getting Started

### Prerequisites

- **Node.js**: Version 18.0.0 or higher
- **npm**: Package manager
- **Git**: Version control

### Fork and Clone

1. Fork the repository on GitHub

2. Clone your fork:
   ```bash
   git clone https://github.com/kiron0/unreach.git
   cd unreach
   ```
3. Add the upstream repository:
   ```bash
   git remote add upstream https://github.com/kiron0/unreach.git
   ```

## Development Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Build the Project

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` directory.

### 3. Run in Development Mode

```bash
# Build and watch for changes
npm run build:watch

# In another terminal, run the CLI
node dist/index.js scan
```

### 4. Link for Local Testing

```bash
# Build first
npm run build

# Link globally (allows using 'unreach' command)
npm link
```

Now you can use `unreach` command from anywhere to test your changes.

## Project Structure

```
package/
├── src/
│   ├── cli/              # CLI interface (args, handler, ui, interactive)
│   ├── core/             # Core error handling
│   ├── lib/              # Core library code
│   │   ├── analyzer/     # Analysis logic (finders, reachability)
│   │   ├── cache.ts      # Caching system
│   │   ├── config.ts     # Configuration loading
│   │   ├── graph.ts      # Dependency graph builder
│   │   ├── parser.ts     # AST parser
│   │   └── ...
│   ├── types/            # TypeScript type definitions
│   └── utils/            # Utility functions
├── dist/                 # Compiled output (generated)
├── reports/              # Documentation and analysis reports
├── tests/                # Test files (co-located with source)
└── package.json
```

### Key Components

- **Parser** (`src/lib/parser.ts`): Parses TypeScript/JavaScript files into AST
- **Graph Builder** (`src/lib/graph.ts`): Builds dependency graph from parsed files
- **Analyzer** (`src/lib/analyzer/`): Performs reachability analysis and finds unused code
- **CLI** (`src/cli/`): Command-line interface and user interaction

## Code Style Guidelines

### TypeScript

- **Strict Mode**: The project uses strict TypeScript settings
- **Type Safety**: Avoid `any` types. Use proper types or `unknown` with type guards
- **Naming Conventions**:
  - Classes: `PascalCase` (e.g., `DependencyGraph`)
  - Functions/Variables: `camelCase` (e.g., `parseFile`)
  - Constants: `UPPER_SNAKE_CASE` (e.g., `MAX_FILE_SIZE`)
  - Files: `kebab-case.ts` (e.g., `config-loader.ts`)

### Formatting

The project uses Prettier for code formatting:

```bash
# Format all files
npm run format

# Or format specific files
npx prettier --write "src/**/*.ts"
```

### Code Organization

- **Single Responsibility**: Each file/class should have one clear purpose
- **Modular Design**: Keep functions small and focused
- **Error Handling**: Use the `UnreachError` class for consistent error handling
- **Comments**: Add JSDoc comments for public APIs

### Example Code Style

```typescript
/**
 * Parses a TypeScript file and extracts dependency information.
 * @param filePath - Path to the file to parse
 * @param useCache - Whether to use cached AST if available
 * @returns Dependency node or null if parsing fails
 */
export function parseFile(
  filePath: string,
  useCache: boolean = true,
): DependencyNode | null {
  // Implementation
}
```

### Import Organization

1. External dependencies (npm packages)
2. Internal modules (from `src/`)
3. Type imports (use `import type` when possible)

```typescript
import chalk from "chalk";
import * as fs from "fs";
import * as path from "path";

import type { DependencyNode } from "../types/index.js";
import { ASTParser } from "./parser.js";
```

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

### Test Structure

Tests are co-located with source files:

- Source: `src/lib/config.ts`
- Test: `src/lib/config.test.ts`

### Writing Tests

- Use **Vitest** as the testing framework
- Follow the `describe` → `it` structure
- Use descriptive test names
- Test both happy paths and edge cases

**Example Test:**

```typescript
import { describe, expect, it } from "vitest";
import { ConfigLoader } from "./config.js";

describe("ConfigLoader", () => {
  it("should load configuration file", () => {
    // Arrange
    const loader = new ConfigLoader("./test-fixtures");

    // Act
    const config = loader.load();

    // Assert
    expect(config).not.toBeNull();
    expect(config?.ignore?.files).toContain("**/*.test.ts");
  });
});
```

### Test Coverage

- Aim for high test coverage, especially for core functionality
- Test edge cases and error conditions
- Use `beforeEach` and `afterEach` for test setup/cleanup
- Mock external dependencies when appropriate

### Test Requirements

- ✅ All tests must pass before submitting a PR
- ✅ New features should include tests
- ✅ Bug fixes should include regression tests
- ✅ Tests should be fast and isolated

## Making Changes

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

### 2. Make Your Changes

- Write clean, well-documented code
- Follow the code style guidelines
- Add tests for new functionality
- Update documentation if needed

### 3. Commit Your Changes

Use clear, descriptive commit messages:

```bash
git commit -m "feat: add file size limit configuration"
git commit -m "fix: resolve config validation error"
git commit -m "test: add tests for watch mode rate limiting"
```

**Commit Message Format:**

- `feat:` - New feature
- `fix:` - Bug fix
- `test:` - Adding or updating tests
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `perf:` - Performance improvements
- `chore:` - Maintenance tasks

### 4. Keep Your Branch Updated

```bash
# Fetch latest changes
git fetch upstream

# Rebase your branch on main
git rebase upstream/main
```

## Pull Request Process

### Before Submitting

1. ✅ **All tests pass**: Run `npm test`
2. ✅ **Code is formatted**: Run `npm run format`
3. ✅ **Build succeeds**: Run `npm run build`
4. ✅ **No linter errors**: Check for TypeScript errors
5. ✅ **Documentation updated**: Update relevant docs if needed

### Creating a Pull Request

1. **Push your branch**:

   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create PR on GitHub**:
   - Go to the repository on GitHub
   - Click "New Pull Request"
   - Select your branch
   - Fill out the PR template

### PR Description Template

```markdown
## Description

Brief description of changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing

- [ ] Tests added/updated
- [ ] All tests pass
- [ ] Manual testing completed

## Checklist

- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings generated
```

### PR Review Process

1. **Automated Checks**: CI will run tests and checks
2. **Code Review**: Maintainers will review your code
3. **Feedback**: Address any requested changes
4. **Approval**: Once approved, your PR will be merged

### After PR is Merged

- Your branch can be deleted
- Update your local main branch: `git pull upstream main`

## Reporting Issues

### Before Reporting

1. Check if the issue already exists
2. Try to reproduce the issue
3. Check the documentation

### Issue Template

When creating an issue, include:

- **Description**: Clear description of the issue
- **Steps to Reproduce**: How to reproduce the issue
- **Expected Behavior**: What should happen
- **Actual Behavior**: What actually happens
- **Environment**: Node.js version, OS, etc.
- **Screenshots/Logs**: If applicable

### Bug Reports

```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:

1. Run 'unreach scan ...'
2. See error

**Expected behavior**
What you expected to happen.

**Environment:**

- Node.js version: [e.g., 18.0.0]
- OS: [e.g., macOS 14.0]
- Unreach version: [e.g., 0.1.0]

**Additional context**
Any other relevant information.
```

## Development Tips

### Debugging

- Use `--debug` flag for detailed error information
- Use `--verbose` flag for detailed processing logs
- Use Node.js debugger: `node --inspect dist/index.js scan`

### Common Tasks

**Adding a new finder (e.g., unused interfaces):**

1. Create `src/lib/analyzer/finders/interface-finder.ts`
2. Implement the finder logic
3. Export from `src/lib/analyzer/finders/index.ts`
4. Add to `src/lib/analyzer/index.ts`
5. Add tests

**Adding a new CLI option:**

1. Add option to `src/cli/args.ts`
2. Add to `ScanOptions` in `src/types/index.ts`
3. Implement logic in `src/cli/handler.ts`
4. Update help text in `src/cli/ui.ts`
5. Add tests

**Adding configuration option:**

1. Add to `UnreachConfig` in `src/lib/config.ts`
2. Add validation in `validateConfig()`
3. Add default in `mergeWithDefaults()`
4. Update documentation
5. Add tests

## Getting Help

- **Documentation**: Check `reports/` directory for detailed docs
- **Issues**: Search existing issues on GitHub
- **Discussions**: Use GitHub Discussions for questions

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Unreach! 🎉
