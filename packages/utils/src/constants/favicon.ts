/**
 * Domains whose Google favicon is a black glyph on transparent, invisible on
 * dark surfaces, mapped to a host that serves the colored brand mark.
 */
export const FAVICON_DOMAIN_OVERRIDES: Readonly<Record<string, string>> = {
  "digitalocean.com": "cloud.digitalocean.com",
};
