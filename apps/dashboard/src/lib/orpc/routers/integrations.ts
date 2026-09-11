import { invalidateStandaloneChatIntegrations } from "@notra/ai/chat/integrations-cache";
import { MCP_OAUTH_CALLBACK_PATH } from "@notra/ai/constants/mcp-auth";
import {
  addRepository,
  configureOutput,
  createGitHubIntegration,
  deleteGitHubIntegration,
  deleteRepository,
  findConflictingRepositoryInOrganization,
  GitHubBranchNotFoundError,
  GitHubRepositoryNotFoundError,
  generateWebhookSecretForRepository,
  getGitHubIntegrationById,
  getOutputById,
  getRepositoryById,
  getTokenForIntegrationId,
  getWebhookConfigForRepository,
  listAvailableRepositories,
  setRepositoryOutputDirectory,
  toggleOutput,
  updateGitHubIntegration,
  updateGitHubIntegrationToken,
  updateRepository,
  validateRepositoryAccess,
  validateRepositoryBranchExists,
} from "@notra/ai/integrations/github";
import {
  createGranolaIntegration,
  deleteGranolaIntegration,
  getGranolaIntegrationById,
  getGranolaIntegrationsByOrganization,
  updateGranolaIntegration,
  verifyGranolaApiKey,
} from "@notra/ai/integrations/granola";
import {
  deleteLinearIntegration,
  getLinearIntegrationById,
  getLinearIntegrationsByOrganization,
  updateLinearIntegration,
} from "@notra/ai/integrations/linear";
import {
  createMcpConnectionIntegration,
  deleteMcpConnectionIntegration,
  getMcpConnectionIntegration,
  getMcpConnectionIntegrationsByOrganization,
  serializeMcpServerIntegration,
  testMcpServerConnection,
  updateMcpConnectionIntegration,
} from "@notra/ai/integrations/mcp";
import { beginMcpOAuthAuthorization } from "@notra/ai/integrations/mcp-oauth";
import {
  McpOAuthAuthorizationError,
  McpOAuthNameConflictError,
} from "@notra/ai/integrations/mcp-oauth-errors";
import {
  getLiveMcpStoreIntegrationById,
  listLiveMcpStoreIntegrations,
} from "@notra/ai/integrations/mcp-store";
import { McpStoreListingUnavailableError } from "@notra/ai/integrations/mcp-store-errors";
import { refreshMcpToolIndexForIntegration } from "@notra/ai/integrations/mcp-tool-index";
import {
  deleteSlackIntegration,
  getSlackIntegrationBotToken,
  getSlackIntegrationById,
  getSlackIntegrationsByOrganization,
  updateSlackIntegration,
} from "@notra/ai/integrations/slack-workspace";
import { deleteQstashSchedule } from "@notra/ai/qstash/triggers";
import type { GitHubConnectionMethod } from "@notra/ai/types/github-connection";
import { createOctokit } from "@notra/ai/utils/octokit";
import { db } from "@notra/db/drizzle";
import { contentTriggers, repositoryOutputs } from "@notra/db/schema";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { organizationIdInputSchema } from "@notra/schemas/dashboard/auth/organization";
import {
  createGranolaIntegrationRequestSchema,
  updateGranolaIntegrationBodySchema,
} from "@notra/schemas/dashboard/granola";
import {
  addRepositoryRequestSchema,
  beginMcpOAuthRequestSchema,
  configureOutputBodySchema,
  createGitHubIntegrationRequestSchema,
  createMcpServerRequestSchema,
  type IntegrationType,
  integrationIdParamSchema,
  integrationInputSchema,
  listRepositoryDirectoriesInputSchema,
  mcpServerIdParamSchema,
  mcpServerInputSchema,
  outputIdParamSchema,
  outputInputSchema,
  reauthorizeMcpOAuthRequestSchema,
  repositoryContentDirectoryConfigSchema,
  repositoryContentDirectoryInputSchema,
  repositoryIdParamSchema,
  repositoryInputSchema,
  testMcpServerRequestSchema,
  triggerTargetsSchema,
  updateIntegrationBodySchema,
  updateMcpServerBodySchema,
  updateOutputBodySchema,
  updateRepositoryBodySchema,
  updateRepositoryContentDirectoryBodySchema,
} from "@notra/schemas/dashboard/integrations";
import { updateLinearIntegrationBodySchema } from "@notra/schemas/dashboard/linear";
import {
  slackChannelListResponseSchema,
  slackListChannelsOptionsSchema,
  updateSlackIntegrationBodySchema,
} from "@notra/schemas/dashboard/slack-integration";
import { PublicUrlValidationError } from "@notra/utils/url";
import { and, eq } from "drizzle-orm";
import { Effect } from "effect";
// biome-ignore lint/performance/noNamespaceImport: Zod recommended way of importing
import * as z from "zod";

import { GITHUB_API_VERSION_HEADERS } from "@/constants/github";
import {
  INTEGRATION_AUTH_KINDS,
  INTEGRATION_PROVIDERS,
  MCP_CONNECTION_TEST_OUTCOMES,
  SLACK_CHANNEL_KINDS,
} from "@/constants/integration-analytics";
import { trackServerEvent } from "@/lib/analytics/posthog-server";
import { assertOrganizationAccess } from "@/lib/auth/organization";
import { assertActiveSubscription } from "@/lib/billing/subscription";
import { isUniqueConstraintError } from "@/lib/db/errors";
import { toMcpIntegrationAuthKind } from "@/lib/integrations/auth-kind";
import { clearGitHubPublishFailures } from "@/lib/integrations/github/github-publish-failure-state";
import {
  clearCachedSlackChannels,
  getCachedSlackChannels,
  setCachedSlackChannels,
} from "@/lib/integrations/slack/channel-cache";
import { baseProcedure } from "@/lib/orpc/base";
import { getIntegrationsByOrganization } from "@/lib/services/integrations";
import type {
  GitHubIntegration,
  GitHubRepository,
  RepositoryOutput,
} from "@/types/integrations";
import type { SlackChannelOption } from "@/types/slack-integration";
import { hasGitHubStatus } from "@/utils/github-publish-failure";
import { ratelimit } from "@/utils/ratelimit";

import {
  badRequest,
  conflict,
  forbidden,
  internalServerError,
  notFound,
  tooManyRequests,
} from "../utils/errors";

async function assertMcpConnectionRateLimit(organizationId: string) {
  const { success } = await ratelimit.mcpConnection.limit(organizationId);
  if (!success) {
    throw tooManyRequests(
      "Too many connection attempts. Wait a minute and try again."
    );
  }
}

function serializeRepositoryOutput(output: {
  id: string;
  outputType: string;
  enabled: boolean;
}): RepositoryOutput {
  return {
    id: output.id,
    outputType: output.outputType,
    enabled: output.enabled,
  };
}

function serializeRepository(repository: {
  id: string;
  owner: string;
  repo: string;
  defaultBranch: string | null;
  enabled: boolean;
  encryptedWebhookSecret?: string | null;
  outputs?: Array<{
    id: string;
    outputType: string;
    enabled: boolean;
  }>;
}): GitHubRepository {
  return {
    id: repository.id,
    owner: repository.owner,
    repo: repository.repo,
    defaultBranch: repository.defaultBranch,
    enabled: repository.enabled,
    ...(repository.encryptedWebhookSecret !== undefined
      ? { hasWebhook: Boolean(repository.encryptedWebhookSecret) }
      : {}),
    ...(repository.outputs
      ? {
          outputs: repository.outputs.map(serializeRepositoryOutput),
        }
      : {}),
  };
}

