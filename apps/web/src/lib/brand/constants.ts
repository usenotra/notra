import type { BrandAssetPaths, BrandColor, BrandFont } from "~types/brand";

export const BRAND_ASSETS: BrandAssetPaths = {
  mark: {
    svg: "/brand/notra-mark.svg",
    png: "/brand/notra-mark.png",
  },
  wordmark: {
    svg: "/brand/notra-wordmark.svg",
    png: "/brand/notra-wordmark.png",
  },
  wordmarkDark: {
    svg: "/brand/notra-wordmark-dark.svg",
    png: "/brand/notra-wordmark-dark.png",
  },
  zip: "/brand/notra-brand-assets.zip",
};

export const BRAND_COLORS: BrandColor[] = [
  {
    name: "Primary",
    hex: "#8B5CF6",
    value: "oklch(0.6056 0.2189 292.7172)",
    usage: "Accent color for links, buttons, and highlights.",
  },
  {
    name: "Lavender",
    hex: "#C8B2EE",
    value: "#C8B2EE",
    usage: "Fill color of the Notra mark.",
  },
  {
    name: "Ink",
    hex: "#1E1E1E",
    value: "#1E1E1E",
    usage: "Stroke color of the Notra mark.",
  },
  {
    name: "Cream",
    hex: "#F6F3F1",
    value: "#F6F3F1",
    usage: "Tile behind the mark on dark surfaces.",
  },
  {
    name: "Background Light",
    hex: "#FFFFFF",
    value: "hsl(0 0% 100%)",
    usage: "Default light surface.",
  },
  {
    name: "Background Dark",
    hex: "#131316",
    value: "hsl(233 7% 8%)",
    usage: "Default dark surface.",
  },
];

export const BRAND_FONTS: BrandFont[] = [
  {
    name: "Inter",
    fontClassName: "font-sans",
    role: "UI, body, and product type. Loaded as font-sans.",
    googleFontsUrl: "https://fonts.google.com/specimen/Inter",
    source: "Google Fonts",
  },
  {
    name: "Satoshi",
    fontClassName: "font-display",
    role: "Marketing display and section headings. Loaded as font-display.",
    googleFontsUrl: "https://www.fontshare.com/fonts/satoshi",
    source: "Fontshare",
  },
  {
    name: "Instrument Serif",
    fontClassName: "font-serif",
    role: "Scarce editorial accent. Not for headings, buttons, or tables.",
    googleFontsUrl: "https://fonts.google.com/specimen/Instrument+Serif",
    source: "Google Fonts",
  },
];

export const FONT_SAMPLE = "The quick brown fox jumps over the lazy dog";
