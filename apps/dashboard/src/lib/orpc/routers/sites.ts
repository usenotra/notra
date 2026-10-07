import {
  listGitHubAppInstallationsByOrganization,
  listGitHubAppRepositoriesEffect,
  setSelectedGitHubAppRepositoriesEffect,
} from "@notra/ai/integrations/github";
import { db } from "@notra/db/drizzle";
import {
  githubIntegrations,
  projects,
  siteDomains,
  sites,
} from "@notra/db/schema";
import { loadSiteAnalytics } from "@notra/geo-core/geo/web-analytics";
import { geoWindow } from "@notra/geo-core/geo/window";
import { organizationIdInputSchema } from "@notra/schemas/dashboard/auth/organization";
import {
  addSiteDomainInputSchema,
  connectSiteRepositoryInputSchema,
  createSiteInputSchema,
  repositorySuggestionsInputSchema,
  siteRepositorySuggestionsInputSchema,
  listSiteDeploymentsInputSchema,
  publishSiteDraftsInputSchema,
  saveSiteDraftInputSchema,
  setSiteSuspendedInputSchema,
  siteBranchPreviewInputSchema,
  siteDeploymentInputSchema,
  siteDomainInputSchema,
  saveSiteIntegrationInputSchema,
  siteFilePathInputSchema,
  sitePreviewAccessInputSchema,
  sitePreviewInputSchema,
  siteAnalyticsInputSchema,
  siteScopeInputSchema,
  siteSetPreviewPasswordInputSchema,
  siteStarterInputSchema,
  updateSiteInputSchema,
} from "@notra/schemas/dashboard/sites";
import {
  SITE_CONFIG_FILENAME,
  SITE_R2_KEYS,
} from "@notra/sites-core/constants/sites";
import { hashBuildTarget } from "@notra/sites-core/utils/build-target";
import {
  deployBranchHead,
  redeploy,
  rollbackToDeployment,
} from "@notra/sites-server/deploy";
import {
  getDeployment,
  getSite,
  listSiteDeployments,
} from "@notra/sites-server/deployments";
import { dnsSetupForDomain } from "@notra/sites-server/dns-setup";
import {
  addSiteDomain,
  refreshSiteDomain,
  removeSiteDomain,
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
  siteCnameTarget,
} from "@notra/sites-server/env";
import {
  getRepositorySuggestions,
  requireSiteRepository,
} from "@notra/sites-server/github";
import {
  readSiteIntegrations,
  saveSiteIntegration,
} from "@notra/sites-server/integrations";
import {
  previewAccessUrl,
  setSitePreviewPassword,
} from "@notra/sites-server/preview-access";
import {
  createBranchPreview,
  deletePreview,
} from "@notra/sites-server/previews";
import { r2GetText } from "@notra/sites-server/r2";
import { organizationRepositorySuggestions } from "@notra/sites-server/repositories";
import {
  createSite,
  deleteSite,
  setSiteSuspended,
  updateSiteSettings,
} from "@notra/sites-server/sites";
import {
  createSiteStarter,
  siteStarterStatus,
} from "@notra/sites-server/starter";
import { readServingState } from "@notra/sites-server/state";
import type { Site } from "@notra/sites-server/types/sites";
import {
  buildTargetForDeployment,
  primaryMountUrl,
  siteAliasOrigin,
  sitePreviewOrigin,
} from "@notra/sites-server/urls";
import { defaultSiteConfigContent } from "@notra/sites-server/utils/default-config";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import { Effect } from "effect";

import {
  SITE_ADMIN_ROLES,
  SITE_DEPLOYMENTS_PAGE_LIMIT,
} from "@/constants/sites";
import { assertOrganizationAccess } from "@/lib/auth/organization";
import { afterResponse } from "@/lib/framework/after-response";
import { geoCoreDashboardLayer } from "@/lib/geo/configure";
import { authorizedProcedure } from "@/lib/orpc/base";
import { runOrpcEffect } from "@/lib/orpc/effect";
import {
  assertNotDemo,
  forbidden,
  notFound,
  serviceUnavailable,
} from "@/lib/orpc/utils/errors";
import { toGeoOrpcError } from "@/lib/orpc/utils/geo-errors";
import { assertSitesAccess } from "@/lib/sites/access";
import { dispatchSiteJobs } from "@/lib/sites/dispatch";
import { toSitesOrpcError } from "@/lib/sites/orpc-errors";
import {
  liveDeploymentsFromState,
  serializeDeployment,
  serializeDomain,
  serializePreviews,
  serializeSite,
} from "@/lib/sites/serialize";
import type { SiteScope } from "@/types/sites";
import type {
  SiteAccess,
  SiteAccessOptions,
  SiteRequestContext,
} from "@/types/sites-server";
import { toGitHubOperationOrpcError } from "@/utils/github-operation-error";

