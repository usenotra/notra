import { fetchPublicUrl } from "@notra/ai/utils/public-fetch";
import { db } from "@notra/db/drizzle";
import { siteDomains } from "@notra/db/schema";
import type { SiteDomainVerificationRecord } from "@notra/db/types/sites";
import { normalizeHostname } from "@notra/sites-core/utils/hosts";
import {
  joinMountPath,
  listMountedAreas,
} from "@notra/sites-core/utils/mounts";
import { and, eq } from "drizzle-orm";

import {
  cloudflareSaasConfig,
  createCustomHostname,
  deleteCustomHostname,
  deleteCustomHostnameQuietly,
  findCustomHostname,
  getCustomHostname,
} from "./cloudflare-saas";
import {
  CLOUDFLARE_SAAS_MISSING_MESSAGE,
  DOMAIN_INPUT_PATH,
  DOMAIN_INPUT_SCHEME,
  IP_LITERAL,
  PROBE_MAX_BYTES,
  PROBE_TIMEOUT_MS,
  PROBE_USER_AGENT,
} from "./constants/domains";
import { getSitesHostingDomain, siteCnameTarget } from "./env";
import { SiteInputError } from "./errors";
import { setSitePublicOrigin } from "./sites";
import { releaseHostRecord } from "./state";
import type {
  CloudflareCustomHostname,
  CloudflareSaasConfig,
} from "./types/cloudflare-saas";
import type { SiteStorageTransaction } from "./types/deployments";
import type {
  AddSiteDomainInput,
  DomainCheck,
  RefreshSiteDomainResult,
  SiteDomain,
} from "./types/domains";
import type { Site } from "./types/sites";
import { errorMessage } from "./utils/errors";
import { prefixedId } from "./utils/ids";
import { readBodyUpTo } from "./utils/read-body";
import { withSiteHostLock } from "./utils/site-host-lock";
import { claimVerifiedHost } from "./utils/verified-host-claim";

export async function requireSiteDomain(
  siteId: string,
  domainId: string
): Promise<SiteDomain> {
  const [domain] = await db
    .select()
    .from(siteDomains)
    .where(and(eq(siteDomains.id, domainId), eq(siteDomains.siteId, siteId)))
    .limit(1);
  if (!domain) {
    throw new SiteInputError("Domain not found");
  }
  return domain;
}

function recordsFor(
  hostname: string,
  custom: CloudflareCustomHostname | null
): SiteDomainVerificationRecord[] {
  const records: SiteDomainVerificationRecord[] = [
    {
      type: "CNAME",
      name: hostname,
      value: siteCnameTarget(),
      purpose: "routing",
    },
  ];
  if (custom?.ownership_verification?.type === "txt") {
    records.push({
      type: "TXT",
      name: custom.ownership_verification.name,
      value: custom.ownership_verification.value,
      purpose: "ownership",
    });
  }
  for (const record of custom?.ssl?.validation_records ?? []) {
    if (record.txt_name && record.txt_value) {
      records.push({
        type: "TXT",
        name: record.txt_name,
        value: record.txt_value,
        purpose: "certificate",
      });
    }
  }
  return records;
}

function assertPublicHostname(hostname: string) {
  if (
    IP_LITERAL.test(hostname) ||
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".internal")
  ) {
    throw new SiteInputError("Use a public domain name");
  }
  const hostingDomain = getSitesHostingDomain();
  if (hostname === hostingDomain || hostname.endsWith(`.${hostingDomain}`)) {
    throw new SiteInputError("That address is already provided by Notra");
  }
}

async function claimCustomHostname(
  config: CloudflareSaasConfig,
  hostname: string,
  tx: SiteStorageTransaction
): Promise<CloudflareCustomHostname> {
  try {
    return await createCustomHostname(config, hostname);
  } catch (error) {
    const stale = await findCustomHostname(config, hostname);
    if (!stale) {
      throw error;
    }
    await deleteCustomHostname(config, stale.id);
    await tx
      .update(siteDomains)
      .set({
        cloudflareHostnameId: null,
        lastError: "Another site claimed this domain. Add it again to retry.",
      })
      .where(
        and(
          eq(siteDomains.hostname, hostname),
          eq(siteDomains.cloudflareHostnameId, stale.id)
        )
      );
    return await createCustomHostname(config, hostname);
  }
}

