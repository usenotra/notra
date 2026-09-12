import type { BrandGuidelineScreenshotConfig } from "@/types/brand-guidelines";

export const BRAND_GUIDELINE_LEADING_WWW_REGEX = /^www\./i;

export const BRAND_GUIDELINE_TRAILING_SLASH_REGEX = /\/$/;

export const BRAND_GUIDELINE_TOKEN_GROUPS = [
  "spacing",
  "elementSpacing",
  "radii",
  "radius",
];

export const BRAND_GUIDELINE_DESKTOP_SCREENSHOT_CONFIG = {
  kind: "desktop_hero",
  width: 1920,
  height: 1080,
  fullPage: false,
  sortOrder: 0,
} satisfies BrandGuidelineScreenshotConfig;

export const BRAND_GUIDELINE_MAX_SCREENSHOT_SLICES = 50;

export const BRAND_GUIDELINE_SCREENSHOT_WAIT_MS = 10_000;

export const BRAND_GUIDELINE_POLL_INTERVAL_MS = 3000;