function serializeIntegration(integration: {
  id: string;
  displayName: string;
  enabled: boolean;
  githubAppInstallationId?: string | null;
  managedByGitHubApp?: boolean;
  createdAt: Date;
  createdByUser?: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  } | null;
  repositories: Array<{
    id: string;
    owner: string;
    repo: string;
    defaultBranch: string | null;
    enabled: boolean;
    encryptedWebhookSecret?: string | null;
    outputs?: Array<{
      id: string;
      outputType: string;
      enabled: boolean;
    }>;
  }>;
}): GitHubIntegration {
  return {
    id: integration.id,
    displayName: integration.displayName,
    enabled: integration.enabled,
    managedByGitHubApp:
      integration.managedByGitHubApp ??
      Boolean(integration.githubAppInstallationId),
    createdAt: integration.createdAt.toISOString(),
    ...(integration.createdByUser
      ? { createdByUser: integration.createdByUser }
      : {}),
    repositories: integration.repositories.map(serializeRepository),
  };
}

function serializeListedIntegration(integration: {
  type: string;
  id: string;
  displayName: string;
  connectionMethod?: GitHubConnectionMethod;
  enabled: boolean;
  managedByGitHubApp?: boolean;
  createdAt: Date;
  repositories: Array<{
    id: string;
    owner: string;
    repo: string;
    defaultBranch: string | null;
    enabled: boolean;
    encryptedWebhookSecret?: string | null;
    outputs?: Array<{
      id: string;
      outputType: string;
      enabled: boolean;
    }>;
  }>;
}): GitHubIntegration & {
  type: IntegrationType;
  connectionMethod?: GitHubConnectionMethod;
} {
  return {
    ...serializeIntegration(integration),
    type: integration.type as IntegrationType,
    ...(integration.connectionMethod
      ? { connectionMethod: integration.connectionMethod }
      : {}),
  };
}

async function requireIntegrationInOrganization(
  organizationId: string,
  integrationId: string
) {
  const integration = await getGitHubIntegrationById(integrationId);

  if (!integration || integration.organizationId !== organizationId) {
    throw notFound("Integration not found");
  }

  return integration;
}

async function requireRepositoryInOrganization(
  organizationId: string,
  repositoryId: string
) {
  const repository = await getRepositoryById(repositoryId);

  if (!repository || repository.integration.organizationId !== organizationId) {
    throw notFound("Repository not found");
  }

  return repository;
}

async function requireOutputInOrganization(
  organizationId: string,
  outputId: string
) {
  const output = await getOutputById(outputId);

  if (
    !output ||
    output.repository.integration.organizationId !== organizationId
  ) {
    throw notFound("Output not found");
  }

  return output;
}

async function getAffectedSchedulesForIntegration(
  organizationId: string,
  integrationId: string
) {
  const allSchedules = await db.query.contentTriggers.findMany({
    columns: {
      enabled: true,
      id: true,
      name: true,
      qstashScheduleId: true,
      targets: true,
    },
    where: and(
      eq(contentTriggers.organizationId, organizationId),
      eq(contentTriggers.sourceType, "cron")
    ),
  });

  return allSchedules.filter((schedule) => {
    const parsed = triggerTargetsSchema.safeParse(schedule.targets);

    if (!parsed.success) {
      return false;
    }

    return parsed.data.repositoryIds.includes(integrationId);
  });
}

function mapKnownIntegrationError(error: unknown): never {
  if (
    error instanceof Error &&
    error.message === "Repository already connected"
  ) {
    throw conflict("Repository already connected");
  }

  if (
    error instanceof Error &&
    error.message.includes("exactly one repository")
  ) {
    throw badRequest("Please select exactly one repository");
  }

  if (error instanceof GitHubBranchNotFoundError) {
    throw badRequest(error.message);
  }

  if (error instanceof GitHubRepositoryNotFoundError) {
    throw badRequest(
      "Unable to access repository. It may be private and require a Personal Access Token, or the name is incorrect."
    );
  }

  if (error instanceof Error) {
    throw badRequest(error.message);
  }

  throw internalServerError("Internal server error", error);
}