export async function addSiteDomain(
  site: Site,
  input: AddSiteDomainInput
): Promise<SiteDomain> {
  const hostname = normalizeHostname(
    input.value
      .trim()
      .replace(DOMAIN_INPUT_SCHEME, "")
      .replace(DOMAIN_INPUT_PATH, "")
  );
  if (!hostname) {
    throw new SiteInputError("Enter a domain like blog.acme.com");
  }
  assertPublicHostname(hostname);
  return await withSiteHostLock(hostname, async (tx) => {
    const claims = await tx
      .select()
      .from(siteDomains)
      .where(eq(siteDomains.hostname, hostname));
    if (claims.some((claim) => claim.siteId === site.id)) {
      throw new SiteInputError("This domain is already added");
    }
    if (claims.some((claim) => claim.status === "active")) {
      throw new SiteInputError(
        "This domain is already connected to another site"
      );
    }

    const isSubdomain = input.kind === "subdomain";
    const config = isSubdomain ? cloudflareSaasConfig() : null;
    const custom = config
      ? await claimCustomHostname(config, hostname, tx)
      : null;
    const [domain] = await tx
      .insert(siteDomains)
      .values({
        id: prefixedId("dom"),
        siteId: site.id,
        organizationId: site.organizationId,
        hostname,
        kind: input.kind,
        status: "pending",
        cloudflareHostnameId: custom?.id ?? null,
        verificationRecords: isSubdomain ? recordsFor(hostname, custom) : [],
        lastError:
          isSubdomain && !config ? CLOUDFLARE_SAAS_MISSING_MESSAGE : null,
      })
      .returning();
    if (!domain) {
      throw new Error("Could not add domain");
    }
    return domain;
  });
}

async function fetchWithTimeout(url: string): Promise<Response> {
  return await fetchPublicUrl(url, {
    signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    headers: { "User-Agent": PROBE_USER_AGENT },
  });
}

async function probeProxyOrigin(
  site: Site,
  origin: string
): Promise<string | null> {
  for (const { area, mount } of listMountedAreas(site.mounts)) {
    const probeUrl = `${origin}${joinMountPath(mount, "_notra/probe.txt")}`;
    try {
      const probe = await fetchWithTimeout(probeUrl);
      let body = "";
      if (probe.ok) {
        const result = await readBodyUpTo(probe, PROBE_MAX_BYTES);
        if (result.exceeded) {
          return `${probeUrl} returned a probe larger than ${PROBE_MAX_BYTES} bytes. Check the ${area} rewrite.`;
        }
        body = new TextDecoder().decode(result.bytes);
      } else {
        await probe.body?.cancel();
      }
      if (!body.includes(`notra-site=${site.id}`)) {
        return `${probeUrl} did not return this site (HTTP ${probe.status}). Check the ${area} rewrite.`;
      }
      const page = await fetchWithTimeout(`${origin}${mount}`);
      await page.body?.cancel();
      if (page.status >= 300 && page.status < 400) {
        return `${origin}${mount} redirects to ${page.headers.get("location")}; proxy it instead of redirecting.`;
      }
      if (/noindex/i.test(page.headers.get("x-robots-tag") ?? "")) {
        return `${origin}${mount} is served with X-Robots-Tag: noindex.`;
      }
    } catch (error) {
      return `Could not reach ${probeUrl}: ${errorMessage(error)}`;
    }
  }
  return null;
}

async function checkProxyDomain(
  site: Site,
  domain: SiteDomain,
  origin: string
): Promise<DomainCheck> {
  const problem = await probeProxyOrigin(site, origin);
  return {
    verified: problem === null,
    lastError: problem,
    records: domain.verificationRecords,
  };
}

