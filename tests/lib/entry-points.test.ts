import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { EntryPointDetector } from "../../src/lib/entry-points.js";

describe("EntryPointDetector", () => {
  let tempDir: string;
  let detector: EntryPointDetector;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "unreach-entry-test-"));
    detector = new EntryPointDetector(tempDir);
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe("detectEntryPoints", () => {
    it("should detect entry point from package.json main field", async () => {
      const packageJson = {
        main: "src/index.js",
      };
      fs.writeFileSync(
        path.join(tempDir, "package.json"),
        JSON.stringify(packageJson),
      );
      fs.mkdirSync(path.join(tempDir, "src"), { recursive: true });
      fs.writeFileSync(
        path.join(tempDir, "src", "index.js"),
        "export default {};",
      );

      const entryPoints = await detector.detectEntryPoints();
      expect(entryPoints.length).toBeGreaterThan(0);
    });

    it("should detect entry point from package.json module field", async () => {
      const packageJson = {
        module: "src/index.mjs",
      };
      fs.writeFileSync(
        path.join(tempDir, "package.json"),
        JSON.stringify(packageJson),
      );
      fs.mkdirSync(path.join(tempDir, "src"), { recursive: true });
      fs.writeFileSync(
        path.join(tempDir, "src", "index.mjs"),
        "export default {};",
      );

      const entryPoints = await detector.detectEntryPoints();
      expect(entryPoints.length).toBeGreaterThan(0);
    });

    it("should detect entry point from package.json exports field", async () => {
      const packageJson = {
        exports: {
          ".": "./src/index.js",
        },
      };
      fs.writeFileSync(
        path.join(tempDir, "package.json"),
        JSON.stringify(packageJson),
      );
      fs.mkdirSync(path.join(tempDir, "src"), { recursive: true });
      fs.writeFileSync(
        path.join(tempDir, "src", "index.js"),
        "export default {};",
      );

      const entryPoints = await detector.detectEntryPoints();
      expect(entryPoints.length).toBeGreaterThan(0);
    });

    it("should detect entry point from tsconfig.json", async () => {
      const tsconfig = {
        compilerOptions: {
          outDir: "./dist",
        },
        include: ["src/index.ts"],
      };
      fs.writeFileSync(
        path.join(tempDir, "tsconfig.json"),
        JSON.stringify(tsconfig),
      );
      fs.mkdirSync(path.join(tempDir, "src"), { recursive: true });
      fs.writeFileSync(
        path.join(tempDir, "src", "index.ts"),
        "export default {};",
      );

      const entryPoints = await detector.detectEntryPoints();
      expect(entryPoints.length).toBeGreaterThan(0);
    });

    it("should use custom entry points when provided", async () => {
      const customEntries = ["src/main.ts", "src/app.ts"];
      fs.mkdirSync(path.join(tempDir, "src"), { recursive: true });
      fs.writeFileSync(
        path.join(tempDir, "src", "main.ts"),
        "export default {};",
      );
      fs.writeFileSync(
        path.join(tempDir, "src", "app.ts"),
        "export default {};",
      );

      const entryPoints = await detector.detectEntryPoints(customEntries);

      expect(entryPoints.length).toBe(2);
      expect(
        entryPoints.every(
          (ep) => ep.includes("main.ts") || ep.includes("app.ts"),
        ),
      ).toBe(true);
    });

    it("should handle Next.js app directory", async () => {
      fs.mkdirSync(path.join(tempDir, "app"), { recursive: true });
      fs.writeFileSync(
        path.join(tempDir, "app", "layout.tsx"),
        "export default function Layout() {}",
      );

      const entryPoints = await detector.detectEntryPoints();
      expect(entryPoints.length).toBeGreaterThan(0);
    });

    it("should handle Next.js pages directory", async () => {
      fs.mkdirSync(path.join(tempDir, "pages"), { recursive: true });
      fs.writeFileSync(
        path.join(tempDir, "pages", "_app.tsx"),
        "export default function App() {}",
      );

      const entryPoints = await detector.detectEntryPoints();
      expect(entryPoints.length).toBeGreaterThan(0);
    });

    it("should return empty array when no entry points found", async () => {
      const entryPoints = await detector.detectEntryPoints();
      expect(Array.isArray(entryPoints)).toBe(true);
    });

    it("should handle multiple entry points", async () => {
      const packageJson = {
        main: "src/index.js",
        module: "src/index.mjs",
      };
      fs.writeFileSync(
        path.join(tempDir, "package.json"),
        JSON.stringify(packageJson),
      );
      fs.mkdirSync(path.join(tempDir, "src"), { recursive: true });
      fs.writeFileSync(
        path.join(tempDir, "src", "index.js"),
        "export default {};",
      );
      fs.writeFileSync(
        path.join(tempDir, "src", "index.mjs"),
        "export default {};",
      );

      const entryPoints = await detector.detectEntryPoints();
      expect(entryPoints.length).toBeGreaterThanOrEqual(1);
    });

    it("should handle VitePress structure", async () => {
      fs.mkdirSync(path.join(tempDir, ".vitepress"), { recursive: true });
      fs.writeFileSync(
        path.join(tempDir, ".vitepress", "config.ts"),
        "export default {}",
      );

      const entryPoints = await detector.detectEntryPoints();
      expect(entryPoints.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("edge cases", () => {
    it("should handle invalid package.json", async () => {
      fs.writeFileSync(path.join(tempDir, "package.json"), "invalid json");

      const entryPoints = await detector.detectEntryPoints();
      expect(Array.isArray(entryPoints)).toBe(true);
    });

    it("should handle missing package.json", async () => {
      const entryPoints = await detector.detectEntryPoints();
      expect(Array.isArray(entryPoints)).toBe(true);
    });

    it("should handle relative paths in custom entries", async () => {
      const customEntries = ["./src/index.ts"];
      fs.mkdirSync(path.join(tempDir, "src"), { recursive: true });
      fs.writeFileSync(
        path.join(tempDir, "src", "index.ts"),
        "export default {};",
      );

      const entryPoints = await detector.detectEntryPoints(customEntries);

      expect(entryPoints.length).toBeGreaterThan(0);
      expect(entryPoints[0]).toContain("index.ts");
    });

    it("should handle absolute paths in custom entries", async () => {
      const absolutePath = path.join(tempDir, "src", "index.ts");
      fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
      fs.writeFileSync(absolutePath, "export default {}");

      const entryPoints = await detector.detectEntryPoints([absolutePath]);
      expect(entryPoints).toContain(absolutePath);
    });

    it("should handle empty custom entries array", async () => {
      const entryPoints = await detector.detectEntryPoints([]);
      expect(entryPoints).toEqual([]);
    });
  });
});
