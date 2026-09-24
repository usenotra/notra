import type { FontSpec } from "@notra/ai/types/repo-image";

export const AGENT_TIMEOUT_MS = 960_000;
export const RECOVERY_AGENT_TIMEOUT_MS = 180_000;
export const REPO_IMAGE_OUTPUT_HTML_PATH = "output.html";
export const MIN_REPO_IMAGE_HTML_BYTES = 1500;
export const IMAGE_GEN_AGENT_SKILLS_INSTALL_COMMAND =
  "npx skills add usenotra/skills --skill brand-logos --skill satori --skill marketing-image-generation --yes";
export const IMAGE_GEN_MODEL_ID = "vercel/anthropic/claude-opus-5.5";
export const IMAGE_REVIEW_MODEL_ID = "vercel/anthropic/claude-sonnet-4.6";
export const BOX_BASE_URL =
  process.env.UPSTASH_BOX_BASE_URL ?? "https://us-east-1.box.upstash.com";
export const TRAILING_SLASH_RE = /\/$/;

export const REPO_IMAGE_WIDTH = 1200;
export const REPO_IMAGE_HEIGHT = 630;

export const GOOGLE_FONT_URL_REGEX =
  /src: url\((.+?)\) format\('(opentype|truetype)'\)/;

export const FONT_SPECS = [
  { name: "Inter", weight: 400, family: "Inter" },
  { name: "Inter", weight: 700, family: "Inter:wght@700" },
  { name: "Geist", weight: 400, family: "Geist" },
  { name: "Geist", weight: 700, family: "Geist:wght@700" },
  { name: "Instrument Serif", weight: 400, family: "Instrument Serif" },
  { name: "JetBrains Mono", weight: 500, family: "JetBrains Mono:wght@500" },
] satisfies FontSpec[];

export const ALLOWED_FONTS = ["Inter", "Geist"];

export const SATORI_VALID_DISPLAY = new Set(["flex", "contents", "none"]);

export const STYLE_ATTR_RE = /style\s*=\s*(['"])([\s\S]*?)\1/i;
export const DISPLAY_STYLE_RE = /(^|;)\s*display\s*:/i;
export const LEADING_STYLE_SEPARATOR_RE = /^\s*;?/;

export const LONG_FETCH_TIMEOUT_MS = 1_080_000;
