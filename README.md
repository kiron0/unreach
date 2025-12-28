# Unreach

**A CLI that deeply analyzes a codebase to find what exists but is truly unused — packages, imports, exports, functions, files, and even configs — with real dependency awareness.**

## Quick Start

### Installation

```bash
# Run with npx (no global install)
npx unreach@latest scan

# Or install globally
npm install -g unreach
```

### Basic Usage

```bash
# Scan current directory
unreach scan

# Scan with custom entry point(s)
unreach scan --entry src/index.ts,src/cli.ts

# Export results
unreach scan --export json
```

## Documentation

For complete documentation, examples, and advanced features, visit **[unreach.js.org](https://unreach.js.org)**

## License

MIT

---

_"Unreach: Find what you can delete without breaking your project."_
