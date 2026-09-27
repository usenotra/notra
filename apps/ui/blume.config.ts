import { defineConfig } from "blume";
import { script } from "blume/analytics";
import { filesystem } from "blume/sources";

export default defineConfig({
  agents: {
    llmsTxt: {
      details:
        "Notra UI is a shadcn registry. Install any component or block with `bunx shadcn@latest add https://ui.usenotra.com/r/<name>.json`, for example `bunx shadcn@latest add https://ui.usenotra.com/r/google-ai-overview.json`. The CLI installs missing shadcn dependencies automatically.",
    },
  },
  deployment: {
    site: "https://ui.usenotra.com",
  },
  analytics: process.env.NEXT_PUBLIC_DATABUDDY_WEBSITE_ID
    ? [
        script({
          attributes: {
            crossorigin: "anonymous",
            "data-client-id": process.env.NEXT_PUBLIC_DATABUDDY_WEBSITE_ID,
            "data-track-web-vitals": "true",
            integrity:
              "sha384-mIrxHCUwB2Gapxf+53P5U5AgmPFf13pgldIN6BjGKRcssVlwLB/HreXgaPxRz07Z",
          },
          src: "https://cdn.databuddy.cc/databuddy.v5.js",
          strategy: "async",
        }),
      ]
    : [],
  content: {
    sources: [filesystem({ root: "docs" })],
  },
  description: "Notra UI package showcase, powered by Blume.",
  examples: {
    css: "src/styles/examples.css",
    source: "registry/notra/**/examples/*",
  },
  feedback: false,
  github: {
    dir: "apps/ui",
    owner: "usenotra",
    repo: "notra",
  },
  logo: {
    image: {
      alt: "Notra logo",
      dark: "/logo.svg",
      light: "/logo.svg",
    },
    text: "Notra UI",
  },
  navigation: {
    sidebar: { display: "group" },
  },
  seo: {
    og: {
      enabled: true,
      logo: "public/logo-dark.svg",
      palette: {
        accent: "#8b5cf6",
        background: "#0a0a0a",
        foreground: "#ffffff",
        muted: "#a1a1aa",
      },
    },
    robots: true,
    sitemap: true,
    structuredData: true,
    x: { handle: "@usenotra" },
  },
  theme: {
    accent: "#8b5cf6",
    fonts: {
      body: "inter",
      display: "inter",
      mono: "geist-mono",
    },
  },
  title: "Notra UI",
});
