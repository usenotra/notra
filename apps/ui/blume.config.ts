import { defineConfig } from "blume";

export default defineConfig({
  analytics: {
    scripts: process.env.NEXT_PUBLIC_DATABUDDY_WEBSITE_ID
      ? [
          {
            attributes: {
              crossorigin: "anonymous",
              "data-client-id": process.env.NEXT_PUBLIC_DATABUDDY_WEBSITE_ID,
              "data-track-web-vitals": "true",
              integrity:
                "sha384-mIrxHCUwB2Gapxf+53P5U5AgmPFf13pgldIN6BjGKRcssVlwLB/HreXgaPxRz07Z",
            },
            src: "https://cdn.databuddy.cc/databuddy.v5.js",
            strategy: "async",
          },
        ]
      : [],
  },
  description: "Notra UI package showcase, powered by Blume.",
  examples: { css: "examples/theme.css" },
  logo: {
    image: {
      alt: "Notra logo",
      dark: "/logo.svg",
      light: "/logo.svg",
    },
    text: "Notra UI",
  },
  navigation: {
    sidebar: [
      "/",
      {
        collapsed: false,
        items: [
          "/button",
          "/input",
          "/textarea",
          "/select",
          "/badge",
          "/alert",
          "/card",
          "/tabs",
          "/table",
          "/dialog",
          "/switch",
        ],
        label: "Components",
      },
    ],
  },
  seo: {
    og: {
      enabled: true,
      logo: "public/logo.svg",
    },
  },
  theme: {
    accent: "oklch(0.55 0.219 292.717)",
    background: {
      dark: "hsl(233 7% 8%)",
      light: "#ffffff",
    },
    fonts: {
      body: "inter",
      display: "inter",
      mono: "geist-mono",
    },
    mode: "system",
    radius: "md",
  },
  title: "Notra UI",
});
