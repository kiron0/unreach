import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["./src/index.ts"],
  format: ["cjs", "esm"],
  dts: true,
  clean: true,
  minify: "terser",
  target: "es2020",
  treeshake: true,
  splitting: false,
  bundle: true,
  esbuildOptions(options) {
    options.drop = ["debugger"];
  },
});
