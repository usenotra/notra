import { db } from "@notra/db/drizzle";
import {
  organizations,
  siteDomains,
  siteDrafts,
  siteJobs,
  sites,
} from "@notra/db/schema";
import {
  SITE_PREVIEW_PASSWORD_MAX_LENGTH,
  SITE_PREVIEW_PASSWORD_MIN_LENGTH,
} from "@notra/sites-core/constants/sites";
import type { SiteMounts } from "@notra/sites-core/types/deployment";
import {
  isValidSiteSlug,
  siteAliasHost,
  slugifySiteName,
} from "@notra/sites-core/utils/hosts";
import { normalizeSiteMounts } from "@notra/sites-core/utils/mounts";
import { hashPreviewPassword } from "@notra/sites-core/utils/preview-password";
import { and, eq } from "drizzle-orm";

import { deleteCustomHostnameQuietly } from "./cloudflare-saas";
import {
  DEFAULT_SITE_MOUNTS,
  SITE_SLUG_ATTEMPTS,
  SITE_SLUG_FALLBACK_MAX_LENGTH,
  SITE_SLUG_RETRY_ROOT_MAX_LENGTH,
  SITE_SLUG_RETRY_SUFFIX_LENGTH,
} from "./constants/sites";
import { deployBranchHead } from "./deploy";
import { getSitesHostingDomain } from "./env";
import { SiteInputError } from "./errors";
import { assertSiteNameAllowed } from "./moderation";
import { r2DeletePrefix } from "./r2";
import { requireOrganizationRepository } from "./repositories";
import {
  claimHostRecord,
  mutateServingState,
  releaseHostRecord,
  setServingStatus,
} from "./state";
import type { SiteStorageTransaction } from "./types/deployments";
import type {
  CreateSiteInput,
  CreateSiteResult,
  Site,
  SiteSettingsPatch,
  SiteUpdateValues,
  UpdateSiteSettingsResult,
} from "./types/sites";
import { errorMessage } from "./utils/errors";
import { prefixedId } from "./utils/ids";
import { invalidateSiteIngestCaches } from "./utils/ingest-cache";
import { parseRootDirectory } from "./utils/root-directory";
import { acquireSiteHostLock } from "./utils/site-host-lock";
import { siteAliasOrigin } from "./utils/urls";

function siteAliasHostname(slug: string): string {
  return siteAliasHost(slug, getSitesHostingDomain());
}

function parseMounts(mounts: SiteMounts): SiteMounts {
  try {
    return normalizeSiteMounts(mounts);
  } catch (error) {
    throw new SiteInputError(errorMessage(error), { field: "sections" });
  }
}

async function uniqueSlug(base: string): Promise<string> {
  const root = isValidSiteSlug(base)
    ? base
    : `site-${base}`.slice(0, SITE_SLUG_FALLBACK_MAX_LENGTH).replace(/-$/, "");
  for (let attempt = 0; attempt < SITE_SLUG_ATTEMPTS; attempt += 1) {
    const candidate =
      attempt === 0
        ? root
        : `${root.slice(0, SITE_SLUG_RETRY_ROOT_MAX_LENGTH)}-${Math.random()
            .toString(36)
            .slice(2, 2 + SITE_SLUG_RETRY_SUFFIX_LENGTH)}`;
    if (!isValidSiteSlug(candidate)) {
      continue;
    }
    const [taken] = await db
      .select({ id: sites.id })
      .from(sites)
      .where(eq(sites.slug, candidate))
      .limit(1);
    if (!taken) {
      return candidate;
    }
  }
  throw new SiteInputError(
    "Could not find a free site address; pick a different name",
    { field: "name" }
  );
}

