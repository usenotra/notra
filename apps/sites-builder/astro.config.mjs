// Builds ONE area (blog or changelog) of a customer site. The notra-sites CLI
// prepares `.notra/work` and calls `astro build` once per mounted area.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

const paramsPath = process.env.NOTRA_BUILD_PARAMS;
if (!paramsPath) {
  throw new Error(
    "NOTRA_BUILD_PARAMS is not set; run builds through `notra-sites build`"
  );
}
const params = JSON.parse(readFileSync(paramsPath, "utf8"));
const workDir = resolve(params.workDir);
const siteDir = resolve(workDir, "site");
const codeblocks = params.config.styling?.codeblocks ?? "system";
// notra.json `styling.codeblocks`: follow the site mode, always dark, one Shiki theme, or a light/dark pair.
function shikiThemesFor(setting) {
  if (setting === "system") {
    return { light: "github-light", dark: "github-dark" };
  }
  if (setting === "dark") {
    return { light: "github-dark", dark: "github-dark" };
  }
  return typeof setting === "string"
    ? { light: setting, dark: setting }
    : setting;
}
const shikiThemes = shikiThemesFor(codeblocks);

export default defineConfig({
  site: params.publicOrigin,
  base: params.mount,
  outDir: resolve(workDir, "out", params.area),
  publicDir: resolve(siteDir, "public"),
  cacheDir: resolve(workDir, "cache", params.area),
  trailingSlash: "ignore",
  build: {
    format: "directory",
    assets: "_notra/assets",
    inlineStylesheets: "auto",
  },
  devToolbar: { enabled: false },
  telemetry: false,
  // MDX does not pick up markdown.shikiConfig under Astro 7's default processor, so pass it to both.
  integrations: [
    mdx({ shikiConfig: { themes: shikiThemes, wrap: false } }),
    react(),
  ],
  markdown: {
    shikiConfig: {
      themes: { light: "github-light", dark: "github-dark" },
      wrap: true,
    },
  },
  vite: {
    plugins: [tailwindcss()],
    build: {
      rollupOptions: {
        // Astro's own `"use astro:head-inject"` directive in every MDX entry: harmless, and
        // customers can't act on it, so it must not fill their build log with warnings.
        onwarn(warning, warn) {
          if (warning.code === "MODULE_LEVEL_DIRECTIVE") {
            return;
          }
          warn(warning);
        },
      },
    },
    resolve: {
      alias: {
        "@site": siteDir,
        "@notra/builtins": resolve("src/builtins/index.ts"),
        // The customer's style.css / styles/*.css, loaded after the theme.
        "@notra/custom-css": resolve(workDir, "custom.css"),
      },
    },
    server: { fs: { allow: [workDir, resolve(".")] } },
    logLevel: "warn",
  },
});