export const integrationsRouter = {
  list: baseProcedure
    .input(organizationIdInputSchema)
    .handler(async ({ context, input }) => {
      await assertOrganizationAccess({
        headers: context.headers,
        organizationId: input.organizationId,
      });

      const result = await getIntegrationsByOrganization(input.organizationId);

      return {
        integrations: result.integrations.map(serializeListedIntegration),
        count: result.count,
      };
    }),
  create: baseProcedure
    .input(createGitHubIntegrationRequestSchema)
    .handler(async ({ context, input }) => {
      const auth = await assertOrganizationAccess({
        headers: context.headers,
        organizationId: input.organizationId,
      });
      await assertActiveSubscription(input.organizationId);

      try {
        const displayName = `${input.owner}/${input.repo}`;

        const integration = await createGitHubIntegration({
          organizationId: input.organizationId,
          userId: auth.user.id,
          token: input.token || null,
          displayName,
          owner: input.owner,
          repo: input.repo,
          defaultBranch: input.branch || null,
        });

        await invalidateStandaloneChatIntegrations(input.organizationId);

        trackServerEvent({
          event: POSTHOG_EVENTS.INTEGRATION_CONNECTED,
          headers: context.headers,
          userId: auth.user.id,
          organizationId: input.organizationId,
          properties: {
            provider: INTEGRATION_PROVIDERS.GITHUB,
            auth_kind: input.token
              ? INTEGRATION_AUTH_KINDS.API_KEY
              : INTEGRATION_AUTH_KINDS.PUBLIC,
            integration_id: integration.id,
            has_branch: Boolean(input.branch),
          },
        });

        return serializeIntegration(integration);
      } catch (error) {
        mapKnownIntegrationError(error);
      }
    }),
  get: baseProcedure
    .input(integrationInputSchema)
    .handler(async ({ context, input }) => {
      await assertOrganizationAccess({
        headers: context.headers,
        organizationId: input.organizationId,
      });

      const integration = await requireIntegrationInOrganization(
        input.organizationId,
        input.integrationId
      );

      return serializeIntegration(integration);
    }),
  update: baseProcedure
    .input(integrationInputSchema.and(updateIntegrationBodySchema))
    .handler(async ({ context, input }) => {
      const auth = await assertOrganizationAccess({
        headers: context.headers,
        organizationId: input.organizationId,
      });
      await assertActiveSubscription(input.organizationId);

      const integration = await requireIntegrationInOrganization(
        input.organizationId,
        input.integrationId
      );

      const repository = integration.repositories[0];
      const normalizedBranch =
        input.branch !== undefined ? input.branch || null : undefined;
      const ownerChanged =
        input.owner !== undefined &&
        repository !== undefined &&
        input.owner !== repository.owner;
      const repoChanged =
        input.repo !== undefined &&
        repository !== undefined &&
        input.repo !== repository.repo;
      const isRenaming = ownerChanged || repoChanged;
      const effectiveOwner = input.owner ?? repository?.owner ?? "";
      const effectiveRepo = input.repo ?? repository?.repo ?? "";

      try {
        if (isRenaming) {
          const conflictingRepo = await findConflictingRepositoryInOrganization(
            input.organizationId,
            effectiveOwner,
            effectiveRepo,
            input.integrationId
          );

          if (conflictingRepo) {
            throw conflict("Repository already connected");
          }

          await validateRepositoryAccess({
            owner: effectiveOwner,
            repo: effectiveRepo,
            token: input.token,
            encryptedToken: integration.encryptedToken,
          });

          await updateGitHubIntegration(input.integrationId, {
            owner: effectiveOwner,
            repo: effectiveRepo,
          });
        }

        if (input.token !== undefined) {
          await updateGitHubIntegrationToken(input.integrationId, input.token);
        }

        if (normalizedBranch !== undefined) {
          if (integration.repositories.length !== 1) {
            throw badRequest(
              "Branch can only be edited for integrations with a single repository"
            );
          }

          if (!repository) {
            throw notFound("Repository not found");
          }

          if (normalizedBranch) {
            await validateRepositoryBranchExists({
              owner: effectiveOwner,
              repo: effectiveRepo,
              branch: normalizedBranch,
              token: input.token,
              encryptedToken: integration.encryptedToken,
            });
          }

          await updateRepository(repository.id, {
            defaultBranch: normalizedBranch,
          });
        }

        if (input.enabled !== undefined || input.displayName !== undefined) {
          await updateGitHubIntegration(input.integrationId, {
            enabled: input.enabled,
            repositoryEnabled: input.enabled,
            displayName: input.displayName,
          });
        }

        const updated = await requireIntegrationInOrganization(
          input.organizationId,
          input.integrationId
        );

        await invalidateStandaloneChatIntegrations(input.organizationId);

        if (
          input.enabled !== undefined &&
          input.enabled !== integration.enabled
        ) {
          trackServerEvent({
            event: POSTHOG_EVENTS.INTEGRATION_TOGGLED,
            headers: context.headers,
            userId: auth.user.id,
            organizationId: input.organizationId,
            properties: {
              provider: INTEGRATION_PROVIDERS.GITHUB,
              integration_id: input.integrationId,
              enabled: input.enabled,
            },
          });
        }

        return serializeIntegration(updated);
      } catch (error) {
        mapKnownIntegrationError(error);
      }
    }),
  delete: baseProcedure
    .input(integrationInputSchema)
    .handler(async ({ context, input }) => {
      const auth = await assertOrganizationAccess({
        headers: context.headers,
        organizationId: input.organizationId,
      });

      await requireIntegrationInOrganization(
        input.organizationId,
        input.integrationId
      );

      const affectedSchedules = await getAffectedSchedulesForIntegration(
        input.organizationId,
        input.integrationId
      );

      for (const schedule of affectedSchedules) {
        if (schedule.qstashScheduleId) {
          await deleteQstashSchedule(schedule.qstashScheduleId).catch(
            (error) => {
              console.error(
                `Failed to delete qstash schedule ${schedule.qstashScheduleId}:`,
                error
              );
            }
          );
        }

        await db
          .update(contentTriggers)
          .set({
            enabled: false,
            qstashScheduleId: null,
            updatedAt: new Date(),
          })
          .where(eq(contentTriggers.id, schedule.id));
      }

      await deleteGitHubIntegration(input.integrationId);

      await invalidateStandaloneChatIntegrations(input.organizationId);

      trackServerEvent({
        event: POSTHOG_EVENTS.INTEGRATION_DISCONNECTED,
        headers: context.headers,
        userId: auth.user.id,
        organizationId: input.organizationId,
        properties: {
          provider: INTEGRATION_PROVIDERS.GITHUB,
          integration_id: input.integrationId,
          disabled_schedule_count: affectedSchedules.length,
        },
      });

      return {
        success: true,
        disabledSchedules: affectedSchedules.map((schedule) => ({
          id: schedule.id,
          name: schedule.name,
        })),
      };
    }),
  affectedSchedules: baseProcedure
    .input(integrationInputSchema)
    .handler(async ({ context, input }) => {
      await assertOrganizationAccess({
        headers: context.headers,
        organizationId: input.organizationId,
      });

      const integration = await requireIntegrationInOrganization(
        input.organizationId,
        input.integrationId
      );
      const affectedSchedules = await getAffectedSchedulesForIntegration(
        input.organizationId,
        input.integrationId
      );

      return {
        ...serializeIntegration(integration),
        affectedSchedules: affectedSchedules.map((schedule) => ({
          id: schedule.id,
          name: schedule.name,
          enabled: schedule.enabled,
        })),
      };
    }),
  repositories: {
    listAvailable: baseProcedure
      .input(integrationInputSchema)
      .handler(async ({ context, input }) => {
        const auth = await assertOrganizationAccess({
          headers: context.headers,
          organizationId: input.organizationId,
        });

        await requireIntegrationInOrganization(
          input.organizationId,
          input.integrationId
        );

        try {
          return await listAvailableRepositories(
            input.integrationId,
            auth.user.id
          );
        } catch (error) {
          mapKnownIntegrationError(error);
        }
      }),
    add: baseProcedure
      .input(integrationInputSchema.and(addRepositoryRequestSchema))
      .handler(async ({ context, input }) => {
        const auth = await assertOrganizationAccess({
          headers: context.headers,
          organizationId: input.organizationId,
        });
        await assertActiveSubscription(input.organizationId);

        await requireIntegrationInOrganization(
          input.organizationId,
          input.integrationId
        );

        try {
          const repository = await addRepository({
            integrationId: input.integrationId,
            owner: input.owner,
            repo: input.repo,
            outputs: input.outputs,
            userId: auth.user.id,
          });

          await invalidateStandaloneChatIntegrations(input.organizationId);

          return repository;
        } catch (error) {
          mapKnownIntegrationError(error);
        }
      }),
    get: baseProcedure
      .input(repositoryInputSchema)
      .handler(async ({ context, input }) => {
        await assertOrganizationAccess({
          headers: context.headers,
          organizationId: input.organizationId,
        });

        const repository = await requireRepositoryInOrganization(
          input.organizationId,
          input.repositoryId
        );

        return serializeRepository(repository);
      }),
    update: baseProcedure
      .input(repositoryInputSchema.and(updateRepositoryBodySchema))
      .handler(async ({ context, input }) => {
        await assertOrganizationAccess({
          headers: context.headers,
          organizationId: input.organizationId,
        });
        await assertActiveSubscription(input.organizationId);

        const repository = await requireRepositoryInOrganization(
          input.organizationId,
          input.repositoryId
        );
        const normalizedDefaultBranch =
          input.defaultBranch !== undefined
            ? input.defaultBranch || null
            : undefined;

        try {
          if (normalizedDefaultBranch) {
            await validateRepositoryBranchExists({
              owner: repository.owner,
              repo: repository.repo,
              branch: normalizedDefaultBranch,
              encryptedToken: repository.integration.encryptedToken,
            });
          }

          const updated = await updateRepository(input.repositoryId, {
            ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
            ...(normalizedDefaultBranch !== undefined
              ? { defaultBranch: normalizedDefaultBranch }
              : {}),
          });

          if (!updated) {
            throw notFound("Repository not found");
          }

          const refreshed = await requireRepositoryInOrganization(
            input.organizationId,
            input.repositoryId
          );

          await invalidateStandaloneChatIntegrations(input.organizationId);

          return serializeRepository(refreshed);
        } catch (error) {
          mapKnownIntegrationError(error);
        }
      }),
    contentDirectory: {
      get: baseProcedure
        .input(repositoryInputSchema.and(repositoryContentDirectoryInputSchema))
        .handler(async ({ context, input }) => {
          await assertOrganizationAccess({
            headers: context.headers,
            organizationId: input.organizationId,
          });

          await requireRepositoryInOrganization(
            input.organizationId,
            input.repositoryId
          );

          const output = await db.query.repositoryOutputs.findFirst({
            where: and(
              eq(repositoryOutputs.repositoryId, input.repositoryId),
              eq(repositoryOutputs.outputType, input.contentType)
            ),
            columns: { config: true },
          });
          const config = repositoryContentDirectoryConfigSchema.safeParse(
            output?.config
          );

          return {
            directory: config.success ? config.data.directory : null,
          };
        }),
      update: baseProcedure
        .input(
          repositoryInputSchema.and(updateRepositoryContentDirectoryBodySchema)
        )
        .handler(async ({ context, input }) => {
          await assertOrganizationAccess({
            headers: context.headers,
            organizationId: input.organizationId,
          });
          await assertActiveSubscription(input.organizationId);

          await requireRepositoryInOrganization(
            input.organizationId,
            input.repositoryId
          );

          await setRepositoryOutputDirectory({
            repositoryId: input.repositoryId,
            outputType: input.contentType,
            directory: input.directory,
          });

          return { directory: input.directory };
        }),
    },
    directories: {
      list: baseProcedure
        .input(repositoryInputSchema.and(listRepositoryDirectoriesInputSchema))
        .handler(async ({ context, input }) => {
          await assertOrganizationAccess({
            headers: context.headers,
            organizationId: input.organizationId,
          });

          const repository = await requireRepositoryInOrganization(
            input.organizationId,
            input.repositoryId
          );
          if (!(repository.enabled && repository.integration.enabled)) {
            throw forbidden("This GitHub repository is disabled");
          }
          let token: string | null;
          try {
            token = await getTokenForIntegrationId(input.repositoryId, {
              organizationId: input.organizationId,
            });
          } catch (error) {
            if (
              hasGitHubStatus(error, 401) ||
              hasGitHubStatus(error, 404) ||
              (error instanceof Error &&
                error.message === "GitHub App installation not found")
            ) {
              throw forbidden(
                "GitHub authentication failed. Reconnect GitHub and try again."
              );
            }
            throw internalServerError(
              "Failed to authenticate with GitHub",
              error
            );
          }

          if (!token) {
            throw forbidden(
              "GitHub authentication failed. Reconnect GitHub and try again."
            );
          }

          try {
            const octokit = createOctokit(token);
            const requestOptions = {
              owner: repository.owner,
              repo: repository.repo,
              ...(repository.defaultBranch
                ? { ref: repository.defaultBranch }
                : {}),
              headers: GITHUB_API_VERSION_HEADERS,
            };
            const { data } = input.directory
              ? await octokit.request(
                  "GET /repos/{owner}/{repo}/contents/{path}",
                  {
                    ...requestOptions,
                    path: input.directory,
                  }
                )
              : await octokit.request("GET /repos/{owner}/{repo}/contents", {
                  ...requestOptions,
                });

            if (!Array.isArray(data)) {
              throw badRequest("The selected path is not a directory");
            }

            return {
              directories: data
                .flatMap((entry) =>
                  entry.type === "dir"
                    ? [{ name: entry.name, path: entry.path }]
                    : []
                )
                .sort((left, right) => left.name.localeCompare(right.name)),
              exists: true,
            };
          } catch (error) {
            if (hasGitHubStatus(error, 404)) {
              if (!input.directory) {
                throw notFound("Repository contents not found");
              }
              return { directories: [], exists: false };
            }
            if (hasGitHubStatus(error, 401) || hasGitHubStatus(error, 403)) {
              throw forbidden("GitHub denied access to this repository");
            }
            throw error;
          }
        }),
    },
    delete: baseProcedure
      .input(repositoryInputSchema)
      .handler(async ({ context, input }) => {
        await assertOrganizationAccess({
          headers: context.headers,
          organizationId: input.organizationId,
        });

        await requireRepositoryInOrganization(
          input.organizationId,
          input.repositoryId
        );
        await deleteRepository(input.repositoryId);

        await invalidateStandaloneChatIntegrations(input.organizationId);

        return { success: true };
      }),
    configureOutput: baseProcedure
      .input(repositoryInputSchema.and(configureOutputBodySchema))
      .handler(async ({ context, input }) => {
        await assertOrganizationAccess({
          headers: context.headers,
          organizationId: input.organizationId,
        });
        await assertActiveSubscription(input.organizationId);

        await requireRepositoryInOrganization(
          input.organizationId,
          input.repositoryId
        );

        return configureOutput({
          repositoryId: input.repositoryId,
          outputType: input.outputType,
          enabled: input.enabled,
          config: input.config,
        });
      }),
    webhook: {
      get: baseProcedure
        .input(repositoryInputSchema)
        .handler(async ({ context, input }) => {
          const auth = await assertOrganizationAccess({
            headers: context.headers,
            organizationId: input.organizationId,
          });

          await requireRepositoryInOrganization(
            input.organizationId,
            input.repositoryId
          );

          try {
            const config = await getWebhookConfigForRepository(
              input.repositoryId,
              auth.user.id
            );

            if (!config) {
              throw notFound("Webhook not configured");
            }

            return config;
          } catch (error) {
            if (
              error instanceof Error &&
              error.message === "Webhook not configured"
            ) {
              throw notFound("Webhook not configured");
            }

            mapKnownIntegrationError(error);
          }
        }),
      generateSecret: baseProcedure
        .input(repositoryInputSchema)
        .handler(async ({ context, input }) => {
          const auth = await assertOrganizationAccess({
            headers: context.headers,
            organizationId: input.organizationId,
          });
          await assertActiveSubscription(input.organizationId);

          await requireRepositoryInOrganization(
            input.organizationId,
            input.repositoryId
          );

          try {
            const secret = await generateWebhookSecretForRepository(
              input.repositoryId,
              auth.user.id
            );

            trackServerEvent({
              event: POSTHOG_EVENTS.WEBHOOK_SECRET_REGENERATED,
              headers: context.headers,
              userId: auth.user.id,
              organizationId: input.organizationId,
              properties: {
                repository_id: input.repositoryId,
              },
            });

            return secret;
          } catch (error) {
            mapKnownIntegrationError(error);
          }
        }),
    },
  },
  outputs: {
    update: baseProcedure
      .input(outputInputSchema.and(updateOutputBodySchema))
      .handler(async ({ context, input }) => {
        await assertOrganizationAccess({
          headers: context.headers,
          organizationId: input.organizationId,
        });
        await assertActiveSubscription(input.organizationId);

        const output = await requireOutputInOrganization(
          input.organizationId,
          input.outputId
        );

        const updatedOutput = await toggleOutput(input.outputId, input.enabled);

        if (
          updatedOutput &&
          input.enabled &&
          (output.outputType === "changelog" ||
            output.outputType === "blog_post")
        ) {
          await clearGitHubPublishFailures({
            organizationId: input.organizationId,
            outputType: output.outputType,
            repositoryId: output.repository.id,
          });
        }

        return updatedOutput;
      }),
  },
  linear: {
    list: baseProcedure
      .input(organizationIdInputSchema)
      .handler(async ({ context, input }) => {
        await assertOrganizationAccess({
          headers: context.headers,
          organizationId: input.organizationId,
        });

        const integrations = await getLinearIntegrationsByOrganization(
          input.organizationId
        );

        return {
          integrations: integrations.map((integration) => ({
            id: integration.id,
            displayName: integration.displayName,
            enabled: integration.enabled,
            createdAt: integration.createdAt.toISOString(),
            linearOrganizationName: integration.linearOrganizationName,
            linearTeamName: integration.linearTeamName,
            createdByUser: integration.createdByUser
              ? {
                  id: integration.createdByUser.id,
                  name: integration.createdByUser.name,
                  email: integration.createdByUser.email,
                  image: integration.createdByUser.image,
                }
              : undefined,
          })),
        };
      }),
    get: baseProcedure
      .input(integrationInputSchema)
      .handler(async ({ context, input }) => {
        await assertOrganizationAccess({
          headers: context.headers,
          organizationId: input.organizationId,
        });

        const integration = await getLinearIntegrationById(input.integrationId);

        if (!integration) {
          throw notFound("Linear integration not found");
        }

        if (integration.organizationId !== input.organizationId) {
          throw notFound("Linear integration not found");
        }

        return {
          id: integration.id,
          displayName: integration.displayName,
          enabled: integration.enabled,
          createdAt: integration.createdAt.toISOString(),
          linearOrganizationId: integration.linearOrganizationId,
          linearOrganizationName: integration.linearOrganizationName,
          linearTeamId: integration.linearTeamId,
          linearTeamName: integration.linearTeamName,
          createdByUser: integration.createdByUser
            ? {
                id: integration.createdByUser.id,
                name: integration.createdByUser.name,
                email: integration.createdByUser.email,
                image: integration.createdByUser.image,
              }
            : undefined,
        };
      }),
    update: baseProcedure
      .input(integrationInputSchema.and(updateLinearIntegrationBodySchema))
      .handler(async ({ context, input }) => {
        const auth = await assertOrganizationAccess({
          headers: context.headers,
          organizationId: input.organizationId,
        });
        await assertActiveSubscription(input.organizationId);

        const existing = await getLinearIntegrationById(input.integrationId);
        if (!existing || existing.organizationId !== input.organizationId) {
          throw notFound("Linear integration not found");
        }

        const updated = await updateLinearIntegration(input.integrationId, {
          enabled: input.enabled,
          displayName: input.displayName,
          linearTeamId: input.linearTeamId,
          linearTeamName: input.linearTeamName,
        });

        await invalidateStandaloneChatIntegrations(input.organizationId);

        if (input.enabled !== undefined && input.enabled !== existing.enabled) {
          trackServerEvent({
            event: POSTHOG_EVENTS.INTEGRATION_TOGGLED,
            headers: context.headers,
            userId: auth.user.id,
            organizationId: input.organizationId,
            properties: {
              provider: INTEGRATION_PROVIDERS.LINEAR,
              integration_id: input.integrationId,
              enabled: input.enabled,
            },
          });
        }

        return updated;
      }),
    delete: baseProcedure
      .input(integrationInputSchema)
      .handler(async ({ context, input }) => {
        const auth = await assertOrganizationAccess({
          headers: context.headers,
          organizationId: input.organizationId,
        });

        const existing = await getLinearIntegrationById(input.integrationId);
        if (!existing || existing.organizationId !== input.organizationId) {
          throw notFound("Linear integration not found");
        }

        await deleteLinearIntegration(input.integrationId);

        await invalidateStandaloneChatIntegrations(input.organizationId);

        trackServerEvent({
          event: POSTHOG_EVENTS.INTEGRATION_DISCONNECTED,
          headers: context.headers,
          userId: auth.user.id,
          organizationId: input.organizationId,
          properties: {
            provider: INTEGRATION_PROVIDERS.LINEAR,
            integration_id: input.integrationId,
          },
        });

        return { success: true };
      }),
  },
  slack: {
    list: baseProcedure
      .input(organizationIdInputSchema)
      .handler(async ({ context, input }) => {
        await assertOrganizationAccess({
          headers: context.headers,
          organizationId: input.organizationId,
        });

        const integrations = await getSlackIntegrationsByOrganization(
          input.organizationId
        );

        return {
          integrations: integrations.map((integration) => ({
            id: integration.id,
            displayName: integration.displayName,
            enabled: integration.enabled,
            createdAt: integration.createdAt.toISOString(),
            slackTeamId: integration.slackTeamId,
            slackTeamName: integration.slackTeamName,
            allowedChannelIds: integration.allowedChannelIds ?? null,
            notificationChannelId: integration.notificationChannelId ?? null,
            createdByUser: integration.createdByUser
              ? {
                  id: integration.createdByUser.id,
                  name: integration.createdByUser.name,
                  email: integration.createdByUser.email,
                  image: integration.createdByUser.image,
                }
              : undefined,
          })),
        };
      }),
    listChannels: baseProcedure
      .input(integrationInputSchema.and(slackListChannelsOptionsSchema))
      .handler(async ({ context, input }) => {
        await assertOrganizationAccess({
          headers: context.headers,
          organizationId: input.organizationId,
        });

        const integration = await getSlackIntegrationById(
          input.organizationId,
          input.integrationId
        );
        if (!integration) {
          throw notFound("Slack integration not found");
        }

        if (!input.refresh) {
          const cached = await getCachedSlackChannels(input.integrationId);
          if (cached) {
            return { channels: cached };
          }
        }

        const token = getSlackIntegrationBotToken(integration);
        const response = await fetch(
          "https://slack.com/api/conversations.list?types=public_channel&exclude_archived=true&limit=200",
          { headers: { authorization: `Bearer ${token}` } }
        );
        if (!response.ok) {
          throw internalServerError("Failed to load Slack channels");
        }
        const parsed = slackChannelListResponseSchema.safeParse(
          await response.json()
        );
        if (!(parsed.success && parsed.data.ok)) {
          throw internalServerError("Failed to load Slack channels");
        }

        const channels: SlackChannelOption[] = (
          parsed.data.channels ?? []
        ).flatMap((channel) =>
          channel.is_archived
            ? []
            : [
                {
                  id: channel.id,
                  name: channel.name ?? channel.id,
                  isPrivate: channel.is_private ?? false,
                  memberCount: channel.num_members ?? null,
                },
              ]
        );

        await setCachedSlackChannels(input.integrationId, channels);

        return { channels };
      }),
    update: baseProcedure
      .input(integrationInputSchema.and(updateSlackIntegrationBodySchema))
      .handler(async ({ context, input }) => {
        const auth = await assertOrganizationAccess({
          headers: context.headers,
          organizationId: input.organizationId,
        });
        await assertActiveSubscription(input.organizationId);

        const updated = await updateSlackIntegration({
          organizationId: input.organizationId,
          integrationId: input.integrationId,
          enabled: input.enabled,
          displayName: input.displayName,
          allowedChannelIds: input.allowedChannelIds,
          notificationChannelId: input.notificationChannelId,
        });
        if (!updated) {
          throw notFound("Slack integration not found");
        }

        if (input.enabled !== undefined) {
          trackServerEvent({
            event: POSTHOG_EVENTS.INTEGRATION_TOGGLED,
            headers: context.headers,
            userId: auth.user.id,
            organizationId: input.organizationId,
            properties: {
              provider: INTEGRATION_PROVIDERS.SLACK,
              integration_id: input.integrationId,
              enabled: input.enabled,
            },
          });
        }
        if (input.notificationChannelId !== undefined) {
          trackServerEvent({
            event: POSTHOG_EVENTS.SLACK_CHANNEL_CONFIGURED,
            headers: context.headers,
            userId: auth.user.id,
            organizationId: input.organizationId,
            properties: {
              integration_id: input.integrationId,
              kind: SLACK_CHANNEL_KINDS.NOTIFICATIONS,
              cleared: input.notificationChannelId === null,
            },
          });
        }
        if (input.allowedChannelIds !== undefined) {
          trackServerEvent({
            event: POSTHOG_EVENTS.SLACK_CHANNEL_CONFIGURED,
            headers: context.headers,
            userId: auth.user.id,
            organizationId: input.organizationId,
            properties: {
              integration_id: input.integrationId,
              kind: SLACK_CHANNEL_KINDS.ACCESS,
              channel_count: input.allowedChannelIds?.length ?? 0,
              cleared: input.allowedChannelIds === null,
            },
          });
        }

        return {
          id: updated.id,
          displayName: updated.displayName,
          enabled: updated.enabled,
          allowedChannelIds: updated.allowedChannelIds ?? null,
          notificationChannelId: updated.notificationChannelId ?? null,
        };
      }),
    delete: baseProcedure
      .input(integrationInputSchema)
      .handler(async ({ context, input }) => {
        const auth = await assertOrganizationAccess({
          headers: context.headers,
          organizationId: input.organizationId,
        });

        const deleted = await deleteSlackIntegration(
          input.organizationId,
          input.integrationId
        );
        if (!deleted) {
          throw notFound("Slack integration not found");
        }

        await clearCachedSlackChannels(input.integrationId);

        trackServerEvent({
          event: POSTHOG_EVENTS.INTEGRATION_DISCONNECTED,
          headers: context.headers,
          userId: auth.user.id,
          organizationId: input.organizationId,
          properties: {
            provider: INTEGRATION_PROVIDERS.SLACK,
            integration_id: input.integrationId,
          },
        });

        return { success: true };
      }),
  },
  granola: {
    list: baseProcedure
      .input(organizationIdInputSchema)
      .handler(async ({ context, input }) => {
        await assertOrganizationAccess({
          headers: context.headers,
          organizationId: input.organizationId,
        });

        const integrations = await getGranolaIntegrationsByOrganization(
          input.organizationId
        );

        return {
          integrations: integrations.map((integration) => ({
            id: integration.id,
            displayName: integration.displayName,
            enabled: integration.enabled,
            createdAt: integration.createdAt.toISOString(),
            workspaceName: integration.workspaceName,
            createdByUser: integration.createdByUser
              ? {
                  id: integration.createdByUser.id,
                  name: integration.createdByUser.name,
                  email: integration.createdByUser.email,
                  image: integration.createdByUser.image,
                }
              : undefined,
          })),
        };
      }),
    get: baseProcedure
      .input(integrationInputSchema)
      .handler(async ({ context, input }) => {
        await assertOrganizationAccess({
          headers: context.headers,
          organizationId: input.organizationId,
        });

        const integration = await getGranolaIntegrationById(
          input.integrationId
        );

        if (
          !integration ||
          integration.organizationId !== input.organizationId
        ) {
          throw notFound("Granola integration not found");
        }

        return {
          id: integration.id,
          displayName: integration.displayName,
          enabled: integration.enabled,
          createdAt: integration.createdAt.toISOString(),
          workspaceName: integration.workspaceName,
          createdByUser: integration.createdByUser
            ? {
                id: integration.createdByUser.id,
                name: integration.createdByUser.name,
                email: integration.createdByUser.email,
                image: integration.createdByUser.image,
              }
            : undefined,
        };
      }),
    create: baseProcedure
      .input(createGranolaIntegrationRequestSchema)
      .handler(async ({ context, input }) => {
        const { user } = await assertOrganizationAccess({
          headers: context.headers,
          organizationId: input.organizationId,
        });
        await assertActiveSubscription(input.organizationId);

        const { success } = await ratelimit.granolaConnection.limit(
          input.organizationId
        );
        if (!success) {
          throw tooManyRequests(
            "Too many connection attempts. Wait a minute and try again."
          );
        }

        const verification = await verifyGranolaApiKey(input.apiKey);
        if (!verification.valid) {
          trackServerEvent({
            event: POSTHOG_EVENTS.INTEGRATION_CONNECT_FAILED,
            headers: context.headers,
            userId: user.id,
            organizationId: input.organizationId,
            properties: {
              provider: INTEGRATION_PROVIDERS.GRANOLA,
              auth_kind: INTEGRATION_AUTH_KINDS.API_KEY,
              error_code: "invalid_api_key",
            },
          });
          throw badRequest(verification.error ?? "Invalid Granola API key");
        }

        const integration = await createGranolaIntegration({
          organizationId: input.organizationId,
          userId: user.id,
          displayName: input.displayName,
          apiKey: input.apiKey,
          workspaceName: input.workspaceName,
        });

        if (!integration) {
          throw internalServerError("Failed to create Granola integration");
        }

        await invalidateStandaloneChatIntegrations(input.organizationId);

        trackServerEvent({
          event: POSTHOG_EVENTS.INTEGRATION_CONNECTED,
          headers: context.headers,
          userId: user.id,
          organizationId: input.organizationId,
          properties: {
            provider: INTEGRATION_PROVIDERS.GRANOLA,
            auth_kind: INTEGRATION_AUTH_KINDS.API_KEY,
            integration_id: integration.id,
          },
        });

        return {
          id: integration.id,
          displayName: integration.displayName,
          enabled: integration.enabled,
          createdAt: integration.createdAt.toISOString(),
          workspaceName: integration.workspaceName,
        };
      }),
    update: baseProcedure
      .input(integrationInputSchema.and(updateGranolaIntegrationBodySchema))
      .handler(async ({ context, input }) => {
        const auth = await assertOrganizationAccess({
          headers: context.headers,
          organizationId: input.organizationId,
        });
        await assertActiveSubscription(input.organizationId);

        const existing = await getGranolaIntegrationById(input.integrationId);
        if (!existing || existing.organizationId !== input.organizationId) {
          throw notFound("Granola integration not found");
        }

        const updated = await updateGranolaIntegration(input.integrationId, {
          enabled: input.enabled,
          displayName: input.displayName,
          workspaceName: input.workspaceName,
        });

        if (!updated) {
          throw internalServerError("Failed to update Granola integration");
        }

        await invalidateStandaloneChatIntegrations(input.organizationId);

        if (input.enabled !== undefined && input.enabled !== existing.enabled) {
          trackServerEvent({
            event: POSTHOG_EVENTS.INTEGRATION_TOGGLED,
            headers: context.headers,
            userId: auth.user.id,
            organizationId: input.organizationId,
            properties: {
              provider: INTEGRATION_PROVIDERS.GRANOLA,
              integration_id: input.integrationId,
              enabled: input.enabled,
            },
          });
        }

        return {
          id: updated.id,
          displayName: updated.displayName,
          enabled: updated.enabled,
          createdAt: updated.createdAt.toISOString(),
          workspaceName: updated.workspaceName,
        };
      }),
    delete: baseProcedure
      .input(integrationInputSchema)
      .handler(async ({ context, input }) => {
        const auth = await assertOrganizationAccess({
          headers: context.headers,
          organizationId: input.organizationId,
        });

        const existing = await getGranolaIntegrationById(input.integrationId);
        if (!existing || existing.organizationId !== input.organizationId) {
          throw notFound("Granola integration not found");
        }

        await deleteGranolaIntegration(input.integrationId);

        await invalidateStandaloneChatIntegrations(input.organizationId);

        trackServerEvent({
          event: POSTHOG_EVENTS.INTEGRATION_DISCONNECTED,
          headers: context.headers,
          userId: auth.user.id,
          organizationId: input.organizationId,
          properties: {
            provider: INTEGRATION_PROVIDERS.GRANOLA,
            integration_id: input.integrationId,
          },
        });

        return { success: true };
      }),
  },
  mcp: {
    list: baseProcedure
      .input(organizationIdInputSchema)
      .handler(async ({ context, input }) => {
        await assertOrganizationAccess({
          headers: context.headers,
          organizationId: input.organizationId,
        });

        const [integrations, storeIntegrations] = await Promise.all([
          getMcpConnectionIntegrationsByOrganization(input.organizationId),
          listLiveMcpStoreIntegrations(),
        ]);
        const liveStoreIntegrationIds = new Set(
          storeIntegrations.map((integration) => integration.id)
        );
        const customIntegrations = integrations.filter(
          (integration) =>
            !integration.storeSourceIntegrationId ||
            !liveStoreIntegrationIds.has(integration.storeSourceIntegrationId)
        );
        return {
          servers: customIntegrations.map(serializeMcpServerIntegration),
          count: customIntegrations.length,
        };
      }),
    storeList: baseProcedure
      .input(organizationIdInputSchema)
      .handler(async ({ context, input }) => {
        await assertOrganizationAccess({
          headers: context.headers,
          organizationId: input.organizationId,
        });

        const [storeIntegrations, ownIntegrations] = await Promise.all([
          listLiveMcpStoreIntegrations(),
          getMcpConnectionIntegrationsByOrganization(input.organizationId),
        ]);

        const connectionsByStoreIntegrationId = new Map(
          ownIntegrations.flatMap((integration) =>
            integration.storeSourceIntegrationId
              ? [[integration.storeSourceIntegrationId, integration] as const]
              : []
          )
        );

        return {
          integrations: storeIntegrations.map((integration) => {
            const connection = connectionsByStoreIntegrationId.get(
              integration.id
            );
            return {
              id: integration.id,
              slug: integration.slug,
              name: integration.name,
              url: integration.url,
              description: integration.description,
              author: integration.author,
              websiteUrl: integration.websiteUrl,
              brandColor: integration.brandColor,
              logoLightUrl: integration.logoLightUrl,
              logoDarkUrl: integration.logoDarkUrl,
              authType: integration.authType,
              indexedToolCount: integration.indexedToolCount,
              connected: Boolean(connection),
              connection: connection
                ? serializeMcpServerIntegration(connection)
                : null,
            };
          }),
        };
      }),
    create: baseProcedure
      .input(createMcpServerRequestSchema)
      .handler(async ({ context, input }) => {
        const auth = await assertOrganizationAccess({
          headers: context.headers,
          organizationId: input.organizationId,
        });
        await assertMcpConnectionRateLimit(input.organizationId);
        await assertActiveSubscription(input.organizationId);

        const storeIntegration = input.storeIntegrationId
          ? await getLiveMcpStoreIntegrationById(input.storeIntegrationId)
          : null;
        if (input.storeIntegrationId && !storeIntegration) {
          throw notFound("MCP store integration not found");
        }
        if (
          storeIntegration &&
          storeIntegration.authType !== "none" &&
          storeIntegration.authType !== "headers"
        ) {
          throw badRequest("This MCP store integration requires OAuth");
        }
        if (storeIntegration && input.authType !== storeIntegration.authType) {
          throw badRequest("Use the approved authentication method");
        }

        try {
          const integration = await createMcpConnectionIntegration({
            authType: input.authType,
            organizationId: input.organizationId,
            userId: auth.user.id,
            name: storeIntegration?.name ?? input.name,
            url: storeIntegration?.url ?? input.url,
            description:
              storeIntegration?.description ?? input.description ?? null,
            author: storeIntegration?.author ?? null,
            websiteUrl: storeIntegration?.websiteUrl ?? null,
            brandColor: storeIntegration?.brandColor ?? null,
            logoLightUrl: storeIntegration?.logoLightUrl ?? null,
            logoDarkUrl: storeIntegration?.logoDarkUrl ?? null,
            bannerUrl: storeIntegration?.bannerUrl ?? null,
            storeSourceIntegrationId: storeIntegration?.id ?? null,
            headers: input.headers,
          });

          trackServerEvent({
            event: POSTHOG_EVENTS.INTEGRATION_CONNECTED,
            headers: context.headers,
            userId: auth.user.id,
            organizationId: input.organizationId,
            properties: {
              provider: storeIntegration
                ? INTEGRATION_PROVIDERS.MCP_STORE
                : INTEGRATION_PROVIDERS.MCP,
              auth_kind: toMcpIntegrationAuthKind(input.authType),
              integration_id: integration.id,
              store_integration_id: storeIntegration?.id ?? null,
            },
          });

          return serializeMcpServerIntegration(integration);
        } catch (error) {
          trackServerEvent({
            event: POSTHOG_EVENTS.INTEGRATION_CONNECT_FAILED,
            headers: context.headers,
            userId: auth.user.id,
            organizationId: input.organizationId,
            properties: {
              provider: storeIntegration
                ? INTEGRATION_PROVIDERS.MCP_STORE
                : INTEGRATION_PROVIDERS.MCP,
              auth_kind: toMcpIntegrationAuthKind(input.authType),
              error_code: isUniqueConstraintError(error)
                ? "name_conflict"
                : "create_failed",
            },
          });
          if (isUniqueConstraintError(error)) {
            throw conflict("An MCP server with this name already exists");
          }
          if (error instanceof PublicUrlValidationError) {
            throw badRequest(error.message);
          }
          if (error instanceof McpStoreListingUnavailableError) {
            throw notFound(error.message);
          }

          throw internalServerError("Failed to create MCP server", error);
        }
      }),
    update: baseProcedure
      .input(mcpServerInputSchema.and(updateMcpServerBodySchema))
      .handler(async ({ context, input }) => {
        const auth = await assertOrganizationAccess({
          headers: context.headers,
          organizationId: input.organizationId,
        });
        await assertActiveSubscription(input.organizationId);

        const existing = await getMcpConnectionIntegration({
          integrationId: input.serverId,
          organizationId: input.organizationId,
        });
        if (!existing || existing.organizationId !== input.organizationId) {
          throw notFound("MCP server not found");
        }
        let updated:
          | Awaited<ReturnType<typeof updateMcpConnectionIntegration>>
          | undefined;
        try {
          updated = await updateMcpConnectionIntegration(
            {
              integrationId: input.serverId,
              organizationId: input.organizationId,
            },
            {
              authType: input.authType,
              name: input.name,
              url: input.url,
              description: input.description,
              headers: input.headers,
              enabled: input.enabled,
            }
          );
        } catch (error) {
          if (isUniqueConstraintError(error)) {
            throw conflict("An MCP server with this name already exists");
          }
          if (error instanceof PublicUrlValidationError) {
            throw badRequest(error.message);
          }

          throw internalServerError("Failed to update MCP server", error);
        }

        if (!updated) {
          throw notFound("MCP server not found");
        }

        if (input.enabled !== undefined && input.enabled !== existing.enabled) {
          trackServerEvent({
            event: POSTHOG_EVENTS.INTEGRATION_TOGGLED,
            headers: context.headers,
            userId: auth.user.id,
            organizationId: input.organizationId,
            properties: {
              provider: existing.storeSourceIntegrationId
                ? INTEGRATION_PROVIDERS.MCP_STORE
                : INTEGRATION_PROVIDERS.MCP,
              integration_id: input.serverId,
              enabled: input.enabled,
            },
          });
        }

        return serializeMcpServerIntegration(updated);
      }),
    beginOAuth: baseProcedure
      .input(beginMcpOAuthRequestSchema)
      .handler(async ({ context, input }) => {
        const access = await assertOrganizationAccess({
          headers: context.headers,
          organizationId: input.organizationId,
        });
        await assertMcpConnectionRateLimit(input.organizationId);
        await assertActiveSubscription(input.organizationId);

        const baseUrl = process.env.APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL;
        if (!baseUrl) {
          throw internalServerError("MCP OAuth is not configured");
        }

        const storeIntegration = input.storeIntegrationId
          ? await getLiveMcpStoreIntegrationById(input.storeIntegrationId)
          : null;
        if (input.storeIntegrationId && !storeIntegration) {
          throw notFound("MCP store integration not found");
        }
        if (storeIntegration && storeIntegration.authType !== "oauth") {
          throw badRequest("This MCP store integration does not use OAuth");
        }

        try {
          return await Effect.runPromise(
            beginMcpOAuthAuthorization({
              organizationId: input.organizationId,
              userId: access.user.id,
              name: storeIntegration?.name ?? input.name,
              url: storeIntegration?.url ?? input.url,
              description: storeIntegration?.description ?? input.description,
              storeSourceIntegrationId: storeIntegration?.id,
              callbackPath: input.callbackPath,
              redirectUrl: `${baseUrl}${MCP_OAUTH_CALLBACK_PATH}`,
              resourceType: "connection",
            })
          );
        } catch (error) {
          if (
            error instanceof McpOAuthAuthorizationError ||
            error instanceof PublicUrlValidationError
          ) {
            throw badRequest(error.message);
          }
          if (isUniqueConstraintError(error)) {
            throw conflict("An MCP server with this name already exists");
          }
          if (error instanceof McpOAuthNameConflictError) {
            throw conflict(error.message);
          }
          throw internalServerError("Failed to start MCP OAuth", error);
        }
      }),
    reauthorizeOAuth: baseProcedure
      .input(reauthorizeMcpOAuthRequestSchema)
      .handler(async ({ context, input }) => {
        const access = await assertOrganizationAccess({
          headers: context.headers,
          organizationId: input.organizationId,
        });
        await assertMcpConnectionRateLimit(input.organizationId);
        await assertActiveSubscription(input.organizationId);

        const existing = await getMcpConnectionIntegration({
          integrationId: input.serverId,
          organizationId: input.organizationId,
        });
        if (
          !existing ||
          existing.organizationId !== input.organizationId ||
          existing.authType !== "oauth"
        ) {
          throw notFound("OAuth MCP server not found");
        }
        const baseUrl = process.env.APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL;
        if (!baseUrl) {
          throw internalServerError("MCP OAuth is not configured");
        }

        try {
          return await Effect.runPromise(
            beginMcpOAuthAuthorization({
              organizationId: input.organizationId,
              userId: access.user.id,
              serverIntegrationId: existing.id,
              name: existing.name,
              url: existing.url,
              description: existing.description,
              callbackPath: input.callbackPath,
              redirectUrl: `${baseUrl}${MCP_OAUTH_CALLBACK_PATH}`,
              resourceType: "connection",
            })
          );
        } catch (error) {
          if (
            error instanceof McpOAuthAuthorizationError ||
            error instanceof PublicUrlValidationError
          ) {
            throw badRequest(error.message);
          }
          throw internalServerError("Failed to restart MCP OAuth", error);
        }
      }),
    delete: baseProcedure
      .input(mcpServerInputSchema)
      .handler(async ({ context, input }) => {
        const auth = await assertOrganizationAccess({
          headers: context.headers,
          organizationId: input.organizationId,
        });

        const existing = await getMcpConnectionIntegration({
          integrationId: input.serverId,
          organizationId: input.organizationId,
        });
        if (!existing || existing.organizationId !== input.organizationId) {
          throw notFound("MCP server not found");
        }
        const deleted = await deleteMcpConnectionIntegration({
          integrationId: input.serverId,
          organizationId: input.organizationId,
        });
        if (!deleted) {
          throw notFound("MCP connection not found");
        }

        trackServerEvent({
          event: POSTHOG_EVENTS.INTEGRATION_DISCONNECTED,
          headers: context.headers,
          userId: auth.user.id,
          organizationId: input.organizationId,
          properties: {
            provider: existing.storeSourceIntegrationId
              ? INTEGRATION_PROVIDERS.MCP_STORE
              : INTEGRATION_PROVIDERS.MCP,
            integration_id: input.serverId,
            auth_kind: toMcpIntegrationAuthKind(existing.authType),
          },
        });

        return { success: true };
      }),
    refreshTools: baseProcedure
      .input(mcpServerInputSchema)
      .handler(async ({ context, input }) => {
        const auth = await assertOrganizationAccess({
          headers: context.headers,
          organizationId: input.organizationId,
        });
        await assertMcpConnectionRateLimit(input.organizationId);
        await assertActiveSubscription(input.organizationId);

        const existing = await getMcpConnectionIntegration({
          integrationId: input.serverId,
          organizationId: input.organizationId,
        });
        if (!existing || existing.organizationId !== input.organizationId) {
          throw notFound("MCP server not found");
        }
        try {
          const result = await refreshMcpToolIndexForIntegration({
            organizationId: input.organizationId,
            integrationId: input.serverId,
          });
          const refreshed = await getMcpConnectionIntegration({
            integrationId: input.serverId,
            organizationId: input.organizationId,
          });
          trackServerEvent({
            event: POSTHOG_EVENTS.MCP_TOOLS_REFRESHED,
            headers: context.headers,
            userId: auth.user.id,
            organizationId: input.organizationId,
            properties: {
              integration_id: input.serverId,
              tool_count: result.indexedToolCount,
            },
          });
          return {
            success: true,
            indexedToolCount: result.indexedToolCount,
            server: refreshed
              ? serializeMcpServerIntegration(refreshed)
              : undefined,
          };
        } catch (error) {
          if (error instanceof PublicUrlValidationError) {
            throw badRequest(error.message);
          }

          throw internalServerError("Failed to refresh MCP tools", error);
        }
      }),
    test: baseProcedure
      .input(testMcpServerRequestSchema)
      .handler(async ({ context, input }) => {
        const auth = await assertOrganizationAccess({
          headers: context.headers,
          organizationId: input.organizationId,
        });
        await assertMcpConnectionRateLimit(input.organizationId);
        await assertActiveSubscription(input.organizationId);

        const result = await testMcpServerConnection({
          url: input.url,
          headers: input.headers,
        });

        trackServerEvent({
          event: POSTHOG_EVENTS.MCP_CONNECTION_TESTED,
          headers: context.headers,
          userId: auth.user.id,
          organizationId: input.organizationId,
          properties: {
            outcome: result.success
              ? MCP_CONNECTION_TEST_OUTCOMES.SUCCESS
              : MCP_CONNECTION_TEST_OUTCOMES.FAILED,
            tool_count: result.toolCount,
            has_headers: Object.keys(input.headers ?? {}).length > 0,
          },
        });

        return result;
      }),
  },
};
