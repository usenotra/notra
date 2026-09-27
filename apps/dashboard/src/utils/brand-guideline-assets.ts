import type { ContextDevBrandLogo } from "@notra/ai/types/context-dev";

import type { PreferredBrandGuidelineAsset } from "@/types/brand-guidelines";
import type {
  BrandGuidelineAssetKind,
  BrandGuidelineAssetVariant,
} from "@/types/hooks/brand-guidelines";

function getFormatFromUrl(url: string) {
  const cleanUrl = url.split("?")[0] ?? url;
  const extension = cleanUrl.split(".").pop()?.toLowerCase();

  return extension && extension.length <= 5 ? extension : null;
}

function getMimeType(format: string | null) {
  if (format === "svg") {
    return "image/svg+xml";
  }
  if (format === "png") {
    return "image/png";
  }
  if (format === "jpg" || format === "jpeg") {
    return "image/jpeg";
  }
  if (format === "webp") {
    return "image/webp";
  }
  return null;
}

export function getBrandGuidelineAssetFormat(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension && extension.length <= 5) {
    return extension;
  }
  if (file.type === "image/svg+xml") {
    return "svg";
  }
  return null;
}

export function getBrandGuidelineAssetTypeLabel(file: File) {
  const format = getBrandGuidelineAssetFormat(file);

  if (format === "svg") {
    return "SVG";
  }

  if (format) {
    return format.toUpperCase();
  }

  return null;
}

export function getBrandGuidelineImageDimensions(file: File) {
  if (file.type === "image/svg+xml") {
    return Promise.resolve({
      aspectRatio: null,
      height: null,
      width: null,
    });
  }

  return new Promise<{
    aspectRatio: number | null;
    height: number | null;
    width: number | null;
  }>((resolve) => {
    const image = new Image();
    const url = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({
        aspectRatio:
          image.naturalWidth && image.naturalHeight
            ? image.naturalWidth / image.naturalHeight
            : null,
        height: image.naturalHeight || null,
        width: image.naturalWidth || null,
      });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ aspectRatio: null, height: null, width: null });
    };
    image.src = url;
  });
}

function normalizeAssetKind(
  logo: ContextDevBrandLogo
): BrandGuidelineAssetKind {
  const type = logo.type?.toLowerCase() ?? "";
  const aspectRatio = logo.resolution?.aspect_ratio;

  if (type.includes("wordmark")) {
    return "wordmark";
  }
  if (typeof aspectRatio === "number" && aspectRatio > 1.8) {
    return "wordmark";
  }
  return "logo";
}

function normalizeAssetVariant(
  mode: string | undefined
): BrandGuidelineAssetVariant {
  return mode === "dark" ? "dark" : "light";
}

export function getBrandGuidelineAssetName(input: {
  format: string | null;
  kind: BrandGuidelineAssetKind;
  variant: BrandGuidelineAssetVariant;
}) {
  const extension = input.format ?? "asset";
  if (input.variant === "light") {
    return `${input.kind}.${extension}`;
  }
  return `${input.kind}-${input.variant}.${extension}`;
}

function getAssetScore(input: {
  format: string | null;
  kind: BrandGuidelineAssetKind;
  logo: ContextDevBrandLogo;
  sortOrder: number;
}) {
  const type = input.logo.type?.toLowerCase() ?? "";
  const width = input.logo.resolution?.width ?? 0;
  const height = input.logo.resolution?.height ?? 0;
  const area = width * height;
  let explicitKindScore = 0;

  if (input.kind === "wordmark" && type.includes("wordmark")) {
    explicitKindScore = 500;
  }
  if (
    input.kind === "logo" &&
    (type.includes("logo") || type.includes("icon") || type.includes("mark"))
  ) {
    explicitKindScore = 500;
  }

  return (
    (input.format === "svg" ? 10_000 : 0) +
    explicitKindScore +
    Math.min(area / 1000, 1000) -
    input.sortOrder / 100
  );
}

function toPreferredAsset(
  logo: ContextDevBrandLogo,
  sortOrder: number
): PreferredBrandGuidelineAsset | null {
  if (!logo.url) {
    return null;
  }

  const kind = normalizeAssetKind(logo);
  const variant = normalizeAssetVariant(logo.mode);
  const format = getFormatFromUrl(logo.url);

  return {
    aspectRatio: logo.resolution?.aspect_ratio ?? null,
    format,
    height: logo.resolution?.height ?? null,
    kind,
    logo,
    mimeType: getMimeType(format),
    sortOrder,
    url: logo.url,
    variant,
    width: logo.resolution?.width ?? null,
  };
}

export function selectPreferredBrandGuidelineAssets(
  logos: ContextDevBrandLogo[]
) {
  const selected = new Map<
    string,
    { asset: PreferredBrandGuidelineAsset; score: number }
  >();

  for (const [index, logo] of logos.entries()) {
    const asset = toPreferredAsset(logo, index);
    if (!asset) {
      continue;
    }

    const key = `${asset.kind}:${asset.variant}`;
    const score = getAssetScore({
      format: asset.format,
      kind: asset.kind,
      logo,
      sortOrder: index,
    });
    const existing = selected.get(key);

    if (!existing || score > existing.score) {
      selected.set(key, { asset, score });
    }
  }

  return [...selected.values()]
    .map(({ asset }) => asset)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}
