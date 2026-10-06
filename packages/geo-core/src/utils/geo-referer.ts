export function sanitizeGeoReferer(value: string | undefined): string {
  if (!value) {
    return "";
  }
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return "";
    }
    return `${url.origin}${url.pathname}`;
  } catch {
    return "";
  }
}
