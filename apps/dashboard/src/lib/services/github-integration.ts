import { and, eq } from "drizzle-orm";
import { customAlphabet } from "nanoid";
import { decryptToken, encryptToken } from "@/lib/crypto/token-encryption";
import { db } from "@notra/db/drizzle";
import {
  githubIntegrations,
  githubRepositories,
  members,
  repositoryOutputs,
} from "@notra/db/schema";
import type { OutputContentType } from "@/utils/schemas/integrations";
import { createOctokit } from "../octokit";

const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 16);

interface CreateGitHubIntegrationParams {
  organizationId: string;
  userId: string;
  token: string | null;
  displayName: string;
  owner: string;
  repo: string;
}

interface AddRepositoryParams {
  integrationId: string;
  owner: string;
  repo: string;
  outputs?: Array<{
    type: OutputContentType;
    enabled?: boolean;
    config?: Record<string, unknown>;
  }>;
}

interface ConfigureOutputParams {
  repositoryId: string;
  outputType: OutputContentType;
  enabled: boolean;
  config?: Record<string, unknown>;
}

export async function validateUserOrgAccess(
  userId: string,
  organizationId: string,
): Promise<boolean> {
  const member = await db.query.members.findFirst({
    where: and(
      eq(members.userId, userId),
      eq(members.organizationId, organizationId),
    ),
  });
  return !!member;
}

export async function createGitHubIntegration(
  params: CreateGitHubIntegrationParams,
) {
  const { organizationId, userId, token, displayName, owner, repo } = params;

  const hasAccess = await validateUserOrgAccess(userId, organizationId);
  if (!hasAccess) {
    throw new Error("User does not have access to this organization");
  }

  let encryptedToken: string | null = null;

  if (token) {
    const octokit = createOctokit(token);

    try {
      await octokit.request("GET /user");
    } catch (_error) {
      throw new Error("Invalid GitHub token");
    }

    encryptedToken = encryptToken(token);
  } else {
    const octokit = createOctokit();

    try {
      await octokit.request("GET /repos/{owner}/{repo}", {
        owner,
        repo,
        headers: {
          "X-GitHub-Api-Version": "2022-11-28",
        },
      });
    } catch (_error) {
      throw new Error(
        "Unable to access repository. It may be private and require a Personal Access Token.",
      );
    }
  }

  const [integration] = await db
    .insert(githubIntegrations)
    .values({
      id: nanoid(),
      organizationId,
      createdByUserId: userId,
      encryptedToken,
      displayName,
      enabled: true,
    })
    .returning();

  if (!integration) {
    throw new Error("Failed to create GitHub integration");
  }

  const [repository] = await db
    .insert(githubRepositories)
    .values({
      id: nanoid(),
      integrationId: integration.id,
      owner,
      repo,
      enabled: true,
    })
    .returning();

  if (!repository) {
    throw new Error("Failed to create GitHub repository entry");
  }

  await db.insert(repositoryOutputs).values([
    {
      id: nanoid(),
      repositoryId: repository.id,
      outputType: "changelog",
      enabled: true,
      config: null,
    },
    {
      id: nanoid(),
      repositoryId: repository.id,
      outputType: "blog_post",
      enabled: false,
      config: null,
    },
    {
      id: nanoid(),
      repositoryId: repository.id,
      outputType: "twitter_post",
      enabled: false,
      config: null,
    },
  ]);

  const fullIntegration = await getGitHubIntegrationById(integration.id);
  if (!fullIntegration) {
    throw new Error("Failed to retrieve created integration");
  }

  return fullIntegration;
}

