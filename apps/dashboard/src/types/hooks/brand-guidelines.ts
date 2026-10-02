export type BrandGuidelineStatus = "queued" | "generating" | "ready" | "failed";

export type BrandGuidelineColorRole =
  | "primary"
  | "secondary"
  | "accent"
  | "background"
  | "foreground"
  | "neutral"
  | "custom";

export type BrandGuidelineFontRole = "heading" | "body" | "button" | "unknown";

export type BrandGuidelineTokenType =
  | "spacing"
  | "radius"
  | "shadow"
  | "component"
  | "unknown";

export type BrandGuidelineAssetKind = "logo" | "wordmark";

export type BrandGuidelineAssetVariant = "light" | "dark";

export type BrandGuidelineScreenshotKind =
  | "desktop_hero"
  | "desktop_full_page"
  | "mobile_hero";

export interface BrandGuideline {
  id: string;
  brandSettingsId: string;
  status: BrandGuidelineStatus;
  contextDevMeta: unknown;
  lastGeneratedAt: string | null;
  lastGenerationError: string | null;
  sourcePdfFilename: string | null;
  sourcePdfUrl: string | null;
  sourcePdfPreview: string | null;
  sourcePdfUploadedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BrandGuidelineColor {
  id: string;
  guidelineId: string;
  role: BrandGuidelineColorRole;
  name: string | null;
  lightValue: string;
  darkValue: string | null;
  usage: string | null;
  sortOrder: number;
}

export interface BrandGuidelineFont {
  id: string;
  guidelineId: string;
  role: BrandGuidelineFontRole;
  family: string;
  weight: string | null;
  size: string | null;
  lineHeight: string | null;
  source: string | null;
  sortOrder: number;
}

export interface BrandGuidelineToken {
  id: string;
  guidelineId: string;
  type: BrandGuidelineTokenType;
  name: string;
  value: string;
  source: string | null;
  metadata: unknown;
  sortOrder: number;
}

export interface BrandGuidelineAsset {
  id: string;
  guidelineId: string;
  kind: BrandGuidelineAssetKind;
  url: string;
  storageKey: string | null;
  format: string | null;
  mimeType: string | null;
  width: number | null;
  height: number | null;
  aspectRatio: number | null;
  variant: BrandGuidelineAssetVariant;
  capturedAt: string | null;
  metadata: unknown;
  sortOrder: number;
}

export interface BrandGuidelineScreenshot {
  id: string;
  guidelineId: string;
  kind: BrandGuidelineScreenshotKind;
  url: string;
  storageKey: string | null;
  width: number;
  height: number;
  format: string;
  fullPage: boolean;
  capturedAt: string | null;
  metadata: unknown;
  sortOrder: number;
}

export interface BrandGuidelinesResponse {
  guideline: BrandGuideline | null;
  assets: BrandGuidelineAsset[];
  colors: BrandGuidelineColor[];
  fonts: BrandGuidelineFont[];
  screenshots: BrandGuidelineScreenshot[];
  tokens: BrandGuidelineToken[];
}
