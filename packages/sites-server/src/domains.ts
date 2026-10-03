import { db } from "@notra/db/drizzle";
import { siteDomains } from "@notra/db/schema";
import type { SiteDomainVerificationRecord } from "@notra/db/types/sites";
import { normalizeHostname } from "@notra/sites-core/utils/hosts";
import {
  joinMountPath,
  listMountedAreas,
} from "@notra/sites-core/utils/mounts";
import { and, eq, ne } from "drizzle-orm";

import {
  type CloudflareCustomHostname,
  cloudflareSaasConfig,
  createCustomHostname,
  deleteCustomHostname,
  deleteCustomHostnameQuietly,
  findCustomHostname,
  getCustomHostname,
} from "./cloudflare-saas";
import type { Site } from "./deployments";
import { getSitesHostingDomain } from "./env";
import { setSitePublicOrigin, SiteInputError } from "./sites";
import { claimHostRecord, releaseHostRecord } from "./state";

const PROBE_TIMEOUT_MS = 10_000;
const IP_LITERAL = /^(?:\d{1,3}\.){3}\d{1,3}$|^\[?[0-9a-f:]+\]?$/i;

export type SiteDomain = typeof siteDomains.$inferSelect;

/** CNAME target customers point their subdomain at. */
export function siteCnameTarget(): string {
  return (
    process.env.SITES_CNAME_TARGET?.trim() || `cname.${getSitesHostingDomain()}`
  );
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
  if (
    hostname === getSitesHostingDomain() ||
    hostname.endsWith(`.${getSitesHostingDomain()}`)
  ) {
    throw new SiteInputError("That address is already provided by Notra");
  }
}

/**
 * `subdomain`: the customer CNAMEs e.g. blog.acme.com to us (Cloudflare for SaaS issues TLS).
 * `proxy`: the customer keeps acme.com and forwards /blog and /changelog to the site alias.
 */
export async function addSiteDomain(
  site: Site,
  input: { kind: SiteDomain["kind"]; value: string }
): Promise<SiteDomain> {
  const raw = input.value
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");
  const hostname = normalizeHostname(raw);
  if (!hostname) {
    throw new SiteInputError("Enter a domain like blog.acme.com");
  }
  assertPublicHostname(hostname);
  // Unverified claims by other sites do not block anyone; only a verified domain is taken.
  const claims = await db
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

  let custom: CloudflareCustomHostname | null = null;
  const config = input.kind === "subdomain" ? cloudflareSaasConfig() : null;
  if (config) {
    try {
      custom = await createCustomHostname(config, hostname);
    } catch (error) {
      // Cloudflare holds one entry per hostname. An abandoned, unverified claim from another
      // site may still own it; replace it, since only DNS control decides who verifies.
      const stale = await findCustomHostname(config, hostname);
      if (!stale) {
        throw error;
      }
      await deleteCustomHostname(config, stale.id);
      await db
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
      custom = await createCustomHostname(config, hostname);
    }
  }
  const [domain] = await db
    .insert(siteDomains)
    .values({
      id: `dom_${crypto.randomUUID().replaceAll("-", "")}`,
      siteId: site.id,
      organizationId: site.organizationId,
      hostname,
      kind: input.kind,
      status: "pending",
      cloudflareHostnameId: custom?.id ?? null,
      verificationRecords:
        input.kind === "subdomain" ? recordsFor(hostname, custom) : [],
      lastError:
        input.kind === "subdomain" && !config
          ? "Custom subdomains need Cloudflare for SaaS (CLOUDFLARE_SAAS_ZONE_ID) on this environment."
          : null,
    })
    .returning();
  if (!domain) {
    throw new Error("Could not add domain");
  }
  return domain;
}

async function fetchWithTimeout(url: string): Promise<Response> {
  return await fetch(url, {
    redirect: "manual",
    signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    headers: { "User-Agent": "NotraSitesVerifier/1.0" },
  });
}

/**
 * Checks that the customer's proxy forwards every mount to this site:
 * the probe file must name this site, and the landing page must be served
 * without a noindex header leaking through.
 */
