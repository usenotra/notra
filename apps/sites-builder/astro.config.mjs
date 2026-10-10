import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import mdx from "@astrojs/mdx";
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
  srcDir: fileURLToPath(new URL("src", import.meta.url)),
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
  integrations: [
    mdx({ shikiConfig: { themes: shikiThemes, wrap: false } }),
    ...(params.hasReactComponents
      ? [(await import("@astrojs/react")).default()]
      : []),
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
        "@notra/builtins/SiteAreas.astro": resolve(
          "src/components/SiteAreas.astro"
        ),
        "@notra/builtins/ThemeToggle.astro": resolve(
          "src/components/ThemeToggle.astro"
        ),
        "@notra/builtins": resolve("src/builtins"),
        "@notra/custom-css": resolve(workDir, "custom.css"),
      },
    },
    server: {
      fs: { allow: [workDir, resolve("."), resolve("../../node_modules")] },
    },
    logLevel: "warn",
  },
});