export async function createSite(
  input: CreateSiteInput
): Promise<CreateSiteResult> {
  const { integration, repository } = await requireOrganizationRepository(
    input.organizationId,
    input.repositoryId
  );
  if (!integration.githubRepositoryId) {
    throw new SiteInputError(
      "Connect the repository through the Notra GitHub App first",
      { field: "repository" }
    );
  }
  const rootDirectory = parseRootDirectory(input.rootDirectory ?? "");
  const mounts = parseMounts(input.mounts ?? DEFAULT_SITE_MOUNTS);
  const requestedSlug = input.slug?.trim().toLowerCase();
  if (requestedSlug && !isValidSiteSlug(requestedSlug)) {
    throw new SiteInputError(
      "Use 3-40 lowercase letters, digits and single dashes for the address",
      { field: "slug" }
    );
  }
  const slug =
    requestedSlug ?? (await uniqueSlug(slugifySiteName(input.name) || "site"));
  const siteId = prefixedId("site");
  const aliasHost = siteAliasHostname(slug);
  await assertSiteNameAllowed({
    organizationId: input.organizationId,
    userId: input.userId,
    name: input.name,
    address: aliasHost,
    slug,
  });

  await claimHostRecord(aliasHost, { siteId, kind: "alias" });
  let site: Site | undefined;
  try {
    [site] = await db
      .insert(sites)
      .values({
        id: siteId,
        organizationId: input.organizationId,
        projectId: input.projectId ?? null,
        name: input.name.trim(),
        slug,
        repositoryId: integration.id,
        githubInstallationId: repository.installationId,
        githubRepositoryId: integration.githubRepositoryId,
        repositoryOwner: repository.owner,
        repositoryName: repository.repo,
        productionBranch:
          input.productionBranch?.trim() || integration.defaultBranch || "main",
        rootDirectory,
        publicOrigin: siteAliasOrigin(slug),
        mounts,
        previewVisibility: input.previewVisibility ?? "protected",
        publishMode: input.publishMode ?? "pull_request",
        createdByUserId: input.userId,
      })
      .returning();
  } catch (error) {
    await releaseHostRecord(aliasHost, siteId);
    throw error;
  }
  if (!site) {
    throw new Error("Could not create site");
  }
  await invalidateSiteIngestCaches(site);
  await mutateServingState(site, (state) => ({
    write: state,
    result: undefined,
  }));
  const jobId = await deployBranchHead(site, {
    trigger: "manual",
    userId: input.userId,
  }).catch((error: unknown) => {
    console.warn("sites.initial_deploy_failed", errorMessage(error));
    return null;
  });
  return { site, jobId };
}

export async function setSiteSuspended(
  site: Site,
  suspended: boolean,
  reason?: string
): Promise<void> {
  const status = suspended ? "suspended" : "active";
  await setServingStatus(site, status);
  await db
    .update(sites)
    .set({ status, suspendedReason: suspended ? (reason ?? null) : null })
    .where(eq(sites.id, site.id));
  await invalidateSiteIngestCaches(site);
}