export function getGitHubIntegrationsByOrganization(organizationId: string) {
  return db.query.githubIntegrations.findMany({
    where: eq(githubIntegrations.organizationId, organizationId),
    with: {
      createdByUser: {
        columns: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      repositories: {
        with: {
          outputs: true,
        },
      },
    },
  });
}

export function getGitHubIntegrationById(integrationId: string) {
  return db.query.githubIntegrations.findFirst({
    where: eq(githubIntegrations.id, integrationId),
    with: {
      organization: true,
      createdByUser: {
        columns: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      repositories: {
        with: {
          outputs: true,
        },
      },
    },
  });
}

export async function getDecryptedToken(
  integrationId: string,
  userId: string,
): Promise<string | null> {
  const integration = await getGitHubIntegrationById(integrationId);

  if (!integration) {
    throw new Error("Integration not found");
  }

  const hasAccess = await validateUserOrgAccess(
    userId,
    integration.organizationId,
  );

  if (!hasAccess) {
    throw new Error("User does not have access to this integration");
  }

  if (!integration.encryptedToken) {
    return null;
  }

  return decryptToken(integration.encryptedToken);
}

export async function addRepository(
  params: AddRepositoryParams & { userId: string },
) {
  const { integrationId, owner, repo, outputs = [], userId } = params;

  const integration = await getGitHubIntegrationById(integrationId);
  if (!integration) {
    throw new Error("Integration not found");
  }

  const hasAccess = await validateUserOrgAccess(
    userId,
    integration.organizationId,
  );

  if (!hasAccess) {
    throw new Error("User does not have access to this integration");
  }

  const [repository] = await db
    .insert(githubRepositories)
    .values({
      id: nanoid(),
      integrationId,
      owner,
      repo,
      enabled: true,
    })
    .returning();

  if (!repository) {
    throw new Error("Failed to create GitHub repository entry");
  }

  if (outputs.length > 0) {
    await db.insert(repositoryOutputs).values(
      outputs.map((output) => ({
        id: nanoid(),
        repositoryId: repository.id,
        outputType: output.type,
        enabled: output.enabled ?? true,
        config: output.config,
      })),
    );
  }

  return repository;
}

export function getRepositoryById(repositoryId: string) {
  return db.query.githubRepositories.findFirst({
    where: eq(githubRepositories.id, repositoryId),
    with: {
      integration: true,
      outputs: true,
    },
  });
}

export function getOutputById(outputId: string) {
  return db.query.repositoryOutputs.findFirst({
    where: eq(repositoryOutputs.id, outputId),
    with: {
      repository: {
        with: {
          integration: true,
        },
      },
    },
  });
}

export async function configureOutput(params: ConfigureOutputParams) {
  const { repositoryId, outputType, enabled, config } = params;

  const existing = await db.query.repositoryOutputs.findFirst({
    where: and(
      eq(repositoryOutputs.repositoryId, repositoryId),
      eq(repositoryOutputs.outputType, outputType),
    ),
  });

  if (existing) {
    const [updated] = await db
      .update(repositoryOutputs)
      .set({
        enabled,
        config,
      })
      .where(eq(repositoryOutputs.id, existing.id))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(repositoryOutputs)
    .values({
      id: nanoid(),
      repositoryId,
      outputType,
      enabled,
      config,
    })
    .returning();

  return created;
}

export async function toggleGitHubIntegration(
  integrationId: string,
  enabled: boolean,
) {
  const [updated] = await db
    .update(githubIntegrations)
    .set({ enabled })
    .where(eq(githubIntegrations.id, integrationId))
    .returning();

  return updated;
}

export async function updateGitHubIntegration(
  integrationId: string,
  data: { enabled?: boolean; displayName?: string },
) {
  const [updated] = await db
    .update(githubIntegrations)
    .set(data)
    .where(eq(githubIntegrations.id, integrationId))
    .returning();

  return updated;
}

export async function toggleRepository(repositoryId: string, enabled: boolean) {
  const [updated] = await db
    .update(githubRepositories)
    .set({ enabled })
    .where(eq(githubRepositories.id, repositoryId))
    .returning();

  return updated;
}

export async function toggleOutput(outputId: string, enabled: boolean) {
  const [updated] = await db
    .update(repositoryOutputs)
    .set({ enabled })
    .where(eq(repositoryOutputs.id, outputId))
    .returning();

  return updated;
}

export async function deleteGitHubIntegration(integrationId: string) {
  await db
    .delete(githubIntegrations)
    .where(eq(githubIntegrations.id, integrationId));
}

export async function deleteRepository(repositoryId: string) {
  await db
    .delete(githubRepositories)
    .where(eq(githubRepositories.id, repositoryId));
}

export async function listAvailableRepositories(
  integrationId: string,
  userId: string,
) {
  const token = await getDecryptedToken(integrationId, userId);

  if (!token) {
    return [];
  }

  const octokit = createOctokit(token);

  const { data } = await octokit.request("GET /user/repos", {
    per_page: 100,
    sort: "updated",
    headers: {
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  return data.map((repo) => ({
    owner: repo.owner.login,
    name: repo.name,
    fullName: repo.full_name,
    private: repo.private,
    description: repo.description,
    url: repo.html_url,
  }));
}

export async function getTokenForRepository(
  owner: string,
  repo: string,
): Promise<string | undefined> {
  const repository = await db.query.githubRepositories.findFirst({
    where: and(
      eq(githubRepositories.owner, owner),
      eq(githubRepositories.repo, repo),
    ),
    with: {
      integration: true,
    },
  });

  if (
    !(repository?.integration?.encryptedToken && repository.integration.enabled)
  ) {
    return undefined;
  }

  return decryptToken(repository.integration.encryptedToken);
}

export async function getTokenForIntegrationId(
  integrationId: string,
): Promise<string | null> {
  const integration = await db.query.githubIntegrations.findFirst({
    where: eq(githubIntegrations.id, integrationId),
  });

  if (!integration?.encryptedToken) {
    return null;
  }

  return decryptToken(integration.encryptedToken);
}
