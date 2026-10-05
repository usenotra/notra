import { fileURLToPath } from "node:url";

import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  root: fileURLToPath(new URL("fixture", import.meta.url)),
  cacheDir: fileURLToPath(
    new URL("../node_modules/.cache/browser-vite", import.meta.url)
  ),
  envDir: false,
  plugins: [
    tailwindcss(),
    react(),
    babel({ presets: [reactCompilerPreset()] }),
  ],
  resolve: {
    alias: { "@": fileURLToPath(new URL("../src", import.meta.url)) },
    dedupe: ["react", "react-dom", "@tanstack/react-query"],
  },
  server: { host: "127.0.0.1", port: 3117, strictPort: true },
});
