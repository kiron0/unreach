# Dynamic Import Support

## Overview

Unreach now has comprehensive support for dynamic imports, including:

- **`import()` calls** - ES module dynamic imports
- **`require()` calls** - CommonJS dynamic imports
- **Conditional imports** - Imports inside if statements, ternary operators, etc.
- **Template literals** - Dynamic imports with template strings
- **String concatenation** - Dynamic imports built with string concatenation

## Features

### 1. `import()` Dynamic Imports

Tracks all `import()` calls in your codebase:

```typescript
// Static string
const module = await import('./utils');

// Template literal
const module = await import(`./modules/${name}`);

// Conditional
if (condition) {
  const module = await import('./feature');
}
```

### 2. `require()` Calls

Tracks CommonJS `require()` calls:

```typescript
// Static string
const module = require('./utils');

// Template literal
const module = require(`./modules/${name}`);

// Conditional
if (condition) {
  const module = require('./feature');
}
```

### 3. Conditional Imports

Detects imports inside conditional statements:

```typescript
// If statement
if (process.env.NODE_ENV === 'development') {
  const devTools = await import('./dev-tools');
}

// Ternary operator
const module = condition
  ? await import('./module-a')
  : await import('./module-b');

// Logical expression
const module = condition && await import('./module');
```

### 4. Template Literals

Extracts static parts from template literals:

```typescript
// Can extract: './modules/'
const module = await import(`./modules/${moduleName}`);

// Can extract: './features/'
const feature = require(`./features/${featureName}`);
```

### 5. String Concatenation

Handles imports built with string concatenation:

```typescript
// Can extract: './utils/helper'
const module = await import('./utils/' + 'helper');

// Can extract: './modules/'
const module = require('./modules/' + moduleName);
```

## How It Works

### Parsing Phase

During AST parsing, the parser:

1. **Detects `import()` calls** - Identifies all `import()` expressions
2. **Detects `require()` calls** - Identifies all `require()` function calls
3. **Extracts import paths** - Attempts to extract string values from:
   - String literals
   - Template literals (static parts)
   - String concatenation
   - Binary expressions with `+`
4. **Identifies conditionals** - Tracks if imports are inside:
   - `if` statements
   - Ternary operators (`? :`)
   - Logical expressions (`&&`, `||`)
5. **Marks dynamic imports** - Stores information about:
   - Import path (or partial path for template literals)
   - Type (`import` or `require`)
   - Whether it's conditional
   - Whether it uses template literals

### Analysis Phase

During reachability analysis:

1. **Resolves static paths** - For fully static import paths, resolves them normally
2. **Marks packages as used** - For package imports, marks the package as used
3. **Handles conditional imports** - Even conditional imports mark files as reachable (to be safe)
4. **Handles template literals** - Attempts to resolve when possible, otherwise marks packages as used

## Limitations

### Static Analysis Limitations

Dynamic imports with truly dynamic paths cannot be fully resolved:

```typescript
// ❌ Cannot resolve - variable value unknown
const module = await import(moduleName);

// ❌ Cannot resolve - expression too complex
const module = await import(`./${getModuleName()}`);

// ✅ Can resolve - static string
const module = await import('./utils');

// ⚠️ Partial - extracts static part, marks package as used
const module = await import(`./modules/${moduleName}`);
```

### What Gets Tracked

✅ **Fully Tracked:**
- Static string imports: `import('./utils')`
- Static string requires: `require('./utils')`
- Template literals with static prefixes: `import(\`./modules/\${name}\`)`
- String concatenation: `import('./utils/' + 'helper')`
- Conditional imports (all branches marked as reachable)