const sitesAccessProcedure = authorizedProcedure.use(
  async ({ context, next }, input) => {
    const { organizationId } = organizationIdInputSchema.parse(input);
    await assertSitesAccess({ headers: context.headers, organizationId });
    return next();
  }
);

const sitesProcedure = sitesAccessProcedure.use(async ({ next }) => {
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
    afterResponse(() => dispatchSiteJobs(ids));
  }
}

async function requireSite(
  context: SiteRequestContext,
  input: SiteScope,
  options: SiteAccessOptions = {}
): Promise<SiteAccess> {
  const access = await assertOrganizationAccess({
    headers: context.headers,
    organizationId: input.organizationId,
  });
  if (options.admin && !SITE_ADMIN_ROLES.has(access.membership.role)) {
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
  status: sitesAccessProcedure
    .input(organizationIdInputSchema)
    .handler(async ({ context, input }) => {
      await assertOrganizationAccess({
        headers: context.headers,
        organizationId: input.organizationId,
      });
      const configured = isSitesConfigured();
      const hostingDomain = configured
        ? `${getSitesHostingDomain()}${getSitesHostingPortSuffix()}`
        : null;
      return { configured, hostingDomain };
    }),

  list: sitesAccessProcedure
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

  importableRepositories: sitesAccessProcedure
    .input(organizationIdInputSchema)
    .handler(async ({ context, input }) => {
      await assertOrganizationAccess({
        headers: context.headers,
        organizationId: input.organizationId,
      });
      const installations = await listGitHubAppInstallationsByOrganization(
        input.organizationId
      );
      if (installations.length === 0) {
        return { installed: false, repositories: [] };
      }
      const [available, connected] = await Promise.all([
        runOrpcEffect(
          listGitHubAppRepositoriesEffect(input.organizationId, installations),
          toGitHubOperationOrpcError
        ),
        db
          .select({
            id: githubIntegrations.id,
            githubRepositoryId: githubIntegrations.githubRepositoryId,
          })
          .from(githubIntegrations)
          .where(
            and(
              eq(githubIntegrations.organizationId, input.organizationId),
              isNotNull(githubIntegrations.githubRepositoryId)
            )
          ),
      ]);
      const integrationByRepository = new Map(
        connected.map((row) => [row.githubRepositoryId, row.id])
      );
      return {
        installed: true,
        repositories: available.map((repository) => ({
          githubRepositoryId: repository.id,
          owner: repository.owner,
          repo: repository.name,
          private: repository.private,
          defaultBranch: repository.defaultBranch,
          description: repository.description,
          integrationId: integrationByRepository.get(repository.id) ?? null,
        })),
      };
    }),

  connectRepository: sitesAccessProcedure
    .input(connectSiteRepositoryInputSchema)
    .handler(async ({ context, input }) => {
      const auth = await assertOrganizationAccess({
        headers: context.headers,
        organizationId: input.organizationId,
      });
      assertNotDemo();
      await runOrpcEffect(
        setSelectedGitHubAppRepositoriesEffect({
          organizationId: input.organizationId,
          userId: auth.user.id,
          repositoryIds: [input.githubRepositoryId],
          preserveExisting: true,
        }),
        toGitHubOperationOrpcError
      );
      const [repository] = await db
        .select({
          id: githubIntegrations.id,
          owner: githubIntegrations.owner,
          repo: githubIntegrations.repo,
          defaultBranch: githubIntegrations.defaultBranch,
          private: githubIntegrations.githubRepositoryPrivate,
        })
        .from(githubIntegrations)
        .where(
          and(
            eq(githubIntegrations.organizationId, input.organizationId),
            eq(githubIntegrations.githubRepositoryId, input.githubRepositoryId)
          )
        )
        .limit(1);
      if (!repository) {
        throw notFound("Repository not found");
      }
      return repository;
    }),

  repositorySuggestions: sitesProcedure
    .input(repositorySuggestionsInputSchema)
    .handler(async ({ context, input }) => {
      await assertOrganizationAccess({
        headers: context.headers,
        organizationId: input.organizationId,
      });
      return await organizationRepositorySuggestions({
        organizationId: input.organizationId,
        repositoryId: input.repositoryId,
        ref: input.ref || null,
      });
    }),

  starterStatus: sitesProcedure
    .input(siteStarterInputSchema)
    .handler(async ({ context, input }) => {
      await assertOrganizationAccess({
        headers: context.headers,
        organizationId: input.organizationId,
      });
      return await siteStarterStatus(input);
    }),

  createStarter: sitesProcedure
    .input(siteStarterInputSchema)
    .handler(async ({ context, input }) => {
      assertNotDemo();
      await assertOrganizationAccess({
        headers: context.headers,
        organizationId: input.organizationId,
      });
      return await createSiteStarter(input);
    }),

  siteRepositorySuggestions: sitesProcedure
    .input(siteRepositorySuggestionsInputSchema)
    .handler(async ({ context, input }) => {
      const { site } = await requireSite(context, input);
      return await getRepositorySuggestions(
        requireSiteRepository(site),
        input.ref || null
      );
    }),

  get: sitesProcedure
    .input(siteScopeInputSchema)
    .handler(async ({ context, input }) => {
      const { site } = await requireSite(context, input);
      const [domains, state, drafts] = await Promise.all([
        db.select().from(siteDomains).where(eq(siteDomains.siteId, site.id)),
        servingState(site.id),
        listSiteDrafts(site.id),
      ]);
      const live = liveDeploymentsFromState(state);
      const deployments = await listSiteDeployments(
        site.id,
        SITE_DEPLOYMENTS_PAGE_LIMIT,
        [...live.keys()]
      );
      return {
        site: serializeSite(site, state),
        cnameTarget: siteCnameTarget(),
        domains: domains.map((domain) => serializeDomain(site, domain)),
        deployments: await serializeDeploymentList(site, deployments, live),
        previews: serializePreviews(site, state, deployments),
        draftCount: drafts.length,
      };
    }),

  analytics: sitesProcedure
    .input(siteAnalyticsInputSchema)
    .handler(async ({ context, input }) => {
      const { site } = await requireSite(context, input);
      return runOrpcEffect(
        loadSiteAnalytics(site, geoWindow(input)).pipe(
          Effect.provide(geoCoreDashboardLayer)
        ),
        toGeoOrpcError
      );
    }),

  create: sitesProcedure
    .input(createSiteInputSchema)
    .handler(async ({ context, input }) => {
      assertNotDemo();
      const access = await assertOrganizationAccess({
        headers: context.headers,
        organizationId: input.organizationId,
      });
      const project = input.projectId
        ? await db.query.projects.findFirst({
            columns: { id: true },
            where: and(
              eq(projects.id, input.projectId),
              eq(projects.organizationId, input.organizationId)
            ),
          })
        : undefined;
      const result = await createSite({
        organizationId: input.organizationId,
        projectId: project?.id ?? null,
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
      dispatchLater([result.syncJobId]);
      return {
        site: serializeSite(result.site, await servingState(site.id)),
        rebuilding: result.rebuilding,
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
        const state = await servingState(site.id);
        const live = liveDeploymentsFromState(state);
        const deployments = await listSiteDeployments(site.id, input.limit, [
          ...live.keys(),
        ]);
        return await serializeDeploymentList(site, deployments, live);
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

    accessUrl: sitesProcedure
      .input(sitePreviewAccessInputSchema)
      .handler(async ({ context, input }) => {
        const { site, userId } = await requireSite(context, input);
        const next =
          input.next ?? site.mounts.blog ?? site.mounts.changelog ?? "/";
        return await previewAccessUrl({
          site,
          previewKey: input.previewKey,
          next,
          kind: input.kind,
          userId,
        });
      }),

    setPassword: sitesProcedure
      .input(siteSetPreviewPasswordInputSchema)
      .handler(async ({ context, input }) => {
        assertNotDemo();
        const { site, userId } = await requireSite(context, input, {
          admin: true,
        });
        const result = await setSitePreviewPassword(
          site,
          input.password,
          userId
        );
        dispatchLater([result.syncJobId]);
        return { passwordSet: input.password !== null };
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

    connect: sitesProcedure
      .input(siteDomainInputSchema)
      .handler(async ({ context, input }) => {
        assertNotDemo();
        const { site } = await requireSite(context, input, { admin: true });
        return await dnsSetupForDomain({ site, domainId: input.domainId });
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
        const files = [...source.files];
        if (!files.some((file) => file.path === SITE_CONFIG_FILENAME)) {
          const content = defaultSiteConfigContent(site);
          files.push({
            path: SITE_CONFIG_FILENAME,
            sha: "",
            size: Buffer.byteLength(content),
          });
          files.sort((left, right) => left.path.localeCompare(right.path));
        }
        return {
          commitSha: source.commitSha,
          files,
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
            draft && !draft.deleted
              ? draft.content
              : (file?.content ??
                (input.path === SITE_CONFIG_FILENAME
                  ? defaultSiteConfigContent(site)
                  : "")),
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

  integrations: {
    get: sitesProcedure
      .input(siteScopeInputSchema)
      .handler(async ({ context, input }) => {
        const { site } = await requireSite(context, input);
        return await readSiteIntegrations(site);
      }),

    save: sitesProcedure
      .input(saveSiteIntegrationInputSchema)
      .handler(async ({ context, input }) => {
        assertNotDemo();
        const { site, userId } = await requireSite(context, input);
        return await saveSiteIntegration(site, {
          provider: input.provider,
          settings: input.settings,
          userId,
        });
      }),
  },
};
