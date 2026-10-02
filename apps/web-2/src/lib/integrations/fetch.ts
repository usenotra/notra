import { FALLBACK_INTEGRATIONS } from "@/constants/integrations";
import {
  integrationDetailResponseSchema,
  integrationListResponseSchema,
} from "@/schemas/integrations";
import type { Integration } from "@/types/integrations";

const CONSOLE_URL =
  process.env.NOTRA_CONSOLE_URL ?? "https://console.usenotra.com";

const FETCH_TIMEOUT_MS = 15_000;

export async function fetchIntegrations(): Promise<Integration[]> {
  try {
    const response = await fetch(`${CONSOLE_URL}/api/store/integrations`, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!response.ok) {
      return FALLBACK_INTEGRATIONS;
    }
    const parsed = integrationListResponseSchema.safeParse(
      await response.json()
    );
    if (!parsed.success || parsed.data.integrations.length === 0) {
      return FALLBACK_INTEGRATIONS;
    }
    return parsed.data.integrations;
  } catch {
    return FALLBACK_INTEGRATIONS;
  }
}

function findFallbackIntegration(slugOrId: string): Integration | null {
  const normalized = slugOrId.toLowerCase();
  return (
    FALLBACK_INTEGRATIONS.find(
      (integration) =>
        integration.id === slugOrId ||
        integration.slug === normalized ||
        integration.name.toLowerCase() === normalized
    ) ?? null
  );
}

export async function fetchIntegration(
  integrationId: string
): Promise<Integration | null> {
  try {
    const response = await fetch(
      `${CONSOLE_URL}/api/store/integrations/${encodeURIComponent(integrationId)}`,
      {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      }
    );
    if (!response.ok) {
      return findFallbackIntegration(integrationId);
    }
    const parsed = integrationDetailResponseSchema.safeParse(
      await response.json()
    );
    if (!parsed.success) {
      return findFallbackIntegration(integrationId);
    }
    return parsed.data.integration;
  } catch {
    return findFallbackIntegration(integrationId);
  }
}
