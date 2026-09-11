import "server-only";
import type { SocialConnectPlatform } from "@notra/schemas/dashboard/social-accounts";
import PostForMe from "post-for-me";

const clients = new Map<string, PostForMe>();

const PROVIDER_PLATFORMS: Record<SocialConnectPlatform, string> = {
  twitter: "x",
  linkedin: "linkedin",
};

function getApiKey(platform: SocialConnectPlatform): string | undefined {
  const specificKey =
    platform === "twitter"
      ? process.env.POST_FOR_ME_API_KEY_TWITTER
      : process.env.POST_FOR_ME_API_KEY_LINKEDIN;
  return specificKey || process.env.POST_FOR_ME_API_KEY || undefined;
}

export function isSocialConnectConfigured(): boolean {
  return Boolean(getApiKey("twitter") || getApiKey("linkedin"));
}

export function getSocialConnectClient(
  platform: SocialConnectPlatform
): PostForMe {
  const apiKey = getApiKey(platform);
  if (!apiKey) {
    throw new Error("Social account linking is not configured");
  }
  const existing = clients.get(apiKey);
  if (existing) {
    return existing;
  }
  const created = new PostForMe({ apiKey });
  clients.set(apiKey, created);
  return created;
}

export function toProviderPlatform(platform: SocialConnectPlatform): string {
  return PROVIDER_PLATFORMS[platform];
}

export function fromProviderPlatform(
  providerPlatform: string
): SocialConnectPlatform | null {
  if (providerPlatform === "x" || providerPlatform === "twitter") {
    return "twitter";
  }
  if (providerPlatform === "linkedin") {
    return "linkedin";
  }
  return null;
}

export async function clearProviderAccountExternalId(
  platform: SocialConnectPlatform,
  accountId: string
): Promise<void> {
  const apiKey = getApiKey(platform);
  if (!apiKey) {
    throw new Error("Social account linking is not configured");
  }
  const response = await fetch(
    `https://api.postforme.dev/v1/social-accounts/${encodeURIComponent(accountId)}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ external_id: null }),
    }
  );
  if (!response.ok) {
    throw new Error("Failed to reset the connected account tag");
  }
}

export function getLinkedInConnectionType(
  metadata: unknown
): "personal" | "page" {
  if (
    typeof metadata === "object" &&
    metadata !== null &&
    "connection_type" in metadata &&
    metadata.connection_type === "page"
  ) {
    return "page";
  }
  return "personal";
}

export function getLinkedInProfileUrl(metadata: unknown): string | null {
  if (
    typeof metadata === "object" &&
    metadata !== null &&
    "profile_url" in metadata &&
    typeof metadata.profile_url === "string" &&
    metadata.profile_url
  ) {
    return metadata.profile_url;
  }
  return null;
}

export function hasProviderPremium(metadata: unknown): boolean {
  return (
    typeof metadata === "object" &&
    metadata !== null &&
    "has_platform_premium" in metadata &&
    metadata.has_platform_premium === true
  );
}