export async function probeProxyOrigin(
  site: Site,
  origin: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  for (const { area, mount } of listMountedAreas(site.mounts)) {
    const probeUrl = `${origin}${joinMountPath(mount, "_notra/probe.txt")}`;
    try {
      const probe = await fetchWithTimeout(probeUrl);
      const body = probe.ok ? await probe.text() : "";
      if (!body.includes(`notra-site=${site.id}`)) {
        return {
          ok: false,
          error: `${probeUrl} did not return this site (HTTP ${probe.status}). Check the ${area} rewrite.`,
        };
      }
      const page = await fetchWithTimeout(
        `${origin}${mount === "/" ? "/" : mount}`
      );
      if (page.status >= 300 && page.status < 400) {
        return {
          ok: false,
          error: `${origin}${mount} redirects to ${page.headers.get("location")}; proxy it instead of redirecting.`,
        };
      }
      if (/noindex/i.test(page.headers.get("x-robots-tag") ?? "")) {
        return {
          ok: false,
          error: `${origin}${mount} is served with X-Robots-Tag: noindex.`,
        };
      }
    } catch (error) {
      return {
        ok: false,
        error: `Could not reach ${probeUrl}: ${(error as Error).message}`,
      };
    }
  }
  return { ok: true };
}

/** Re-checks a domain; on success it becomes the site's canonical origin and the site is rebuilt for it. */
export async function refreshSiteDomain(
  site: Site,
  domainId: string,
  userId: string | null
): Promise<{ domain: SiteDomain; rebuildJobId: string | null }> {
  const [domain] = await db
    .select()
    .from(siteDomains)
    .where(and(eq(siteDomains.id, domainId), eq(siteDomains.siteId, site.id)))
    .limit(1);
  if (!domain) {
    throw new SiteInputError("Domain not found");
  }
  const origin = `https://${domain.hostname}`;
  let verified = false;
  let lastError: string | null = null;
  let records = domain.verificationRecords;

  if (domain.kind === "proxy") {
    const probe = await probeProxyOrigin(site, origin);
    verified = probe.ok;
    lastError = probe.ok ? null : probe.error;
  } else {
    const config = cloudflareSaasConfig();
    if (!(config && domain.cloudflareHostnameId)) {
      lastError =
        "Custom subdomains need Cloudflare for SaaS (CLOUDFLARE_SAAS_ZONE_ID) on this environment.";
    } else {
      const custom = await getCustomHostname(
        config,
        domain.cloudflareHostnameId
      );
      records = recordsFor(domain.hostname, custom);
      verified = custom.status === "active" && custom.ssl?.status === "active";
      lastError = verified
        ? null
        : [
            ...(custom.verification_errors ?? []),
            ...(custom.ssl?.validation_errors?.map((error) => error.message) ??
              []),
          ].join("; ") ||
          `Waiting for DNS and certificate (status ${custom.status}, certificate ${custom.ssl?.status ?? "pending"})`;
      if (verified) {
        await claimHostRecord(domain.hostname, {
          siteId: site.id,
          kind: "custom",
        });
      }
    }
  }

  // A domain that was live and stopped verifying is "failed"; one that never verified is still "verifying".
  let status: SiteDomain["status"] =
    domain.status === "active" ? "failed" : "verifying";
  if (verified) {
    status = "active";
  }
  if (verified) {
    const [owner] = await db
      .select({ siteId: siteDomains.siteId })
      .from(siteDomains)
      .where(
        and(
          eq(siteDomains.hostname, domain.hostname),
          eq(siteDomains.status, "active"),
          ne(siteDomains.id, domain.id)
        )
      )
      .limit(1);
    if (owner) {
      throw new SiteInputError("Another site verified this domain first");
    }
  }
  const [updated] = await db
    .update(siteDomains)
    .set({
      status,
      lastError,
      verificationRecords: records,
      lastCheckedAt: new Date(),
      verifiedAt: verified
        ? (domain.verifiedAt ?? new Date())
        : domain.verifiedAt,
    })
    .where(eq(siteDomains.id, domain.id))
    .returning();
  if (!updated) {
    throw new SiteInputError("Domain not found");
  }
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
  const [domain] = await db
    .select()
    .from(siteDomains)
    .where(and(eq(siteDomains.id, domainId), eq(siteDomains.siteId, site.id)))
    .limit(1);
  if (!domain) {
    throw new SiteInputError("Domain not found");
  }
  await deleteCustomHostnameQuietly(domain.cloudflareHostnameId);
  if (domain.kind === "subdomain") {
    await releaseHostRecord(domain.hostname, site.id);
  }
  await db.delete(siteDomains).where(eq(siteDomains.id, domain.id));
  // Falling back to the alias rebuilds canonicals/feeds for it.
  return site.publicOrigin === `https://${domain.hostname}`
    ? await setSitePublicOrigin(site, aliasOrigin, userId)
    : null;
}
