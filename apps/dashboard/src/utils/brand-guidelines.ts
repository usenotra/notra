import type {
  ContextDevBrandRetrieveResponse,
  ContextDevScreenshotResponse,
  ContextDevStyleguideResponse,
} from "@notra/ai/types/context-dev";
import { BRAND_GUIDELINE_HEX_COLOR_REGEX } from "@notra/schemas/constants/dashboard/brand-guidelines";
import {
  styleguideColorSchema,
  styleguideFontSchema,
  styleguideRecordSchema,
  styleguideTokenValueSchema,
} from "@notra/schemas/dashboard/brand-guidelines";

import {
  BRAND_GUIDELINE_LEADING_WWW_REGEX,
  BRAND_GUIDELINE_TOKEN_GROUPS,
} from "@/constants/brand-guidelines";
import type {
  NormalizedAsset,
  NormalizedColor,
  NormalizedFont,
  NormalizedToken,
  StoredBrandGuideline,
} from "@/types/brand-guidelines";
import type {
  BrandGuidelinesResponse,
  BrandGuidelineTokenType,
} from "@/types/hooks/brand-guidelines";
import { selectPreferredBrandGuidelineAssets } from "@/utils/brand-guideline-assets";

export function normalizeBrandGuidelineSourceUrl(rawUrl: string) {
  return new URL(rawUrl).href;
}

export function getBrandGuidelineHostname(rawUrl: string) {
  return new URL(rawUrl).hostname.replace(
    BRAND_GUIDELINE_LEADING_WWW_REGEX,
    ""
  );
}

function normalizeColorRole(role: string) {
  const normalized = role.toLowerCase();
  if (normalized.includes("primary")) {
    return "primary";
  }
  if (normalized.includes("secondary")) {
    return "secondary";
  }
  if (normalized.includes("accent")) {
    return "accent";
  }
  if (normalized.includes("background")) {
    return "background";
  }
  if (normalized.includes("text") || normalized.includes("foreground")) {
    return "foreground";
  }
  if (normalized.includes("neutral") || normalized.includes("gray")) {
    return "neutral";
  }
  return "custom";
}

function normalizeFontRole(role: string) {
  const normalized = role.toLowerCase();
  if (normalized.includes("heading") || normalized.startsWith("h")) {
    return "heading";
  }
  if (normalized.includes("body") || normalized.includes("paragraph")) {
    return "body";
  }
  if (normalized.includes("button")) {
    return "button";
  }
  return "unknown";
}

function normalizeTokenType(type: string): BrandGuidelineTokenType {
  const normalized = type.toLowerCase();
  if (normalized.includes("spacing")) {
    return "spacing";
  }
  if (normalized.includes("radius") || normalized.includes("radii")) {
    return "radius";
  }
  if (normalized.includes("shadow")) {
    return "shadow";
  }
  if (normalized.includes("component")) {
    return "component";
  }
  return "unknown";
}

export function extractStyleguideColors(
  styleguide: ContextDevStyleguideResponse
): NormalizedColor[] {
  const colors = styleguideRecordSchema.safeParse(styleguide.styleguide.colors);

  if (!colors.success) {
    return [];
  }

  return Object.entries(colors.data).flatMap(([key, value], index) => {
    const color = styleguideColorSchema.safeParse(value);

    if (!color.success) {
      return [];
    }

    return [
      {
        role: normalizeColorRole(key),
        name: color.data.name ?? key,
        lightValue: color.data.hex,
        darkValue: color.data.darkValue,
        usage: color.data.usage,
        sortOrder: index,
      },
    ];
  });
}

export function extractLogoColors(
  brand: ContextDevBrandRetrieveResponse,
  startSortOrder: number
): NormalizedColor[] {
  return (brand.brand.logos ?? []).flatMap((logo, logoIndex) =>
    (logo.colors ?? []).flatMap((color, colorIndex) => {
      if (!color.hex || !BRAND_GUIDELINE_HEX_COLOR_REGEX.test(color.hex)) {
        return [];
      }

      return [
        {
          role: "custom",
          name: color.name ?? null,
          lightValue: color.hex,
          darkValue: null,
          usage: logo.type ? `${logo.type} logo` : "logo",
          sortOrder: startSortOrder + logoIndex * 10 + colorIndex,
        },
      ];
    })
  );
}

export function getColorDedupeKey(color: {
  role: string;
  lightValue: string;
  darkValue: string | null;
}) {
  return `${color.role}:${color.lightValue.toLowerCase()}:${color.darkValue?.toLowerCase() ?? ""}`;
}

