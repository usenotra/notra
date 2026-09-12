import type {
  ContextDevBrandLogo,
  ContextDevBrandSearchResult,
} from "@notra/ai/types/context-dev";

const RASTER_URL_REGEX = /\.(png|jpe?g|webp|avif|gif)(\?|$)/i;
const PROTOCOL_REGEX = /^https?:\/\//i;

export function pickCompanyLogoUrl(
  logos: ContextDevBrandLogo[] | undefined
): string | null {
  if (!logos?.length) {
    return null;
  }

  const rasterLogos = logos.filter(
    (logo) => logo.url && RASTER_URL_REGEX.test(logo.url)
  );
  const icons = rasterLogos.filter((logo) => logo.type === "icon");

  const preferred =
    icons.find((logo) => logo.mode === "has_opaque_background") ??
    icons.find((logo) => logo.mode === "light") ??
    icons[0] ??
    rasterLogos[0];

  return preferred?.url ?? null;
}

function brandSearchKey(value: string): string {
  return value.trim().toLowerCase();
}

/** Exact name or domain only — prefix/rank fallbacks misidentify brands. */
export function pickBrandSearchResult(
  results: readonly ContextDevBrandSearchResult[],
  query: string
): ContextDevBrandSearchResult | null {
  const key = brandSearchKey(query);
  if (key.length === 0) {
    return null;
  }

  const exactName = results.find(
    (result) => brandSearchKey(result.name) === key
  );
  if (exactName) {
    return exactName;
  }
  return (
    results.find((result) => brandSearchKey(result.domain) === key) ?? null
  );
}

export function extractDomain(input: string): string | null {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) {
    return null;
  }

  const host = trimmed
    .replace(PROTOCOL_REGEX, "")
    .split("/")[0]
    ?.split("?")[0]
    ?.split("@")
    .at(-1);

  if (!host || !host.includes(".") || host.endsWith(".")) {
    return null;
  }

  return host;
}
