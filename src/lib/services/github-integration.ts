import { ConvexHttpClient } from "convex/browser";
import { decryptToken, encryptToken } from "@/lib/crypto/token-encryption";
import type { OutputContentType } from "@/utils/schemas/integrations";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { createOctokit } from "../octokit";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!CONVEX_URL) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is required");
}
const convex = new ConvexHttpClient(CONVEX_URL);

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

export async function validateUserOrgAccess(
  userId: string,
  organizationId: string
): Promise<boolean> {
  const membership = await convex.query(api.auth.getMemberByUserAndOrg, {
    userId,
    organizationId,
  });
  return !!membership;
}

export async function createGitHubIntegration(
  params: CreateGitHubIntegrationParams
) {
  const { organizationId, userId, token, owner, repo } = params;

  const hasAccess = await validateUserOrgAccess(userId, organizationId);
  if (!hasAccess) {
    throw new Error("User does not have access to this organization");
  }

  let encryptedToken: string | undefined;

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
        "Unable to access repository. It may be private and require a Personal Access Token."
      );
    }
  }

  const integrationId = await convex.mutation(api.integrations.create, {
    organizationId,
    owner,
    repo,
    token: encryptedToken,
  });

  return getGitHubIntegrationById(integrationId);
}

export async function getGitHubIntegrationsByOrganization(
  organizationId: string
) {
  const result = await convex.query(api.integrations.list, { organizationId });
  return result?.integrations || [];
}

export async function getGitHubIntegrationById(integrationId: string) {
  return await convex.query(api.integrations.get, {
    integrationId: integrationId as Id<"githubIntegrations">,
  });
}

export async function getDecryptedToken(
  integrationId: string,
  userId: string
): Promise<string | null> {
  const integration = await getGitHubIntegrationById(integrationId);

  if (!integration) {
    throw new Error("Integration not found");
  }

  const hasAccess = await validateUserOrgAccess(
    userId,
    integration.organizationId
  );

  if (!hasAccess) {
    throw new Error("User does not have access to this integration");
  }

  const token = await convex.query(api.integrations.getIntegrationToken, {
    integrationId: integrationId as Id<"githubIntegrations">,
  });

  if (!token) {
    return null;
  }

  return decryptToken(token);
}

export async function addRepository(
  params: AddRepositoryParams & { userId: string }
) {
  const { integrationId, owner, repo, outputs = [], userId } = params;

  const integration = await getGitHubIntegrationById(integrationId);
  if (!integration) {
    throw new Error("Integration not found");
  }

  const hasAccess = await validateUserOrgAccess(
    userId,
    integration.organizationId
  );

  if (!hasAccess) {
    throw new Error("User does not have access to this integration");
  }

  const repositoryId = await convex.mutation(api.repositories.add, {
    integrationId: integrationId as Id<"githubIntegrations">,
    owner,
    repo,
    outputs: outputs.map((o) => ({
      type: o.type,
      enabled: o.enabled ?? true,
    })),
  });

  return { id: repositoryId, owner, repo };
}

export async function getRepositoryById(repositoryId: string) {
  return await convex.query(api.repositories.get, {
    repositoryId: repositoryId as Id<"githubRepositories">,
  });
}

export async function toggleGitHubIntegration(
  integrationId: string,
  enabled: boolean
) {
  await convex.mutation(api.integrations.update, {
    integrationId: integrationId as Id<"githubIntegrations">,
    enabled,
  });
}

export async function updateGitHubIntegration(
  integrationId: string,
  data: { enabled?: boolean; displayName?: string }
) {
  await convex.mutation(api.integrations.update, {
    integrationId: integrationId as Id<"githubIntegrations">,
    ...data,
  });
}

export async function toggleRepository(repositoryId: string, enabled: boolean) {
  await convex.mutation(api.repositories.update, {
    repositoryId: repositoryId as Id<"githubRepositories">,
    enabled,
  });
}

export async function toggleOutput(outputId: string, enabled: boolean) {
  await convex.mutation(api.outputs.toggle, {
    outputId: outputId as Id<"repositoryOutputs">,
    enabled,
  });
}

export async function deleteGitHubIntegration(integrationId: string) {
  await convex.mutation(api.integrations.remove, {
    integrationId: integrationId as Id<"githubIntegrations">,
  });
}

export async function deleteRepository(repositoryId: string) {
  await convex.mutation(api.repositories.remove, {
    repositoryId: repositoryId as Id<"githubRepositories">,
  });
}

export async function listAvailableRepositories(
  integrationId: string,
  userId: string
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
  repo: string
): Promise<string | undefined> {
  const repository = await convex.query(api.repositories.getByOwnerRepo, {
    owner,
    repo,
  });

  if (!(repository?.encryptedToken && repository.integrationEnabled)) {
    return undefined;
  }

  return decryptToken(repository.encryptedToken);
}

export async function getTokenForIntegrationId(
  integrationId: string
): Promise<string | null> {
  const token = await convex.query(api.integrations.getIntegrationToken, {
    integrationId: integrationId as Id<"githubIntegrations">,
  });

  if (!token) {
    return null;
  }

  return decryptToken(token);
}