async function checkSubdomain(
  site: Site,
  domain: SiteDomain
): Promise<DomainCheck> {
  const config = cloudflareSaasConfig();
  if (!(config && domain.cloudflareHostnameId)) {
    return {
      verified: false,
      lastError: CLOUDFLARE_SAAS_MISSING_MESSAGE,
      records: domain.verificationRecords,
    };
  }
  const custom = await getCustomHostname(config, domain.cloudflareHostnameId);
  const records = recordsFor(domain.hostname, custom);
  if (
    custom.hostname === domain.hostname &&
    custom.id === domain.cloudflareHostnameId &&
    custom.status === "active" &&
    custom.ssl?.status === "active"
  ) {
    return { verified: true, lastError: null, records };
  }
  const errors = [
    ...(custom.verification_errors ?? []),
    ...(custom.ssl?.validation_errors?.map((error) => error.message) ?? []),
  ];
  return {
    verified: false,
    lastError:
      errors.join("; ") ||
      `Waiting for DNS and certificate (status ${custom.status}, certificate ${custom.ssl?.status ?? "pending"})`,
    records,
  };
}

function nextDomainStatus(
  previous: SiteDomain["status"],
  verified: boolean
): SiteDomain["status"] {
  if (verified) {
    return "active";
  }
  return previous === "active" ? "failed" : "verifying";
}

export async function refreshSiteDomain(
  site: Site,
  domainId: string,
  userId: string | null
): Promise<RefreshSiteDomainResult> {
  const domain = await requireSiteDomain(site.id, domainId);
  if (domain.kind === "subdomain") {
    assertPublicHostname(domain.hostname);
  }
  const origin = `https://${domain.hostname}`;
  const { verified, lastError, records } =
    domain.kind === "proxy"
      ? await checkProxyDomain(site, domain, origin)
      : await checkSubdomain(site, domain);

  const updated = await withSiteHostLock(domain.hostname, async (tx) => {
    const claims = await tx
      .select()
      .from(siteDomains)
      .where(eq(siteDomains.hostname, domain.hostname));
    const current = claims.find(
      (claim) => claim.id === domain.id && claim.siteId === site.id
    );
    if (
      !current ||
      current.cloudflareHostnameId !== domain.cloudflareHostnameId
    ) {
      throw new SiteInputError(
        "Domain changed during verification. Retry verification."
      );
    }
    if (
      verified &&
      claims.some(
        (claim) => claim.id !== domain.id && claim.status === "active"
      )
    ) {
      throw new SiteInputError("Another site verified this domain first");
    }
    const [updated] = await tx
      .update(siteDomains)
      .set({
        status: nextDomainStatus(current.status, verified),
        lastError,
        verificationRecords: records,
        lastCheckedAt: new Date(),
        verifiedAt: verified
          ? (current.verifiedAt ?? new Date())
          : current.verifiedAt,
      })
      .where(eq(siteDomains.id, domain.id))
      .returning();
    if (!updated) {
      throw new SiteInputError("Domain not found");
    }
    if (verified && domain.kind === "subdomain") {
      await claimVerifiedHost(updated, tx);
    }
    return updated;
  });
  const rebuildJobId =
    verified && site.publicOrigin !== origin
      ? await setSitePublicOrigin(site, origin, userId)
      : null;
  return { domain: updated, rebuildJobId };
}

export async function removeSiteDomain(
  site: Site,
  domainId: string,
  aliasOrigin: string,
  userId: string | null
): Promise<string | null> {
  const domain = await requireSiteDomain(site.id, domainId);
  await withSiteHostLock(domain.hostname, async (tx) => {
    const [current] = await tx
      .select()
      .from(siteDomains)
      .where(eq(siteDomains.id, domain.id))
      .limit(1);
    if (!current) {
      return;
    }
    await Promise.all([
      deleteCustomHostnameQuietly(current.cloudflareHostnameId),
      domain.kind === "subdomain"
        ? releaseHostRecord(domain.hostname, site.id, tx)
        : undefined,
    ]);
    await tx.delete(siteDomains).where(eq(siteDomains.id, domain.id));
  });
  return site.publicOrigin === `https://${domain.hostname}`
    ? await setSitePublicOrigin(site, aliasOrigin, userId)
    : null;
}