export function dedupeColors(colors: NormalizedColor[]) {
  const seen = new Set<string>();

  return colors.filter((color) => {
    const key = getColorDedupeKey(color);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export function extractFonts(
  styleguide: ContextDevStyleguideResponse
): NormalizedFont[] {
  const typography = styleguideRecordSchema.safeParse(
    styleguide.styleguide.typography
  );

  if (!typography.success) {
    return [];
  }

  const entries = Object.entries(typography.data).flatMap(([key, value]) => {
    if (key === "headings") {
      const headings = styleguideRecordSchema.safeParse(value);
      return headings.success ? Object.entries(headings.data) : [];
    }

    return [[key, value] as const];
  });

  return entries.flatMap(([key, value], index) => {
    const font = styleguideFontSchema.safeParse(value);

    if (!font.success) {
      return [];
    }

    return [
      {
        role: normalizeFontRole(key),
        family: font.data.family,
        weight: font.data.weight,
        size: font.data.size,
        lineHeight: font.data.lineHeight,
        source: "styleguide",
        sortOrder: index,
      },
    ];
  });
}

function extractTokenGroup(
  styleguide: ContextDevStyleguideResponse,
  groupName: string,
  startSortOrder: number
): NormalizedToken[] {
  const group = styleguideRecordSchema.safeParse(
    styleguide.styleguide[groupName]
  );

  if (!group.success) {
    return [];
  }

  return Object.entries(group.data).flatMap(([key, value], index) => {
    const token = styleguideTokenValueSchema.safeParse(value);

    if (!token.success) {
      return [];
    }

    return [
      {
        type: normalizeTokenType(groupName),
        name: key,
        value: token.data.value,
        source: "styleguide",
        metadata: token.data.metadata,
        sortOrder: startSortOrder + index,
      },
    ];
  });
}

export function extractTokens(styleguide: ContextDevStyleguideResponse) {
  return BRAND_GUIDELINE_TOKEN_GROUPS.flatMap((groupName, groupIndex) =>
    extractTokenGroup(styleguide, groupName, groupIndex * 100)
  );
}

export function extractAssets(brand: ContextDevBrandRetrieveResponse) {
  const now = new Date();

  return selectPreferredBrandGuidelineAssets(brand.brand.logos ?? []).map(
    (asset): NormalizedAsset => ({
      aspectRatio: asset.aspectRatio,
      capturedAt: now,
      format: asset.format,
      height: asset.height,
      kind: asset.kind,
      metadata: asset.logo,
      mimeType: asset.mimeType,
      sortOrder: asset.sortOrder,
      storageKey: null,
      url: asset.url,
      variant: asset.variant,
      width: asset.width,
    })
  );
}

export function getScreenshotUrl(response: ContextDevScreenshotResponse) {
  if (typeof response.screenshot === "string") {
    return response.screenshot;
  }

  return (
    response.url ??
    response.screenshotUrl ??
    response.imageUrl ??
    response.screenshot?.url ??
    null
  );
}

function serializeGuidelineDate(value: Date | null) {
  return value?.toISOString() ?? null;
}

export function serializeGuidelinesResponse(
  guideline: StoredBrandGuideline | null | undefined
): BrandGuidelinesResponse {
  if (!guideline) {
    return {
      guideline: null,
      assets: [],
      colors: [],
      fonts: [],
      screenshots: [],
      tokens: [],
    };
  }

  return {
    guideline: {
      id: guideline.id,
      brandSettingsId: guideline.brandSettingsId,
      status: guideline.status,
      contextDevMeta: guideline.contextDevMeta,
      lastGeneratedAt: serializeGuidelineDate(guideline.lastGeneratedAt),
      lastGenerationError: guideline.lastGenerationError,
      createdAt: guideline.createdAt.toISOString(),
      updatedAt: guideline.updatedAt.toISOString(),
    },
    assets: guideline.assets.map((asset) => ({
      id: asset.id,
      guidelineId: asset.guidelineId,
      kind: asset.kind,
      url: asset.url,
      storageKey: asset.storageKey,
      format: asset.format,
      mimeType: asset.mimeType,
      width: asset.width,
      height: asset.height,
      aspectRatio: asset.aspectRatio,
      variant: asset.variant,
      capturedAt: serializeGuidelineDate(asset.capturedAt),
      metadata: asset.metadata,
      sortOrder: asset.sortOrder,
    })),
    colors: guideline.colors.map((color) => ({
      id: color.id,
      guidelineId: color.guidelineId,
      role: color.role,
      name: color.name,
      lightValue: color.lightValue,
      darkValue: color.darkValue,
      usage: color.usage,
      sortOrder: color.sortOrder,
    })),
    fonts: guideline.fonts.map((font) => ({
      id: font.id,
      guidelineId: font.guidelineId,
      role: font.role,
      family: font.family,
      weight: font.weight,
      size: font.size,
      lineHeight: font.lineHeight,
      source: font.source,
      sortOrder: font.sortOrder,
    })),
    screenshots: guideline.screenshots.map((screenshot) => ({
      id: screenshot.id,
      guidelineId: screenshot.guidelineId,
      kind: screenshot.kind,
      url: screenshot.url,
      storageKey: screenshot.storageKey,
      width: screenshot.width,
      height: screenshot.height,
      format: screenshot.format,
      fullPage: screenshot.fullPage,
      capturedAt: serializeGuidelineDate(screenshot.capturedAt),
      metadata: screenshot.metadata,
      sortOrder: screenshot.sortOrder,
    })),
    tokens: guideline.tokens.map((token) => ({
      id: token.id,
      guidelineId: token.guidelineId,
      type: token.type,
      name: token.name,
      value: token.value,
      source: token.source,
      metadata: token.metadata,
      sortOrder: token.sortOrder,
    })),
  };
}
