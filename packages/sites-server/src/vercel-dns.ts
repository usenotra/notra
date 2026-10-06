import {
  VERCEL_API_URL,
  VERCEL_DNS_CALLBACK_PATH,
  VERCEL_DNS_HTTP_TIMEOUT_MS,
  VERCEL_DNS_RECORD_COMMENT,
  VERCEL_DNS_RECORD_TTL_SECONDS,
  VERCEL_DNS_STATE_LABEL,
  VERCEL_NAMESERVER_SUFFIX,
} from "./constants/vercel-dns";
import {
  signDomainConnectCallback,
  verifyDomainConnectCallback,
} from "./domain-connect";
import { getDashboardUrl } from "./env";
import type { DomainConnectCallbackClaims } from "./types/domain-connect";
import type {
  ApplyVercelDnsRecordsParams,
  VercelDnsConfig,
  VercelDnsDeps,
  VercelDnsGrant,
  VercelTokenResponse,
} from "./types/vercel-dns";
import {
  createDnsResolver,
  normalizeDnsName,
  relativeDnsName,
  zoneCandidates,
} from "./utils/dns";
import { errorMessage } from "./utils/errors";

function defaultDeps(): VercelDnsDeps {
  const resolver = createDnsResolver();
  return {
    resolveNs: (name) => resolver.resolveNs(name),
    fetch: globalThis.fetch,
  };
}

export function getVercelDnsConfig(): VercelDnsConfig | null {
  const slug = process.env.SITES_VERCEL_INTEGRATION_SLUG?.trim();
  const clientId = process.env.SITES_VERCEL_CLIENT_ID?.trim();
  const clientSecret = process.env.SITES_VERCEL_CLIENT_SECRET?.trim();
  if (!(slug && clientId && clientSecret)) {
    return null;
  }
  return { slug, clientId, clientSecret };
}

function vercelDnsRedirectUri(): string {
  return `${getDashboardUrl()}${VERCEL_DNS_CALLBACK_PATH}`;
}

export async function findVercelZone(
  hostname: string,
  deps: Pick<VercelDnsDeps, "resolveNs"> = defaultDeps()
): Promise<string | null> {
  for (const zone of zoneCandidates(hostname)) {
    let nameservers: string[];
    try {
      nameservers = await deps.resolveNs(zone);
    } catch {
      continue;
    }
    if (nameservers.length === 0) {
      continue;
    }
    return nameservers.some((ns) =>
      normalizeDnsName(ns).endsWith(VERCEL_NAMESERVER_SUFFIX)
    )
      ? zone
      : null;
  }
  return null;
}

export function vercelInstallUrl(
  config: VercelDnsConfig,
  claims: Omit<DomainConnectCallbackClaims, "exp">
): string {
  const state = signDomainConnectCallback(
    claims,
    undefined,
    VERCEL_DNS_STATE_LABEL
  );
  return `https://vercel.com/integrations/${encodeURIComponent(config.slug)}/new?state=${encodeURIComponent(state)}`;
}

export function verifyVercelDnsState(
  state: string
): DomainConnectCallbackClaims | null {
  return verifyDomainConnectCallback(state, undefined, VERCEL_DNS_STATE_LABEL);
}

function withTeam(path: string, teamId: string | null): string {
  return teamId
    ? `${VERCEL_API_URL}${path}?teamId=${encodeURIComponent(teamId)}`
    : `${VERCEL_API_URL}${path}`;
}

export async function exchangeVercelCode(
  config: VercelDnsConfig,
  code: string,
  deps: Pick<VercelDnsDeps, "fetch"> = defaultDeps()
): Promise<VercelDnsGrant> {
  const response = await deps.fetch(`${VERCEL_API_URL}/v2/oauth/access_token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: vercelDnsRedirectUri(),
    }),
    signal: AbortSignal.timeout(VERCEL_DNS_HTTP_TIMEOUT_MS),
  });
  const body = (await response
    .json()
    .catch(() => null)) as VercelTokenResponse | null;
  if (!(response.ok && body?.access_token && body.installation_id)) {
    throw new Error(`Vercel token exchange failed (${response.status})`);
  }
  return {
    accessToken: body.access_token,
    teamId: body.team_id ?? null,
    configurationId: body.installation_id,
  };
}

export async function applyVercelDnsRecords({
  grant,
  zone,
  records,
  deps = defaultDeps(),
}: ApplyVercelDnsRecordsParams): Promise<void> {
  for (const record of records) {
    const response = await deps.fetch(
      withTeam(`/v2/domains/${encodeURIComponent(zone)}/records`, grant.teamId),
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${grant.accessToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name: relativeDnsName(record.name, zone),
          type: record.type,
          value: record.value,
          ttl: VERCEL_DNS_RECORD_TTL_SECONDS,
          comment: VERCEL_DNS_RECORD_COMMENT,
        }),
        signal: AbortSignal.timeout(VERCEL_DNS_HTTP_TIMEOUT_MS),
      }
    );
    await response.body?.cancel();
    if (!response.ok && response.status !== 409) {
      throw new Error(
        `Vercel rejected the ${record.type} record for ${record.name} (${response.status})`
      );
    }
  }
}

export async function removeVercelInstallation(
  grant: VercelDnsGrant,
  deps: Pick<VercelDnsDeps, "fetch"> = defaultDeps()
): Promise<void> {
  try {
    const response = await deps.fetch(
      withTeam(
        `/v1/integrations/configuration/${encodeURIComponent(grant.configurationId)}`,
        grant.teamId
      ),
      {
        method: "DELETE",
        headers: { authorization: `Bearer ${grant.accessToken}` },
        signal: AbortSignal.timeout(VERCEL_DNS_HTTP_TIMEOUT_MS),
      }
    );
    await response.body?.cancel();
  } catch (error) {
    console.warn("sites.vercel_dns_uninstall_failed", {
      error: errorMessage(error),
    });
  }
}
