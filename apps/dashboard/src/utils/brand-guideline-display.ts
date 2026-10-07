import { TOKEN_TYPE_ORDER } from "@/constants/brand-guideline-ui";
import type { BrandGuidelineTokenGroup } from "@/types/brand-guidelines";
import type {
  BrandGuidelineToken,
  BrandGuidelineTokenType,
} from "@/types/hooks/brand-guidelines";

const HTTP_URL_REGEX = /^https?:\/\//i;
const HEX6_REGEX = /^#[0-9a-f]{6}$/i;
const HEX3_REGEX = /^#[0-9a-f]{3}$/i;

export function toColorInputValue(value: string): string {
  if (HEX6_REGEX.test(value)) {
    return value.toLowerCase();
  }
  if (HEX3_REGEX.test(value)) {
    const r = value[1];
    const g = value[2];
    const b = value[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return "#000000";
}

export function formatDimensions(
  width: number | null,
  height: number | null
): string | null {
  if (width && height) {
    return `${width}×${height}`;
  }
  return null;
}

export function isSvgAsset(asset: {
  format: string | null;
  mimeType: string | null;
}): boolean {
  return asset.format === "svg" || asset.mimeType === "image/svg+xml";
}

export function isSafeHttpUrl(url: string): boolean {
  return HTTP_URL_REGEX.test(url);
}

export function joinMeta(
  parts: Array<string | null | undefined | false>
): string {
  return parts.filter(Boolean).join(" · ");
}

export function cssFontFamily(family: string): string {
  return `"${family}", system-ui, sans-serif`;
}

export function googleFontHref(family: string): string {
  return `/api/brand-font/css?family=${encodeURIComponent(family)}`;
}

export function groupTokensByType(
  tokens: BrandGuidelineToken[]
): BrandGuidelineTokenGroup[] {
  const groups = new Map<BrandGuidelineTokenType, BrandGuidelineToken[]>();

  for (const token of tokens) {
    const existing = groups.get(token.type) ?? [];
    existing.push(token);
    groups.set(token.type, existing);
  }

  return TOKEN_TYPE_ORDER.filter((type) => groups.has(type)).map((type) => ({
    type,
    tokens: groups.get(type) ?? [],
  }));
}
