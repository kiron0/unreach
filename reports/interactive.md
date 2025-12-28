# Interactive CLI Documentation

## Overview

The Interactive CLI provides an easy-to-use menu interface for configuring scan options without needing to remember command-line flags.

## Usage

```bash
unreach scan --interactive
```

## Features

The interactive menu guides you through:

1. **Directory Selection**: Choose which directory to scan
2. **Entry Points**: Specify custom entry points (comma-separated) or leave empty for auto-detection
3. **Export Format**: Choose from JSON, CSV, TSV, Markdown, HTML, or None (display in terminal)
4. **Group Output**: Group results by type (default) or by file
5. **Visualization**: Option to generate dependency graph visualization
6. **Benchmark**: Option to show performance metrics

## Example Session

```
🔍 Unreach Interactive Setup

? Directory to scan: /path/to/project
? Entry points (comma-separated, leave empty for auto-detection):
? Export format: None (display in terminal)
? Group output by: Type (packages, imports, exports, etc.)
? Generate dependency graph visualization? No
? Show performance benchmarks? No
```

## Integration

The interactive mode integrates seamlessly with command-line options. CLI flags take precedence over interactive selections, allowing you to combine both approaches:

```bash
# Use interactive mode but override quiet setting
unreach scan --interactive --quiet

# Use interactive mode but force verbose output
unreach scan --interactive --verbose
```

## Technical Details

- Built with `inquirer` library
- Requires TTY terminal (automatically falls back to non-interactive mode if not available)
- All selections are validated before proceeding
- Options are converted to standard `ScanOptions` format