export async function updateSiteSettings(
  site: Site,
  patch: SiteSettingsPatch,
  userId: string | null
): Promise<UpdateSiteSettingsResult> {
  if (
    patch.previewPassword !== undefined &&
    patch.previewPassword !== null &&
    (patch.previewPassword.length < SITE_PREVIEW_PASSWORD_MIN_LENGTH ||
      patch.previewPassword.length > SITE_PREVIEW_PASSWORD_MAX_LENGTH)
  ) {
    throw new SiteInputError(
      `The password needs ${SITE_PREVIEW_PASSWORD_MIN_LENGTH} to ${SITE_PREVIEW_PASSWORD_MAX_LENGTH} characters`
    );
  }
  const values: SiteUpdateValues = {
    productionBranch: patch.productionBranch?.trim(),
    rootDirectory:
      patch.rootDirectory === undefined
        ? undefined
        : parseRootDirectory(patch.rootDirectory),
    mounts: patch.mounts ? parseMounts(patch.mounts) : undefined,
    previewsEnabled: patch.previewsEnabled,
    smartDeployments: patch.smartDeployments,
    previewCommentsEnabled: patch.previewCommentsEnabled,
    previewVisibility: patch.previewVisibility,
    publishMode: patch.publishMode,
    showBranding: patch.showBranding,
    analyticsEnabled: patch.analyticsEnabled,
    publicOrigin:
      patch.publicOrigin === undefined
        ? undefined
        : new URL(patch.publicOrigin).origin,
  };
  if (patch.previewPassword !== undefined) {
    values.previewPassword =
      patch.previewPassword === null
        ? null
        : await hashPreviewPassword(patch.previewPassword);
  }
  const name = patch.name?.trim();
  if (name !== undefined && name !== site.name) {
    if (userId === null) {
      throw new SiteInputError("A user is required to change the site name");
    }
    await assertSiteNameAllowed({
      organizationId: site.organizationId,
      userId,
      name,
      address: siteAliasHostname(site.slug),
    });
    values.name = name;
  }
  const result = await db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(sites)
      .where(eq(sites.id, site.id))
      .for("update");
    if (!current) {
      throw new SiteInputError("Site not found");
    }
    if (
      (values.productionBranch !== undefined &&
        values.productionBranch !== current.productionBranch) ||
      (values.rootDirectory !== undefined &&
        values.rootDirectory !== current.rootDirectory)
    ) {
      const [draft] = await tx
        .select({ id: siteDrafts.id })
        .from(siteDrafts)
        .where(eq(siteDrafts.siteId, current.id))
        .limit(1);
      if (draft) {
        throw new SiteInputError(
          "Publish or discard this site's drafts before changing its branch or root directory"
        );
      }
    }
    const removePreviewsThrough =
      current.previewsEnabled && values.previewsEnabled === false
        ? current.lastGeneration + 1
        : null;
    const rebuilding = Boolean(
      (values.mounts &&
        JSON.stringify(values.mounts) !== JSON.stringify(current.mounts)) ||
      (values.productionBranch &&
        values.productionBranch !== current.productionBranch) ||
      (values.rootDirectory !== undefined &&
        values.rootDirectory !== current.rootDirectory) ||
      (values.showBranding !== undefined &&
        values.showBranding !== current.showBranding) ||
      (values.publicOrigin !== undefined &&
        values.publicOrigin !== current.publicOrigin)
    );
    const [updated] = Object.values(values).some((value) => value !== undefined)
      ? await tx
          .update(sites)
          .set({
            ...values,
            ...(removePreviewsThrough === null
              ? {}
              : { lastGeneration: removePreviewsThrough }),
          })
          .where(eq(sites.id, site.id))
          .returning()
      : [current];
    if (!updated) {
      throw new SiteInputError("Site not found");
    }
    const syncJobId = prefixedId("job");
    await tx.insert(siteJobs).values({
      id: syncJobId,
      siteId: updated.id,
      kind: "sync_state",
      payload: {
        rebuild: rebuilding,
        removePreviewsThrough,
        requestedByUserId: userId,
      },
    });
    return { site: updated, syncJobId, rebuilding };
  });
  await invalidateSiteIngestCaches(site);
  return result;
}

export async function setSitePublicOrigin(
  site: Site,
  origin: string,
  userId: string | null
): Promise<string> {
  const { syncJobId } = await updateSiteSettings(
    site,
    { publicOrigin: origin },
    userId
  );
  return syncJobId;
}

export async function deleteSite(
  site: Site,
  tx?: SiteStorageTransaction
): Promise<void> {
  if (!tx) {
    await db.transaction(async (locked) => {
      await locked
        .select({ id: organizations.id })
        .from(organizations)
        .where(eq(organizations.id, site.organizationId))
        .for("update");
      const [current] = await locked
        .select()
        .from(sites)
        .where(
          and(
            eq(sites.id, site.id),
            eq(sites.organizationId, site.organizationId)
          )
        )
        .limit(1);
      if (!current) {
        throw new SiteInputError("Site not found");
      }
      const domains = await locked
        .select({ hostname: siteDomains.hostname })
        .from(siteDomains)
        .where(eq(siteDomains.siteId, site.id));
      const hostnames = new Set([
        siteAliasHostname(current.slug),
        ...domains.map((domain) => domain.hostname),
      ]);
      for (const hostname of [...hostnames].sort()) {
        await acquireSiteHostLock(locked, hostname);
      }
      await deleteSite(current, locked);
    });
    return;
  }
  await setServingStatus(site, "suspended", tx);
  const subdomains = await tx
    .select({
      hostname: siteDomains.hostname,
      cloudflareHostnameId: siteDomains.cloudflareHostnameId,
    })
    .from(siteDomains)
    .where(
      and(eq(siteDomains.siteId, site.id), eq(siteDomains.kind, "subdomain"))
    );
  await releaseHostRecord(siteAliasHostname(site.slug), site.id, tx);
  for (const domain of subdomains) {
    await releaseHostRecord(domain.hostname, site.id, tx);
    await deleteCustomHostnameQuietly(domain.cloudflareHostnameId);
  }
  await tx.delete(sites).where(eq(sites.id, site.id));
  await invalidateSiteIngestCaches(site);
  await Promise.all(
    ["deployments", "logs", "sites"].map((root) =>
      r2DeletePrefix(`${root}/${site.id}/`)
    )
  );
}
