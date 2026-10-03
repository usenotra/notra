import { db } from "@notra/db/drizzle";
import {
  githubAppInstallations,
  githubIntegrations,
  siteDomains,
  sites,
} from "@notra/db/schema";
import { organizationIdInputSchema } from "@notra/schemas/dashboard/auth/organization";
import {
  addSiteDomainInputSchema,
  createSiteInputSchema,
  listSiteDeploymentsInputSchema,
  publishSiteDraftsInputSchema,
  saveSiteDraftInputSchema,
  setSiteSuspendedInputSchema,
  siteBranchPreviewInputSchema,
  siteDeploymentInputSchema,
  siteDomainInputSchema,
  siteFilePathInputSchema,
  sitePreviewAccessInputSchema,
  sitePreviewInputSchema,
  siteScopeInputSchema,
  updateSiteInputSchema,
} from "@notra/schemas/dashboard/sites";
import { SITE_R2_KEYS } from "@notra/sites-core/constants/sites";
import { hashBuildTarget } from "@notra/sites-core/utils/build-target";
import {
  getDeployment,
  getSite,
  listSiteDeployments,
  type Site,
} from "@notra/sites-server/deployments";
import { domainConnectForDomain } from "@notra/sites-server/domain-connect";
import {
  addSiteDomain,
  refreshSiteDomain,
  removeSiteDomain,
  siteCnameTarget,
} from "@notra/sites-server/domains";
import {
  discardSiteDraft,
  listSiteDrafts,
  listSiteSourceFiles,
  publishSiteDrafts,
  readSiteSourceFile,
  rebaseSiteDraft,
  saveSiteDraft,
  validateSiteDrafts,
} from "@notra/sites-server/editor";
import {
  getSitesHostingDomain,
  getSitesHostingPortSuffix,
  isSitesConfigured,
} from "@notra/sites-server/env";
import { previewAccessUrl } from "@notra/sites-server/preview-access";
import { r2GetText } from "@notra/sites-server/r2";
import {
  createBranchPreview,
  createSite,
  deletePreview,
  deleteSite,
  deployBranchHead,
  redeploy,
  rollbackToDeployment,
  setSiteSuspended,
  updateSiteSettings,
} from "@notra/sites-server/sites";
import { readServingState } from "@notra/sites-server/state";
import {
  buildTargetForDeployment,
  primaryMountUrl,
  siteAliasOrigin,
  sitePreviewOrigin,
} from "@notra/sites-server/urls";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import { after } from "next/server";

import { assertOrganizationAccess } from "@/lib/auth/organization";
import { authorizedProcedure } from "@/lib/orpc/base";
import {
  assertNotDemo,
  forbidden,
  notFound,
  serviceUnavailable,
} from "@/lib/orpc/utils/errors";
import { dispatchSiteJobs } from "@/lib/sites/dispatch";
import { toSitesOrpcError } from "@/lib/sites/orpc-errors";
import {
  liveDeploymentsFromState,
  serializeDeployment,
  serializeDomain,
  serializePreviews,
  serializeSite,
} from "@/lib/sites/serialize";

const ADMIN_ROLES = new Set(["owner", "admin"]);

/** Every site procedure: Sites must be configured, and domain errors become UI errors. */
const sitesProcedure = authorizedProcedure.use(async ({ next }) => {
  if (!isSitesConfigured()) {
    throw serviceUnavailable(
      "Notra Sites is not configured on this environment"
    );
  }
  try {
    return await next();
  } catch (error) {
    throw toSitesOrpcError(error);
  }
});

function dispatchLater(jobIds: Array<string | null>) {
  const ids = jobIds.filter((id): id is string => Boolean(id));
  if (ids.length > 0) {
    after(() => dispatchSiteJobs(ids));
  }
}

async function requireSite(
  context: { headers: Headers },
  input: { organizationId: string; siteId: string },
  options: { admin?: boolean } = {}
): Promise<{ site: Site; userId: string }> {
  const access = await assertOrganizationAccess({
    headers: context.headers,
    organizationId: input.organizationId,
  });
  if (options.admin && !ADMIN_ROLES.has(access.membership.role)) {
    throw forbidden("Only owners and admins can do this");
  }
  const site = await getSite(input.siteId);
  if (!site || site.organizationId !== input.organizationId) {
    throw notFound("Site not found");
  }
  return { site, userId: access.user.id };
}

async function servingState(siteId: string) {
  return (await readServingState(siteId))?.state ?? null;
}

/**
 * Deployments as the dashboard lists them. Only a ready production build that
 * isn't live and was built for the site's current settings can be restored.
 */
