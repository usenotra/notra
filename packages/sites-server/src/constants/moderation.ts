import reservedBrandSlugs from "./reserved-brand-slugs.json";

export const SITE_PROTECTED_SLUG_WORDS: ReadonlySet<string> = new Set([
  "notra",
  "usenotra",
]);

export const SITE_RESERVED_BRAND_SLUGS: Readonly<Record<string, string>> =
  reservedBrandSlugs;

export function reservedSlugMessage(slug: string, domain: string): string {
  return `${slug} is reserved for ${domain}. Sign in with an @${domain} email address to use it, contact support, or pick another address.`;
}

export const SITE_NAME_REJECTION_MESSAGES = {
  granted:
    "This address is reserved for another organization. Pick a different one.",
  offensive: "This name isn't allowed on Notra Sites. Pick a different one.",
  impersonation:
    "This name looks like another organization or a login page. Use your own organization's name.",
} as const;
