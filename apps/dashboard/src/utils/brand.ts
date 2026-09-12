import { brandIdentityToolOutputSchema } from "@notra/schemas/dashboard/brand";
import { logoLinkUrl } from "@notra/utils/logo-link";

export function getWebsiteDomain(websiteUrl: string | null): string | null {
  if (!websiteUrl) {
    return null;
  }
  const normalizedUrl = websiteUrl.startsWith("http")
    ? websiteUrl
    : `https://${websiteUrl}`;
  try {
    return new URL(normalizedUrl).hostname;
  } catch {
    return null;
  }
}

export function getBrandFaviconUrl(websiteUrl: string | null) {
  return logoLinkUrl(getWebsiteDomain(websiteUrl)) ?? undefined;
}

export function getBrandFaviconFromToolOutput(
  toolName: string,
  output: unknown
) {
  const parsed = brandIdentityToolOutputSchema.safeParse(output);
  if (!parsed.success) {
    return undefined;
  }

  if (toolName === "getBrandIdentity") {
    return getBrandFaviconUrl(parsed.data.brandIdentity?.websiteUrl ?? null);
  }

  if (toolName === "listBrandIdentities") {
    const identities = parsed.data.brandIdentities;
    if (identities?.length === 1) {
      return getBrandFaviconUrl(identities[0]?.websiteUrl ?? null);
    }
  }

  return undefined;
}