async function serializeDeploymentList(
  site: Site,
  deployments: Awaited<ReturnType<typeof listSiteDeployments>>,
  live: ReturnType<typeof liveDeploymentsFromState>
) {
  const currentHash = await hashBuildTarget(
    buildTargetForDeployment({ site, kind: "production", previewKey: null })
  );
  return deployments.map((deployment) => ({
    ...serializeDeployment(deployment, live),
    canRollback:
      deployment.kind === "production" &&
      deployment.status === "ready" &&
      !live.has(deployment.id) &&
      deployment.configHash === currentHash,
  }));
}

export const sitesRouter = {
  status: authorizedProcedure
    .input(organizationIdInputSchema)
    .handler(async ({ context, input }) => {
      await assertOrganizationAccess({
        headers: context.headers,
        organizationId: input.organizationId,
      });
      const configured = isSitesConfigured();
      // Shown in onboarding as `{slug}.{hostingDomain}` before the first site exists.
      const hostingDomain = configured
        ? `${getSitesHostingDomain()}${getSitesHostingPortSuffix()}`
        : null;
      return { configured, hostingDomain };
    }),

  list: authorizedProcedure
    .input(organizationIdInputSchema)
    .handler(async ({ context, input }) => {
      await assertOrganizationAccess({
        headers: context.headers,
        organizationId: input.organizationId,
      });
      if (!isSitesConfigured()) {
        return { configured: false, sites: [] };
      }
      const rows = await db
        .select()
        .from(sites)
        .where(eq(sites.organizationId, input.organizationId))
        .orderBy(desc(sites.createdAt));
      const details = await Promise.all(
        rows.map(async (site) => {
          const [latest, state] = await Promise.all([
            listSiteDeployments(site.id, 1),
            servingState(site.id),
          ]);
          return { site, latest: latest[0], state };
        })
      );
      return {
        configured: true,
        sites: details.map(({ site, latest, state }) => ({
          ...serializeSite(site, state),
          latestDeployment: latest
            ? serializeDeployment(latest, liveDeploymentsFromState(state))
            : null,
        })),
      };
    }),

  /** Repositories the org connected through the GitHub App; a site needs one of them. */
  repositories: authorizedProcedure
    .input(organizationIdInputSchema)
    .handler(async ({ context, input }) => {
      await assertOrganizationAccess({
        headers: context.headers,
        organizationId: input.organizationId,
      });
      return await db
        .select({
          id: githubIntegrations.id,
          owner: githubIntegrations.owner,
          repo: githubIntegrations.repo,
          defaultBranch: githubIntegrations.defaultBranch,
          private: githubIntegrations.githubRepositoryPrivate,
        })
        .from(githubIntegrations)
        .innerJoin(
          githubAppInstallations,
          eq(
            githubIntegrations.githubAppInstallationId,
            githubAppInstallations.id
          )
        )
        .where(
          and(
            eq(githubIntegrations.organizationId, input.organizationId),
            isNotNull(githubIntegrations.githubRepositoryId)
          )
        );
    }),

  get: sitesProcedure
    .input(siteScopeInputSchema)
    .handler(async ({ context, input }) => {
      const { site } = await requireSite(context, input);
      const [domains, deployments, state, drafts] = await Promise.all([
        db.select().from(siteDomains).where(eq(siteDomains.siteId, site.id)),
        listSiteDeployments(site.id, 30),
        servingState(site.id),
        listSiteDrafts(site.id),
      ]);
      const live = liveDeploymentsFromState(state);
      return {
        site: serializeSite(site, state),
        cnameTarget: siteCnameTarget(),
        domains: domains.map((domain) => serializeDomain(site, domain)),
        deployments: await serializeDeploymentList(site, deployments, live),
        previews: serializePreviews(site, state, deployments),
        draftCount: drafts.length,
      };
    }),

  create: sitesProcedure
    .input(createSiteInputSchema)
    .handler(async ({ context, input }) => {
      assertNotDemo();
      const access = await assertOrganizationAccess({
        headers: context.headers,
        organizationId: input.organizationId,
      });
      const result = await createSite({
        organizationId: input.organizationId,
        userId: access.user.id,
        name: input.name,
        slug: input.slug || undefined,
        repositoryId: input.repositoryId,
        productionBranch: input.productionBranch,
        rootDirectory: input.rootDirectory,
        mounts: input.mounts,
        previewVisibility: input.previewVisibility,
        publishMode: input.publishMode,
      });
      dispatchLater([result.jobId]);
      return {
        site: serializeSite(result.site, null),
        deploymentQueued: Boolean(result.jobId),
      };
    }),

  update: sitesProcedure
    .input(updateSiteInputSchema)
    .handler(async ({ context, input }) => {
      assertNotDemo();
      const { site, userId } = await requireSite(context, input, {
        admin: true,
      });
      const {
        organizationId: _organizationId,
        siteId: _siteId,
        ...patch
      } = input;
      const result = await updateSiteSettings(site, patch, userId);
      dispatchLater([result.rebuildJobId]);
      return {
        site: serializeSite(result.site, await servingState(site.id)),
        rebuilding: Boolean(result.rebuildJobId),
      };
    }),

  setSuspended: sitesProcedure
    .input(setSiteSuspendedInputSchema)
    .handler(async ({ context, input }) => {
      assertNotDemo();
      const { site } = await requireSite(context, input, { admin: true });
      await setSiteSuspended(site, input.suspended, input.reason);
      return { ok: true };
    }),

  delete: sitesProcedure
    .input(siteScopeInputSchema)
    .handler(async ({ context, input }) => {
      assertNotDemo();
      const { site } = await requireSite(context, input, { admin: true });
      await deleteSite(site);
      return { ok: true };
    }),

  deployments: {
    list: sitesProcedure
      .input(listSiteDeploymentsInputSchema)
      .handler(async ({ context, input }) => {
        const { site } = await requireSite(context, input);
        const [deployments, state] = await Promise.all([
          listSiteDeployments(site.id, input.limit),
          servingState(site.id),
        ]);
        return await serializeDeploymentList(
          site,
          deployments,
          liveDeploymentsFromState(state)
        );
      }),

    get: sitesProcedure
      .input(siteDeploymentInputSchema)
      .handler(async ({ context, input }) => {
        const { site } = await requireSite(context, input);
        const deployment = await getDeployment(input.deploymentId);
        if (!deployment || deployment.siteId !== site.id) {
          throw notFound("Deployment not found");
        }
        const [log, state] = await Promise.all([
          r2GetText(SITE_R2_KEYS.buildLog(site.id, deployment.id)),
          servingState(site.id),
        ]);
        return {
          deployment: serializeDeployment(
            deployment,
            liveDeploymentsFromState(state)
          ),
          log: log?.text ?? null,
        };
      }),

    deployLatest: sitesProcedure
      .input(siteScopeInputSchema)
      .handler(async ({ context, input }) => {
        assertNotDemo();
        const { site, userId } = await requireSite(context, input);
        dispatchLater([
          await deployBranchHead(site, { trigger: "manual", userId }),
        ]);
        return { ok: true };
      }),

    redeploy: sitesProcedure
      .input(siteDeploymentInputSchema)
      .handler(async ({ context, input }) => {
        assertNotDemo();
        const { site, userId } = await requireSite(context, input);
        dispatchLater([await redeploy(site, input.deploymentId, userId)]);
        return { ok: true };
      }),

    rollback: sitesProcedure
      .input(siteDeploymentInputSchema)
      .handler(async ({ context, input }) => {
        assertNotDemo();
        const { site } = await requireSite(context, input, { admin: true });
        await rollbackToDeployment(site, input.deploymentId);
        return { ok: true };
      }),
  },

  previews: {
    createForBranch: sitesProcedure
      .input(siteBranchPreviewInputSchema)
      .handler(async ({ context, input }) => {
        assertNotDemo();
        const { site, userId } = await requireSite(context, input);
        const result = await createBranchPreview(site, input.branch, userId);
        dispatchLater([result.jobId]);
        return {
          previewKey: result.previewKey,
          url: primaryMountUrl(
            sitePreviewOrigin(site.slug, result.previewKey),
            site.mounts
          ),
        };
      }),

    delete: sitesProcedure
      .input(sitePreviewInputSchema)
      .handler(async ({ context, input }) => {
        assertNotDemo();
        const { site } = await requireSite(context, input);
        dispatchLater([await deletePreview(site, input.previewKey)]);
        return { ok: true };
      }),

    /** Signs the member into a protected preview, or creates a 7-day share link. */
    accessUrl: sitesProcedure
      .input(sitePreviewAccessInputSchema)
      .handler(async ({ context, input }) => {
        const { site } = await requireSite(context, input);
        const next =
          input.next ?? site.mounts.blog ?? site.mounts.changelog ?? "/";
        return await previewAccessUrl({
          site,
          previewKey: input.previewKey,
          next,
          kind: input.kind,
        });
      }),
  },

  domains: {
    add: sitesProcedure
      .input(addSiteDomainInputSchema)
      .handler(async ({ context, input }) => {
        assertNotDemo();
        const { site } = await requireSite(context, input, { admin: true });
        const domain = await addSiteDomain(site, {
          kind: input.kind,
          value: input.value,
        });
        return { id: domain.id };
      }),

    refresh: sitesProcedure
      .input(siteDomainInputSchema)
      .handler(async ({ context, input }) => {
        const { site, userId } = await requireSite(context, input, {
          admin: true,
        });
        const result = await refreshSiteDomain(site, input.domainId, userId);
        dispatchLater([result.rebuildJobId]);
        return {
          status: result.domain.status,
          lastError: result.domain.lastError,
          rebuilding: Boolean(result.rebuildJobId),
        };
      }),

    /** One-click DNS via Domain Connect; `ready` carries the signed URL to open at the DNS provider. */
    connect: sitesProcedure
      .input(siteDomainInputSchema)
      .handler(async ({ context, input }) => {
        assertNotDemo();
        const { site } = await requireSite(context, input, { admin: true });
        return await domainConnectForDomain({ site, domainId: input.domainId });
      }),

    remove: sitesProcedure
      .input(siteDomainInputSchema)
      .handler(async ({ context, input }) => {
        assertNotDemo();
        const { site, userId } = await requireSite(context, input, {
          admin: true,
        });
        dispatchLater([
          await removeSiteDomain(
            site,
            input.domainId,
            siteAliasOrigin(site.slug),
            userId
          ),
        ]);
        return { ok: true };
      }),
  },

  editor: {
    files: sitesProcedure
      .input(siteScopeInputSchema)
      .handler(async ({ context, input }) => {
        const { site } = await requireSite(context, input);
        const [source, drafts] = await Promise.all([
          listSiteSourceFiles(site),
          listSiteDrafts(site.id),
        ]);
        return {
          commitSha: source.commitSha,
          files: source.files,
          drafts: drafts.map((draft) => ({
            path: draft.path,
            deleted: draft.deleted,
            baseBlobSha: draft.baseBlobSha,
            updatedAt: draft.updatedAt,
          })),
        };
      }),

    read: sitesProcedure
      .input(siteFilePathInputSchema)
      .handler(async ({ context, input }) => {
        const { site } = await requireSite(context, input);
        const [file, drafts] = await Promise.all([
          readSiteSourceFile(site, input.path),
          listSiteDrafts(site.id),
        ]);
        const draft =
          drafts.find((candidate) => candidate.path === input.path) ?? null;
        return {
          path: input.path,
          content:
            draft && !draft.deleted ? draft.content : (file?.content ?? ""),
          published: file?.content ?? null,
          blobSha: draft ? draft.baseBlobSha : (file?.sha ?? null),
          publishedBlobSha: file?.sha ?? null,
          hasDraft: Boolean(draft),
        };
      }),

    saveDraft: sitesProcedure
      .input(saveSiteDraftInputSchema)
      .handler(async ({ context, input }) => {
        assertNotDemo();
        const { site, userId } = await requireSite(context, input);
        const draft = await saveSiteDraft(site, {
          path: input.path,
          content: input.content,
          baseBlobSha: input.baseBlobSha,
          baseCommitSha: input.baseCommitSha,
          deleted: input.deleted,
          userId,
        });
        return { path: draft.path, updatedAt: draft.updatedAt };
      }),

    /** Keeps the draft's content and bases it on the current GitHub version (after a conflict). */
    rebaseDraft: sitesProcedure
      .input(siteFilePathInputSchema)
      .handler(async ({ context, input }) => {
        assertNotDemo();
        const { site } = await requireSite(context, input);
        return { rebased: Boolean(await rebaseSiteDraft(site, input.path)) };
      }),

    discardDraft: sitesProcedure
      .input(siteFilePathInputSchema)
      .handler(async ({ context, input }) => {
        const { site } = await requireSite(context, input);
        await discardSiteDraft(site.id, input.path);
        return { ok: true };
      }),

    validate: sitesProcedure
      .input(siteScopeInputSchema)
      .handler(async ({ context, input }) => {
        const { site } = await requireSite(context, input);
        const result = await validateSiteDrafts(site);
        return { ok: result.ok, diagnostics: result.diagnostics };
      }),

    publish: sitesProcedure
      .input(publishSiteDraftsInputSchema)
      .handler(async ({ context, input }) => {
        assertNotDemo();
        const { site, userId } = await requireSite(context, input);
        return await publishSiteDrafts(site, {
          message: input.message,
          mode: input.mode,
          userId,
        });
      }),
  },
};
