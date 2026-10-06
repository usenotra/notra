import { db } from "@notra/db/drizzle";
import { siteDomains, sites } from "@notra/db/schema";
import type { SiteMounts } from "@notra/sites-core/types/deployment";
import {
  isValidSiteSlug,
  siteAliasHost,
  slugifySiteName,
} from "@notra/sites-core/utils/hosts";
import { normalizeSiteMounts } from "@notra/sites-core/utils/mounts";
import { and, eq } from "drizzle-orm";

import { deleteCustomHostnameQuietly } from "./cloudflare-saas";
import { DEFAULT_SITE_MOUNTS, SITE_SLUG_ATTEMPTS } from "./constants/sites";
import { deployBranchHead } from "./deploy";
import { getSitesHostingDomain } from "./env";
import { SiteInputError } from "./errors";
import { assertSiteNameAllowed } from "./moderation";
import { closeAllPreviews } from "./previews";
import { r2DeletePrefix } from "./r2";
import { requireOrganizationRepository } from "./repositories";
import {
  claimHostRecord,
  mutateServingState,
  releaseHostRecord,
  setServingPreviewVisibility,
  setServingStatus,
} from "./state";
import type {
  CreateSiteInput,
  CreateSiteResult,
  Site,
  SiteSettingsPatch,
  SiteUpdateValues,
  UpdateSiteSettingsResult,
} from "./types/sites";
import { siteAliasOrigin } from "./urls";
import { errorMessage } from "./utils/errors";
import { prefixedId } from "./utils/ids";
import { parseRootDirectory } from "./utils/root-directory";

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
    : `site-${base}`.slice(0, 32).replace(/-$/, "");
  for (let attempt = 0; attempt < SITE_SLUG_ATTEMPTS; attempt += 1) {
    const candidate =
      attempt === 0
        ? root
        : `${root.slice(0, 34)}-${Math.random().toString(36).slice(2, 6)}`;
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
}

export async function updateSiteSettings(
  site: Site,
  patch: SiteSettingsPatch,
  userId: string
): Promise<UpdateSiteSettingsResult> {
  const values: SiteUpdateValues = {
    productionBranch: patch.productionBranch?.trim(),
    rootDirectory:
      patch.rootDirectory === undefined
        ? undefined
        : parseRootDirectory(patch.rootDirectory),
    mounts: patch.mounts ? parseMounts(patch.mounts) : undefined,
    previewsEnabled: patch.previewsEnabled,
    previewVisibility: patch.previewVisibility,
    publishMode: patch.publishMode,
    showBranding: patch.showBranding,
  };
  const name = patch.name?.trim();
  if (name !== undefined && name !== site.name) {
    await assertSiteNameAllowed({
      organizationId: site.organizationId,
      userId,
      name,
      address: siteAliasHostname(site.slug),
    });
    values.name = name;
  }
  const [updated] = await db
    .update(sites)
    .set(values)
    .where(eq(sites.id, site.id))
    .returning();
  if (!updated) {
    throw new SiteInputError("Site not found");
  }
  if (
    patch.previewVisibility &&
    patch.previewVisibility !== site.previewVisibility
  ) {
    await setServingPreviewVisibility(updated, patch.previewVisibility);
  }
  const needsRebuild =
    (values.mounts &&
      JSON.stringify(values.mounts) !== JSON.stringify(site.mounts)) ||
    (values.productionBranch &&
      values.productionBranch !== site.productionBranch) ||
    (values.rootDirectory !== undefined &&
      values.rootDirectory !== site.rootDirectory) ||
    (values.showBranding !== undefined &&
      values.showBranding !== site.showBranding);
  const rebuildJobId = needsRebuild
    ? await deployBranchHead(updated, { trigger: "config", userId })
    : null;
  const previewRemovalJobIds =
    site.previewsEnabled && !updated.previewsEnabled
      ? await closeAllPreviews(updated)
      : [];
  return { site: updated, rebuildJobId, previewRemovalJobIds };
}

export async function setSitePublicOrigin(
  site: Site,
  origin: string,
  userId: string | null
): Promise<string> {
  const [updated] = await db
    .update(sites)
    .set({ publicOrigin: new URL(origin).origin })
    .where(eq(sites.id, site.id))
    .returning();
  if (!updated) {
    throw new SiteInputError("Site not found");
  }
  return await deployBranchHead(updated, { trigger: "config", userId });
}

export async function deleteSite(site: Site): Promise<void> {
  await setServingStatus(site, "suspended");
  const subdomains = await db
    .select({
      hostname: siteDomains.hostname,
      cloudflareHostnameId: siteDomains.cloudflareHostnameId,
    })
    .from(siteDomains)
    .where(
      and(eq(siteDomains.siteId, site.id), eq(siteDomains.kind, "subdomain"))
    );
  await Promise.all([
    releaseHostRecord(siteAliasHostname(site.slug), site.id),
    ...subdomains.map(async (domain) => {
      await releaseHostRecord(domain.hostname, site.id);
      await deleteCustomHostnameQuietly(domain.cloudflareHostnameId);
    }),
  ]);
  await db.delete(sites).where(eq(sites.id, site.id));
  await Promise.all(
    ["deployments", "logs", "sites"].map((root) =>
      r2DeletePrefix(`${root}/${site.id}/`)
    )
  );
}
