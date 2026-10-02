import type { ContextDevBrandLogo } from "@notra/ai/types/context-dev";

import type {
  BrandGuidelineAssetKind,
  BrandGuidelineAssetVariant,
  BrandGuidelineColorRole,
  BrandGuidelineFontRole,
  BrandGuidelineScreenshotKind,
  BrandGuidelineStatus,
  BrandGuidelineToken,
  BrandGuidelineTokenType,
} from "@/types/hooks/brand-guidelines";

export interface BrandGuidelineScreenshotConfig {
  kind: BrandGuidelineScreenshotKind;
  width: number;
  height: number;
  fullPage: boolean;
  sortOrder: number;
}

export interface NormalizedColor {
  role: BrandGuidelineColorRole;
  name: string | null;
  lightValue: string;
  darkValue: string | null;
  usage: string | null;
  sortOrder: number;
}

export interface NormalizedFont {
  role: BrandGuidelineFontRole;
  family: string;
  weight: string | null;
  size: string | null;
  lineHeight: string | null;
  source: string | null;
  sortOrder: number;
}

export interface NormalizedToken {
  type: BrandGuidelineTokenType;
  name: string;
  value: string;
  source: string | null;
  metadata: unknown;
  sortOrder: number;
}

export interface BrandGuidelineTokenGroup {
  type: BrandGuidelineTokenType;
  tokens: BrandGuidelineToken[];
}

export interface NormalizedAsset {
  kind: BrandGuidelineAssetKind;
  url: string;
  storageKey: string | null;
  format: string | null;
  mimeType: string | null;
  width: number | null;
  height: number | null;
  aspectRatio: number | null;
  variant: BrandGuidelineAssetVariant;
  capturedAt: Date;
  metadata: ContextDevBrandLogo;
  sortOrder: number;
}

export interface PreferredBrandGuidelineAsset {
  format: string | null;
  height: number | null;
  kind: BrandGuidelineAssetKind;
  logo: ContextDevBrandLogo;
  mimeType: string | null;
  sortOrder: number;
  variant: BrandGuidelineAssetVariant;
  width: number | null;
  aspectRatio: number | null;
  url: string;
}

export interface NormalizedScreenshot {
  kind: BrandGuidelineScreenshotKind;
  url: string;
  storageKey: string | null;
  width: number;
  height: number;
  format: string;
  fullPage: boolean;
  capturedAt: Date;
  metadata: unknown;
  sortOrder: number;
}

export interface StoredBrandGuidelineAsset {
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
  capturedAt: Date | null;
  metadata: unknown;
  sortOrder: number;
}

export interface StoredBrandGuidelineColor {
  id: string;
  guidelineId: string;
  role: BrandGuidelineColorRole;
  name: string | null;
  lightValue: string;
  darkValue: string | null;
  usage: string | null;
  sortOrder: number;
}

export interface StoredBrandGuidelineFont {
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

export interface StoredBrandGuidelineScreenshot {
  id: string;
  guidelineId: string;
  kind: BrandGuidelineScreenshotKind;
  url: string;
  storageKey: string | null;
  width: number;
  height: number;
  format: string;
  fullPage: boolean;
  capturedAt: Date | null;
  metadata: unknown;
  sortOrder: number;
}

export interface StoredBrandGuidelineToken {
  id: string;
  guidelineId: string;
  type: BrandGuidelineTokenType;
  name: string;
  value: string;
  source: string | null;
  metadata: unknown;
  sortOrder: number;
}

export interface StoredBrandGuideline {
  id: string;
  brandSettingsId: string;
  status: BrandGuidelineStatus;
  contextDevMeta: unknown;
  lastGeneratedAt: Date | null;
  lastGenerationError: string | null;
  sourcePdfFilename: string | null;
  sourcePdfUrl: string | null;
  sourcePdfText: string | null;
  sourcePdfUploadedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  assets: StoredBrandGuidelineAsset[];
  colors: StoredBrandGuidelineColor[];
  fonts: StoredBrandGuidelineFont[];
  screenshots: StoredBrandGuidelineScreenshot[];
  tokens: StoredBrandGuidelineToken[];
}

export interface BrandGuidelineGenerationStepInput {
  brandSettingsId: string;
  sourceUrl: string;
}

export type BrandGuidelineWorkflowStepResult =
  | { success: true }
  | { success: false; error: string };
