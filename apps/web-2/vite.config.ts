import { fileURLToPath } from "node:url";

import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import mdx from "fumadocs-mdx/vite";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

import * as sourceConfig from "./source.config";
import { buildSecurityHeaders } from "./src/utils/security-headers";

const SERVER_ONLY_PACKAGES = [
  "@remotion/bundler",
  "@remotion/renderer",
  "sharp",
];

const RAW_QUERY_REGEX = /\?(.*&)?raw(&|$)/;

async function contentMdx(): ReturnType<typeof mdx> {
  const plugin = await mdx(sourceConfig);
  const { transform } = plugin;
  if (typeof transform !== "function") {
    return plugin;
  }
  return {
    ...plugin,
    transform(code, id, options) {
      if (RAW_QUERY_REGEX.test(id)) {
        return;
      }
      return transform.call(this, code, id, options);
    },
  };
}

export default defineConfig(({ command }) => ({
  envPrefix: ["VITE_", "NEXT_PUBLIC_"],
  resolve: {
    tsconfigPaths: true,
    alias: {
      "next/image": fileURLToPath(
        new URL("src/lib/shims/next-image.tsx", import.meta.url)
      ),
    },
  },
  server: {
    port: 3001,
  },
  optimizeDeps: {
    exclude: SERVER_ONLY_PACKAGES,
  },
  ssr: {
    external: SERVER_ONLY_PACKAGES,
    noExternal: [
      "@notra/ui",
      "@notra/email",
      "@notra/kiwi",
      "@scritto/react",
      "@scritto/core",
      "react-fast-marquee",
      "react-tweet",
    ],
  },
  environments: {
    ssr: {
      resolve: {
        external: [...SERVER_ONLY_PACKAGES, "react", "react-dom"],
      },
      optimizeDeps: {
        include: [
          "@notra/ui > react-fast-marquee",
          "@notra/kiwi > opentype.js",
        ],
        rolldownOptions: {
          external: ["react", "react-dom", "react/jsx-runtime"],
        },
      },
    },
  },
  plugins: [
    contentMdx(),
    tailwindcss(),
    tanstackStart(),
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    nitro({
      traceDeps: [...SERVER_ONLY_PACKAGES, "react", "react-dom"],
      routeRules: {
        "/**": { headers: buildSecurityHeaders(command === "serve") },
      },
    }),
  ],
}));
