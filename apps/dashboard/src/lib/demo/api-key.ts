import { API_KEY_PERMISSIONS } from "@/constants/api-keys";
import { DEMO_API_KEY_PREFIX, DEMO_API_KEY_RATE_LIMIT } from "@/constants/demo";
import { unkey } from "@/lib/api-keys/unkey";

/**
 * Every sandbox gets one full-access key for demo-api so visitors can try the
 * API, CLI and MCP without creating anything. The demo deployment points
 * UNKEY_ROOT_KEY / UNKEY_API_ID at its own Unkey workspace, so these keys can
 * never authenticate against production.
 */
export async function createDemoApiKey(input: {
  organizationId: string;
  anonymousId: string;
  expiresAt: Date;
}): Promise<{ key: string; keyId: string } | null> {
  const apiId = process.env.UNKEY_API_ID;
  if (!(unkey && apiId)) {
    return null;
  }

  const created = await unkey.keys.createKey({
    apiId,
    externalId: input.organizationId,
    expires: input.expiresAt.getTime(),
    meta: { anonymousId: input.anonymousId, demo: true },
    name: "Demo key",
    permissions: [...API_KEY_PERMISSIONS],
    prefix: DEMO_API_KEY_PREFIX,
    ratelimits: [
      {
        name: "requests",
        limit: DEMO_API_KEY_RATE_LIMIT.limit,
        duration: DEMO_API_KEY_RATE_LIMIT.durationMs,
        autoApply: true,
      },
    ],
  });

  const key = created.data?.key;
  const keyId = created.data?.keyId;
  return key && keyId ? { key, keyId } : null;
}

export async function updateDemoApiKey(input: {
  keyId: string;
  organizationId?: string;
  expiresAt?: Date;
}): Promise<void> {
  if (!unkey) {
    return;
  }
  await unkey.keys.updateKey({
    keyId: input.keyId,
    ...(input.organizationId ? { externalId: input.organizationId } : {}),
    ...(input.expiresAt ? { expires: input.expiresAt.getTime() } : {}),
  });
}

export async function deleteDemoApiKey(keyId: string): Promise<void> {
  if (!unkey) {
    return;
  }
  await unkey.keys.deleteKey({ keyId, permanent: true });
}
