const GOOGLE_FAVICON_SIZE = 128;

export function googleFaviconUrl(domain: string | null): string | null {
  if (!domain) {
    return null;
  }

  const url = new URL("https://www.google.com/s2/favicons");
  url.searchParams.set("domain", domain);
  url.searchParams.set("sz", String(GOOGLE_FAVICON_SIZE));
  return url.toString();
}
