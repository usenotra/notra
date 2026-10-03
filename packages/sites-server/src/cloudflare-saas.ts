const API = "https://api.cloudflare.com/client/v4/zones";

export interface CloudflareSaasConfig {
  zoneId: string;
  apiToken: string;
}

export interface CloudflareCustomHostname {
  id: string;
  hostname: string;
  status: string;
  verification_errors?: string[];
  ownership_verification?: { type: string; name: string; value: string };
  ssl?: {
    status?: string;
    validation_errors?: Array<{ message: string }>;
    validation_records?: Array<{
      txt_name?: string;
      txt_value?: string;
      http_url?: string;
      http_body?: string;
    }>;
  };
}

export function cloudflareSaasConfig(): CloudflareSaasConfig | null {
  const zoneId = process.env.CLOUDFLARE_SAAS_ZONE_ID?.trim();
  const apiToken = process.env.CLOUDFLARE_SAAS_API_TOKEN?.trim();
  return zoneId && apiToken ? { zoneId, apiToken } : null;
}

export class CloudflareApiError extends Error {
  readonly name = "CloudflareApiError";
  readonly codes: number[];
  constructor(message: string, codes: number[]) {
    super(message);
    this.codes = codes;
  }
}

async function request<T>(
  config: CloudflareSaasConfig,
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API}/${config.zoneId}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${config.apiToken}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  const body = (await response.json()) as {
    success: boolean;
    result: T;
    errors?: Array<{ code: number; message: string }>;
  };
  if (!body.success) {
    throw new CloudflareApiError(
      `Cloudflare: ${body.errors?.map((error) => error.message).join("; ") ?? response.status}`,
      body.errors?.map((error) => error.code) ?? []
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

/** Best effort: used on cleanup paths where a missing hostname is fine. */
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
      error: error instanceof Error ? error.message : error,
    });
  });
}
