import { fileURLToPath } from "node:url";

import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig, loadEnv } from "vite";

import { dashboardWorkflow } from "./src/utils/framework-workflow-plugin";

export default defineConfig(({ mode }) => {
  const publicEnvironment = loadEnv(mode, process.cwd(), "NEXT_PUBLIC_");
  const define = Object.fromEntries(
    Object.entries({ ...publicEnvironment, ...process.env })
      .filter(
        ([key, value]) => key.startsWith("NEXT_PUBLIC_") && value !== undefined
      )
      .map(([key, value]) => [`process.env.${key}`, JSON.stringify(value)])
  );

  return {
    define,
    environments: {
      client: {
        build: {
          rolldownOptions: {
            // Parity with Next's production `removeConsole` (errors and
            // warnings stay): the browser bundle drops debug logging. Server
            // logs are untouched.
            treeshake: {
              manualPureFunctions: [
                "console.log",
                "console.info",
                "console.debug",
                "console.trace",
              ],
            },
          },
        },
      },
    },
    optimizeDeps: {
      exclude: ["@resvg/resvg-js"],
    },
    server: { host: "127.0.0.1", port: 3000, strictPort: true },
    resolve: {
      alias: [
        {
          find: "@",
          replacement: fileURLToPath(new URL("src", import.meta.url)),
        },
        {
          find: /^shiki\/wasm$/,
          replacement: fileURLToPath(import.meta.resolve("shiki/wasm")),
        },
      ],
    },
    plugins: [
      dashboardWorkflow(),
      tailwindcss(),
      tanstackStart(),
      react(),
      // Parity with the former Next `reactCompiler: true`: components rely on
      // its memoization (e.g. SettingsPane's titleAccessory effect loops
      // without it).
      babel({ presets: [reactCompilerPreset()] }),
      nitro(),
    ],
    ssr: {
      external: [
        "@resvg/resvg-js",
        "@cursor/sdk",
        "@ai-sdk/code-mode",
        "run",
        "sharp",
      ],
    },
  };
});
