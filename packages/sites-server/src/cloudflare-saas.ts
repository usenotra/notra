import { CLOUDFLARE_ZONES_API } from "./constants/domains";
import type {
  CloudflareApiResponse,
  CloudflareCustomHostname,
  CloudflareSaasConfig,
} from "./types/cloudflare-saas";
import { errorMessage } from "./utils/errors";

export function cloudflareSaasConfig(): CloudflareSaasConfig | null {
  const zoneId = process.env.CLOUDFLARE_SAAS_ZONE_ID?.trim();
  const apiToken = process.env.CLOUDFLARE_SAAS_API_TOKEN?.trim();
  return zoneId && apiToken ? { zoneId, apiToken } : null;
}

async function request<T>(
  config: CloudflareSaasConfig,
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const response = await fetch(
    `${CLOUDFLARE_ZONES_API}/${config.zoneId}${path}`,
    {
      ...init,
      headers: {
        Authorization: `Bearer ${config.apiToken}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
    }
  );
  const body = (await response.json()) as CloudflareApiResponse<T>;
  if (!body.success) {
    throw new Error(
      `Cloudflare: ${body.errors?.map((error) => error.message).join("; ") ?? response.status}`
    );
  }
  return body.result;
}

export async function createCustomHostname(
  config: CloudflareSaasConfig,
  hostname: string
) {
  return await request<CloudflareCustomHostname>(config, "/custom_hostnames", {
    method: "POST",
    body: JSON.stringify({
      hostname,
      ssl: { method: "http", type: "dv", settings: { min_tls_version: "1.2" } },
    }),
  });
}

export async function getCustomHostname(
  config: CloudflareSaasConfig,
  id: string
) {
  return await request<CloudflareCustomHostname>(
    config,
    `/custom_hostnames/${id}`
  );
}

export async function findCustomHostname(
  config: CloudflareSaasConfig,
  hostname: string
) {
  const results = await request<CloudflareCustomHostname[]>(
    config,
    `/custom_hostnames?hostname=${encodeURIComponent(hostname)}`
  );
  return results.find((entry) => entry.hostname === hostname) ?? null;
}

export async function deleteCustomHostname(
  config: CloudflareSaasConfig,
  id: string
): Promise<void> {
  await request(config, `/custom_hostnames/${id}`, { method: "DELETE" });
}

export async function deleteCustomHostnameQuietly(
  id: string | null
): Promise<void> {
  const config = cloudflareSaasConfig();
  if (!(config && id)) {
    return;
  }
  await deleteCustomHostname(config, id).catch((error: unknown) => {
    console.warn("sites.custom_hostname_delete_failed", {
      id,
      error: errorMessage(error),
    });
  });
}
