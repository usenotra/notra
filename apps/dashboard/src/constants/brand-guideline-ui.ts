import type {
  BrandGuidelineAssetKind,
  BrandGuidelineAssetVariant,
  BrandGuidelineColorRole,
  BrandGuidelineFontRole,
  BrandGuidelineScreenshotKind,
  BrandGuidelineTokenType,
} from "@/types/hooks/brand-guidelines";

export const TOKEN_TYPE_ORDER: BrandGuidelineTokenType[] = [
  "spacing",
  "radius",
  "shadow",
  "component",
  "unknown",
];

export const GUIDELINES_SKELETON_KEYS = ["a", "b", "c", "d", "e", "f"] as const;

const COLOR_ROLE_VALUES = [
  "primary",
  "secondary",
  "accent",
  "background",
  "foreground",
  "neutral",
  "custom",
] as const satisfies readonly BrandGuidelineColorRole[];
export const COLOR_ROLE_OPTIONS = COLOR_ROLE_VALUES.map((value) => ({
  value,
}));

const FONT_ROLE_VALUES = [
  "heading",
  "body",
  "button",
  "unknown",
] as const satisfies readonly BrandGuidelineFontRole[];
export const FONT_ROLE_OPTIONS = FONT_ROLE_VALUES.map((value) => ({
  value,
}));

const TOKEN_TYPE_VALUES = [
  "spacing",
  "radius",
  "shadow",
  "component",
  "unknown",
] as const satisfies readonly BrandGuidelineTokenType[];
export const TOKEN_TYPE_OPTIONS = TOKEN_TYPE_VALUES.map((value) => ({
  value,
}));

const ASSET_KIND_VALUES = [
  "logo",
  "wordmark",
] as const satisfies readonly BrandGuidelineAssetKind[];
export const ASSET_KIND_OPTIONS = ASSET_KIND_VALUES.map((value) => ({
  value,
}));

const ASSET_VARIANT_VALUES = [
  "light",
  "dark",
] as const satisfies readonly BrandGuidelineAssetVariant[];
export const ASSET_VARIANT_OPTIONS = ASSET_VARIANT_VALUES.map((value) => ({
  value,
}));

const SCREENSHOT_KIND_VALUES = [
  "desktop_hero",
  "desktop_full_page",
  "mobile_hero",
] as const satisfies readonly BrandGuidelineScreenshotKind[];
export const SCREENSHOT_KIND_OPTIONS = SCREENSHOT_KIND_VALUES.map((value) => ({
  value,
}));

export const ASSET_SLOTS = [
  { kind: "logo", variant: "light" },
  { kind: "logo", variant: "dark" },
  { kind: "wordmark", variant: "light" },
  { kind: "wordmark", variant: "dark" },
] as const satisfies readonly {
  kind: BrandGuidelineAssetKind;
  variant: BrandGuidelineAssetVariant;
}[];

export const EXPECTED_COLOR_ROLES = [
  "primary",
  "secondary",
  "accent",
] as const satisfies readonly BrandGuidelineColorRole[];
