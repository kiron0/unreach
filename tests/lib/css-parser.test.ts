import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CSSParser } from "../../src/lib/css-parser.js";

describe("CSSParser", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "unreach-css-test-"));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe("parseCSSFile", () => {
    it("should parse CSS file and extract classes", () => {
      const cssFile = path.join(tempDir, "styles.css");
      fs.writeFileSync(cssFile, ".container { color: red; } .main { }");

      const classes = CSSParser.parseCSSFile(cssFile);
      expect(classes.has("container")).toBe(true);
      expect(classes.has("main")).toBe(true);
    });

    it("should return empty set for non-existent file", () => {
      const classes = CSSParser.parseCSSFile(
        path.join(tempDir, "nonexistent.css"),
      );
      expect(classes.size).toBe(0);
    });

    it("should handle empty CSS file", () => {
      const cssFile = path.join(tempDir, "empty.css");
      fs.writeFileSync(cssFile, "");

      const classes = CSSParser.parseCSSFile(cssFile);
      expect(classes.size).toBe(0);
    });
  });

  describe("extractClasses", () => {
    it("should extract class selectors", () => {
      const css = ".container { } .main-content { } .sidebar { }";
      const classes = CSSParser.extractClasses(css);

      expect(classes.has("container")).toBe(true);
      expect(classes.has("main-content")).toBe(true);
      expect(classes.has("sidebar")).toBe(true);
    });

    it("should extract classes from @apply directives", () => {
      const css = ".test { @apply container main; }";
      const classes = CSSParser.extractClasses(css);

      expect(classes.has("container")).toBe(true);
      expect(classes.has("main")).toBe(true);
    });

    it("should ignore pseudo-classes", () => {
      const css = ".container:hover { } .main:focus { }";
      const classes = CSSParser.extractClasses(css);

      expect(classes.has("container")).toBe(true);
      expect(classes.has("main")).toBe(true);
    });

    it("should ignore classes with parentheses", () => {
      const css = ".container(1) { } .main { }";
      const classes = CSSParser.extractClasses(css);

      expect(classes.has("main")).toBe(true);
      expect(classes.has("container(1)")).toBe(false);
    });

    it("should handle multiple @apply directives", () => {
      const css = `
        .test1 { @apply container main; }
        .test2 { @apply sidebar footer; }
      `;
      const classes = CSSParser.extractClasses(css);

      expect(classes.has("container")).toBe(true);
      expect(classes.has("main")).toBe(true);
      expect(classes.has("sidebar")).toBe(true);
      expect(classes.has("footer")).toBe(true);
    });

    it("should handle classes with underscores and hyphens", () => {
      const css = ".container_main { } .main-content { } .test_class { }";
      const classes = CSSParser.extractClasses(css);

      expect(classes.has("container_main")).toBe(true);
      expect(classes.has("main-content")).toBe(true);
      expect(classes.has("test_class")).toBe(true);
    });

    it("should ignore important flags in @apply", () => {
      const css = ".test { @apply !container main; }";
      const classes = CSSParser.extractClasses(css);

      expect(classes.has("main")).toBe(true);
      expect(classes.has("!container")).toBe(false);
    });

    it("should handle nested selectors", () => {
      const css = ".container { .nested { } } .main { }";
      const classes = CSSParser.extractClasses(css);

      expect(classes.has("container")).toBe(true);
      expect(classes.has("nested")).toBe(true);
      expect(classes.has("main")).toBe(true);
    });

    it("should handle empty class selectors", () => {
      const css = ". { } .container { }";
      const classes = CSSParser.extractClasses(css);

      expect(classes.has("container")).toBe(true);
    });
  });

  describe("isCSSFile", () => {
    it("should return true for .css files", () => {
      expect(CSSParser.isCSSFile("styles.css")).toBe(true);
    });

    it("should return true for .scss files", () => {
      expect(CSSParser.isCSSFile("styles.scss")).toBe(true);
    });

    it("should return true for .sass files", () => {
      expect(CSSParser.isCSSFile("styles.sass")).toBe(true);
    });

    it("should return true for .less files", () => {
      expect(CSSParser.isCSSFile("styles.less")).toBe(true);
    });

    it("should return true for .styl files", () => {
      expect(CSSParser.isCSSFile("styles.styl")).toBe(true);
    });

    it("should return false for .ts files", () => {
      expect(CSSParser.isCSSFile("file.ts")).toBe(false);
    });

    it("should return false for files without extension", () => {
      expect(CSSParser.isCSSFile("file")).toBe(false);
    });

    it("should handle case-insensitive extensions", () => {
      expect(CSSParser.isCSSFile("styles.CSS")).toBe(true);
      expect(CSSParser.isCSSFile("styles.SCSS")).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("should handle CSS with comments", () => {
      const css = "/* comment */ .container { } /* another */";
      const classes = CSSParser.extractClasses(css);

      expect(classes.has("container")).toBe(true);
    });

    it("should handle CSS with media queries", () => {
      const css = "@media (max-width: 768px) { .container { } }";
      const classes = CSSParser.extractClasses(css);

      expect(classes.has("container")).toBe(true);
    });

    it("should handle CSS with keyframes", () => {
      const css = "@keyframes fade { } .container { }";
      const classes = CSSParser.extractClasses(css);

      expect(classes.has("container")).toBe(true);
    });

    it("should handle very long class names", () => {
      const longName = "a".repeat(1000);
      const css = `.${longName} { }`;
      const classes = CSSParser.extractClasses(css);

      expect(classes.has(longName)).toBe(true);
    });

    it("should handle multiple spaces in @apply", () => {
      const css = ".test { @apply   container    main   ; }";
      const classes = CSSParser.extractClasses(css);

      expect(classes.has("container")).toBe(true);
      expect(classes.has("main")).toBe(true);
    });
  });
});