⚠️ **Partially Tracked:**
- Template literals with variables (package marked as used, file may not resolve)
- Complex expressions (package marked as used if it's a package import)

❌ **Not Tracked:**
- Imports with completely dynamic paths (variable-only)
- Imports with complex function calls in path

## Examples

### Example 1: Static Dynamic Import

```typescript
// src/utils.ts
export const helper = () => {};

// src/index.ts
const utils = await import('./utils');
// ✅ Detected and resolved - ./utils.ts is marked as reachable
```

### Example 2: Conditional Import

```typescript
// src/feature-a.ts
export const featureA = () => {};

// src/feature-b.ts
export const featureB = () => {};

// src/index.ts
if (condition) {
  const feature = await import('./feature-a');
} else {
  const feature = await import('./feature-b');
}
// ✅ Both files marked as reachable (safe approach)
```

### Example 3: Template Literal

```typescript
// src/modules/module-a.ts
export const moduleA = () => {};

// src/index.ts
const moduleName = 'module-a';
const module = await import(`./modules/${moduleName}`);
// ⚠️ Partially tracked - ./modules/ extracted, package marked as used
// File may not resolve if path is too dynamic
```

### Example 4: Require Call

```typescript
// src/utils.ts
module.exports = { helper: () => {} };

// src/index.ts
const utils = require('./utils');
// ✅ Detected and resolved - ./utils.ts is marked as reachable
```

### Example 5: Package Import

```typescript
// src/index.ts
const lodash = await import('lodash');
// ✅ Package 'lodash' marked as used
```

## Integration with Existing Features

### Works with All Optimizations

Dynamic import support works seamlessly with:

- ✅ **Parallel Processing** - Dynamic imports parsed in parallel
- ✅ **Incremental Analysis** - Dynamic imports cached
- ✅ **AST Caching** - Dynamic import info cached
- ✅ **Lazy Resolution** - Dynamic imports resolved on-demand
- ✅ **Configuration Files** - Can ignore dynamic imports via config

### Works with All Analysis Types

Dynamic imports are considered in:

- ✅ **Unused Packages** - Packages imported dynamically are marked as used
- ✅ **Unused Files** - Files imported dynamically are marked as reachable
- ✅ **Unused Exports** - Exports from dynamically imported files are tracked

## Configuration

You can configure dynamic import handling in `.unreachrc.json`:

```json
{
  "ignore": {
    "imports": [
      "**/*.css",
      "**/*.scss"
    ]
  }
}
```

Note: Dynamic imports are always tracked and cannot be disabled (for safety).

## Performance Impact

Dynamic import support has minimal performance impact:

- **Parsing**: Slightly slower due to additional AST traversal
- **Analysis**: Minimal overhead (only processes when files are reachable)
- **Memory**: Small increase for storing dynamic import metadata

## Best Practices

1. **Use static imports when possible** - Easier to analyze and tree-shake
2. **Document dynamic imports** - Add comments explaining why dynamic
3. **Use consistent patterns** - Makes analysis more accurate
4. **Avoid overly complex paths** - Static analysis has limits

## Enhanced Features (Implemented)

### ✅ Better Template Literal Resolution

The parser now tracks constant variable values and uses them to resolve template literals:

```typescript
// Before: Could only extract static parts
const moduleName = 'utils';
const module = await import(`./modules/${moduleName}`);
// ✅ Now: Resolves to './modules/utils' if moduleName is a constant

// Works with nested constants
const base = './src';
const file = 'index';
const module = await import(`${base}/${file}.js`);
// ✅ Resolves to './src/index.js'
```

### ✅ Variable Tracking for Dynamic Paths

The parser tracks variable assignments and uses them when resolving dynamic imports:

```typescript
const MODULE_PATH = './utils';
const module = await import(MODULE_PATH);
// ✅ Resolves to './utils'

const BASE_DIR = './src';
const MODULE = 'index';
const module = require(`${BASE_DIR}/${MODULE}`);
// ✅ Resolves to './src/index'
```

### ✅ Support for `import.meta.resolve()`

Now detects and tracks `import.meta.resolve()` calls:

```typescript
// ES module import.meta.resolve()
const resolvedPath = import.meta.resolve('./utils');
// ✅ Detected and tracked

// Works with dynamic paths
const module = import.meta.resolve(`./modules/${name}`);
// ✅ Tracked with variable resolution
```

### ✅ Better Handling of `__dirname` and `__filename`

Enhanced support for CommonJS patterns:

```typescript
// String concatenation
const module = require(__dirname + '/utils');
// ✅ Resolves relative to current file's directory

// path.join() pattern
const path = require('path');
const module = require(path.join(__dirname, 'utils', 'helper'));
// ✅ Resolves to __dirname/utils/helper

// Direct concatenation
const module = require(__dirname + '/src/index');
// ✅ Resolves to file directory + '/src/index'
```

### ✅ Support for Webpack-Specific Dynamic Import Patterns

Full support for webpack's dynamic import features:

```typescript
// Webpack magic comments
const module = import(
  /* webpackChunkName: "my-chunk" */
  './module'
);
// ✅ Detected and tracked

// Legacy require.ensure()
require.ensure(['./module-a', './module-b'], (require) => {
  const a = require('./module-a');
});
// ✅ All dependencies tracked

// require.context() for directory imports
const context = require.context('./modules', true, /\.js$/);
// ✅ Base directory tracked
```

## Implementation Details

### Variable Tracking

The parser maintains a map of constant variable values within each file:

- Tracks `const` declarations with string literals
- Tracks template literals with all static parts
- Tracks string concatenation results
- Uses tracked values when resolving dynamic imports

### Template Literal Resolution

Enhanced resolution algorithm:

1. **Extract static parts** from template literal quasis
2. **Resolve expressions** using variable tracking
3. **Combine parts** to form complete path when possible
4. **Fallback** to partial resolution if variables unknown

### Path Resolution

Improved `__dirname`/`__filename` handling:

- Detects `path.join(__dirname, ...)` patterns
- Resolves string concatenation with `__dirname`
- Extracts relative paths from `__dirname` patterns
- Resolves paths relative to current file's directory

### Webpack Support

Comprehensive webpack pattern detection:

- **Magic comments**: Extracts `webpackChunkName` from comments
- **require.ensure()**: Tracks all dependencies in the array
- **require.context()**: Tracks the base directory pattern

## Examples

### Example 1: Variable Tracking

```typescript
// src/config.ts
export const MODULE_BASE = './modules';

// src/index.ts
import { MODULE_BASE } from './config';
const module = await import(`${MODULE_BASE}/feature`);
// ✅ Resolves to './modules/feature' (if MODULE_BASE is imported as constant)
```

### Example 2: __dirname Resolution

```typescript
// src/utils/loader.ts
const path = require('path');
const utils = require(path.join(__dirname, 'helper'));
// ✅ Resolves to src/utils/helper.js

const config = require(__dirname + '/config.json');
// ✅ Resolves to src/utils/config.json
```

### Example 3: Webpack Patterns

```typescript
// Webpack code splitting
const HomePage = lazy(() => import(
  /* webpackChunkName: "home" */
  './pages/Home'
));
// ✅ Tracked with chunk name

// Legacy webpack
require.ensure(['./polyfills'], () => {
  // Application code
});
// ✅ polyfills tracked as dependency
```

## Performance Impact

The enhancements have minimal performance impact:

- **Variable tracking**: O(n) where n is number of variables per file
- **Template resolution**: O(m) where m is template literal complexity
- **Path resolution**: O(1) for most cases
- **Memory**: Small increase for variable value storage (cleared per file)

## Limitations

While significantly improved, some limitations remain:

- **Runtime values**: Cannot track variables assigned at runtime
- **Complex expressions**: Functions, method calls in paths still not resolvable
- **Cross-file constants**: Only tracks constants within the same file
- **Dynamic require.context()**: Cannot enumerate all files in directory statically

## Current Status

All enhanced features listed above are **fully implemented and working**:

- ✅ **Variable Tracking**: Tracks constant variable values within files
- ✅ **Template Literal Resolution**: Resolves template literals using tracked variables
- ✅ **`import.meta.resolve()` Support**: Detects and tracks `import.meta.resolve()` calls
- ✅ **`__dirname`/`__filename` Resolution**: Handles string concatenation and `path.join()` patterns
- ✅ **Webpack Patterns**: Full support for magic comments, `require.ensure()`, and `require.context()`

## Testing

All dynamic import features are tested and working. The implementation handles:

- Static and dynamic import paths
- Template literals with variable resolution
- CommonJS and ES module patterns
- Webpack-specific syntax
- Path resolution with `__dirname` and `__filename`

---

*Dynamic import support enhanced - January 2025*
*All features fully implemented and tested*
