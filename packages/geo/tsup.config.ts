import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/next.ts",
    "src/nuxt.ts",
    "src/netlify.ts",
    "src/tanstack.ts",
    "src/signatures.ts",
    "src/classify.ts",
    "src/markdown.ts",
    "src/html.ts",
    "src/feedback.ts",
  ],
  format: ["esm"],
  outDir: "dist",
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: false,
  treeshake: true,
});
