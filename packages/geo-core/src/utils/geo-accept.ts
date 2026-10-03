import { GEO_MARKDOWN_ACCEPT_MATCHERS } from "@notra/geo-core/constants/geo-accept";

const HTML_TYPES = new Set(["text/html", "application/xhtml+xml"]);
const DEFAULT_QUALITY = 1;

function parseQuality(parameters: string[]): number {
  for (const parameter of parameters) {
    const [key, value] = parameter.split("=");
    if (key?.trim().toLowerCase() === "q" && value !== undefined) {
      const parsed = Number.parseFloat(value);
      return Number.isNaN(parsed) ? DEFAULT_QUALITY : parsed;
    }
  }
  return DEFAULT_QUALITY;
}

export function prefersMarkdown(accept: string | undefined): boolean {
  if (!accept) {
    return false;
  }
  let markdownQuality = -1;
  let htmlQuality = -1;
  for (const range of accept.split(",")) {
    const [rawType, ...parameters] = range.split(";");
    const type = rawType?.trim().toLowerCase() ?? "";
    const quality = parseQuality(parameters);
    if (GEO_MARKDOWN_ACCEPT_MATCHERS.includes(type)) {
      markdownQuality = Math.max(markdownQuality, quality);
    } else if (HTML_TYPES.has(type)) {
      htmlQuality = Math.max(htmlQuality, quality);
    }
  }
  return markdownQuality > 0 && markdownQuality > htmlQuality;
}

export function normalizeAccept(accept: string | undefined): string {
  return (accept ?? "").replaceAll(/\s+/g, "").toLowerCase();
}
