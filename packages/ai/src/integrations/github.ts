import crypto from "node:crypto";

import { db } from "@notra/db/drizzle";
import {
  githubAppInstallations,
  githubIntegrations,
  repositoryOutputs,
  socialConnections,
} from "@notra/db/schema";
import { and, eq, inArray, sql } from "drizzle-orm";
import { Effect } from "effect";
import { customAlphabet } from "nanoid";

import { GITHUB_APP_REPOSITORIES_CACHE_TTL_SECONDS } from "../constants/github-app";
import { decryptToken, encryptToken } from "../crypto/token-encryption";
import {
  decodeCachedGitHubAppRepositories,
  decodeGitHubAppInstallationResponse,
  decodeGitHubAppRepositoriesResponse,
  type GitHubAppRepository,
  type GitHubAppRepositoryResponse,
} from "../schemas/github-app";
import {
  GitHubAppConfigurationError,
  GitHubCredentialDecryptionError,
  GitHubPersistenceError,
  GitHubRequestError,
  GitHubRepositoryCacheError,
  GitHubResponseError,
} from "../schemas/github-operations";
import type {
  GitHubInstallationReference,
  GitHubCredentialDependencies,
  SelectGitHubRepositoriesParams,
} from "../types/github-operations";
import type {
  AddRepositoryParams,
  ConfigureOutputParams,
  CreateGitHubIntegrationParams,
  ErrorWithStatus,
  GitHubOrgMembershipCheck,
  RepositoryOutputType,
  SetRepositoryOutputDirectoryParams,
  ValidateRepositoryBranchExistsParams,
  WebhookConfig,
} from "../types/integrations";
import type { GitHubToolRepositoryContext } from "../types/tools";
import { createOctokit } from "../utils/octokit";
import { hasOrganizationAccess } from "../utils/organization-access";
import { redis } from "../utils/redis";
import { runGitHubEffect } from "../utils/run-github-effect";
import { saveGitHubRepositorySelection } from "../utils/save-github-repository-selection";
import { getConfiguredAppUrl } from "../utils/url";
import { selectGitHubRepositories } from "./github-selection";
import { resolveGitHubCredentials, resolveGitHubToken } from "./github-token";

const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 16);
const GITHUB_SCOPE_SEPARATOR_PATTERN = /[,\s]+/;

export class GitHubBranchNotFoundError extends Error {
  constructor(owner: string, repo: string, branch: string) {
    super(`Branch "${branch}" does not exist in ${owner}/${repo}`);
    this.name = "GitHubBranchNotFoundError";
  }
}

export class GitHubAppNotConfiguredError extends Error {
  constructor() {
    super("GitHub App is not configured");
    this.name = "GitHubAppNotConfiguredError";
  }
}

export class GitHubAccountRequiredError extends Error {
  constructor() {
    super("Connect your GitHub account before installing the GitHub App");
    this.name = "GitHubAccountRequiredError";
  }
}

export class GitHubReauthorizationRequiredError extends Error {
  constructor() {
    super("Reconnect GitHub to authorize organization access");
    this.name = "GitHubReauthorizationRequiredError";
  }
}

export class GitHubInstallationAccessDeniedError extends Error {
  constructor() {
    super("You must administer the GitHub account that owns this installation");
    this.name = "GitHubInstallationAccessDeniedError";
  }
}

function hasGitHubScope(scope: string | null, requiredScope: string) {
  return Boolean(
    scope
      ?.split(GITHUB_SCOPE_SEPARATOR_PATTERN)
      .filter(Boolean)
      .includes(requiredScope)
  );
}

function getErrorStatus(error: unknown) {
  if (
    typeof error !== "object" ||
    error === null ||
    !("status" in error) ||
    typeof error.status !== "number"
  ) {
    return null;
  }
  return error.status;
}

function generateWebhookSecret(): string {
  return crypto.randomBytes(32).toString("hex");
}

function base64url(value: string) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function readGitHubAppConfig() {
  return {
    appId: process.env.GITHUB_APP_ID,
    privateKey: process.env.GITHUB_APP_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    slug: process.env.GITHUB_APP_SLUG ?? process.env.GITHUB_APP_NAME,
  };
}

export function isGitHubAppConfigured() {
  const { appId, privateKey, slug } = readGitHubAppConfig();
  return Boolean(appId && privateKey && slug);
}

function getGitHubAppConfig() {
  const { appId, privateKey, slug } = readGitHubAppConfig();

  if (!(appId && privateKey && slug)) {
    throw new GitHubAppNotConfiguredError();
  }

  return { appId, privateKey, slug };
}

function createGitHubAppJwt() {
  const { appId, privateKey } = getGitHubAppConfig();
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64url(
    JSON.stringify({
      iat: now - 60,
      exp: now + 9 * 60,
      iss: appId,
    })
  );
  const signature = crypto
    .createSign("RSA-SHA256")
    .update(`${header}.${payload}`)
    .sign(privateKey, "base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${header}.${payload}.${signature}`;
}

async function createGitHubAppInstallationToken(installationId: string) {
  return runGitHubEffect(
    createGitHubAppInstallationTokenEffect(installationId).pipe(
      Effect.mapError((error) => error.cause)
    )
  );
}

const createGitHubAppInstallationTokenEffect = Effect.fn(
  "GitHub.createInstallationToken"
)(function* (installationId: string) {
  const jwt = yield* Effect.try({
    try: createGitHubAppJwt,
    catch: (cause) => new GitHubAppConfigurationError({ cause }),
  });
  const octokit = createOctokit(jwt);
  const { data } = yield* Effect.tryPromise({
    try: () =>
      octokit.request(
        "POST /app/installations/{installation_id}/access_tokens",
        {
          installation_id: Number(installationId),
          headers: { "X-GitHub-Api-Version": "2022-11-28" },
        }
      ),
    catch: (cause) =>
      getErrorStatus(cause) === 401
        ? new GitHubAppConfigurationError({ cause })
        : new GitHubRequestError({
            operation: "createInstallationToken",
            status: getErrorStatus(cause) ?? undefined,
            cause,
          }),
  });
  return data.token;
});

async function getGitHubAppInstallation(installationId: string) {
  const octokit = createOctokit(createGitHubAppJwt());
  const { data } = await octokit.request(
    "GET /app/installations/{installation_id}",
    {
      installation_id: Number(installationId),
      headers: {
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  );

  return Effect.runPromise(decodeGitHubAppInstallationResponse(data));
}

async function getInstallationOrgMembership(params: {
  installationId: string;
  org: string;
  username: string;
}): Promise<GitHubOrgMembershipCheck> {
  let installationToken: string;
  try {
    installationToken = await createGitHubAppInstallationToken(
      params.installationId
    );
  } catch (error) {
    console.error(
      "Failed to create GitHub App installation token for org membership check:",
      error instanceof Error ? error.message : String(error)
    );
    return { verified: false };
  }

  const octokit = createOctokit(installationToken);
  try {
    const { data: membership } = await octokit.request(
      "GET /orgs/{org}/memberships/{username}",
      {
        org: params.org,
        username: params.username,
        headers: {
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );

    return {
      verified: true,
      isAdmin: membership.state === "active" && membership.role === "admin",
    };
  } catch (error) {
    if (getErrorStatus(error) === 404) {
      return { verified: true, isAdmin: false };
    }
    if (getErrorStatus(error) !== 403) {
      console.error(
        "GitHub org membership check via installation token failed:",
        error instanceof Error ? error.message : String(error)
      );
    }
    return { verified: false };
  }
}

async function assertGitHubInstallationAdmin(params: {
  userId: string;
  installationId: string;
  installationAccount: {
    id: number;
    login: string;
    type: "User" | "Organization";
  };
}) {
  const githubAccount = await db.query.socialConnections.findFirst({
    where: and(
      eq(socialConnections.userId, params.userId),
      eq(socialConnections.provider, "github")
    ),
    columns: {
      providerAccountId: true,
      accessToken: true,
      scope: true,
    },
  });

  if (!githubAccount?.accessToken) {
    throw new GitHubAccountRequiredError();
  }

  const octokit = createOctokit(githubAccount.accessToken);
  const userResponse = await octokit
    .request("GET /user", {
      headers: {
        "X-GitHub-Api-Version": "2022-11-28",
      },
    })
    .catch((error: unknown) => {
      if (getErrorStatus(error) === 401) {
        throw new GitHubReauthorizationRequiredError();
      }
      throw error;
    });
  const githubUser = userResponse.data;

  if (String(githubUser.id) !== githubAccount.providerAccountId) {
    throw new GitHubInstallationAccessDeniedError();
  }

  if (params.installationAccount.type === "User") {
    if (
      githubAccount.providerAccountId !== String(params.installationAccount.id)
    ) {
      throw new GitHubInstallationAccessDeniedError();
    }
    return;
  }

  const installationMembership = await getInstallationOrgMembership({
    installationId: params.installationId,
    org: params.installationAccount.login,
    username: githubUser.login,
  });

  if (installationMembership.verified) {
    if (!installationMembership.isAdmin) {
      throw new GitHubInstallationAccessDeniedError();
    }
    return;
  }

  const tokenScopes =
    userResponse.headers["x-oauth-scopes"] ?? githubAccount.scope;

  if (!hasGitHubScope(tokenScopes, "read:org")) {
    throw new GitHubReauthorizationRequiredError();
  }

  try {
    const { data: membership } = await octokit.request(
      "GET /user/memberships/orgs/{org}",
      {
        org: params.installationAccount.login,
        headers: {
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );

    if (membership.state !== "active" || membership.role !== "admin") {
      throw new GitHubInstallationAccessDeniedError();
    }
  } catch (error) {
    const status = getErrorStatus(error);
    if (error instanceof GitHubInstallationAccessDeniedError) {
      throw error;
    }
    if (status === 401 || status === 403) {
      throw new GitHubReauthorizationRequiredError();
    }
    throw new GitHubInstallationAccessDeniedError();
  }
}

export async function isGitHubAccountConnectionRequired(userId: string) {
  const githubAccount = await db.query.socialConnections.findFirst({
    where: and(
      eq(socialConnections.userId, userId),
      eq(socialConnections.provider, "github")
    ),
    columns: {
      accessToken: true,
    },
  });

  return !githubAccount?.accessToken;
}

function toRepositoryRecord(integration: {
  id: string;
  owner: string | null;
  repo: string | null;
  defaultBranch: string | null;
  repositoryEnabled: boolean;
  encryptedWebhookSecret: string | null;
  outputs?: Array<{
    id: string;
    repositoryId: string;
    outputType: string;
    enabled: boolean;
    config: unknown;
    createdAt: Date;
  }>;
}) {
  return {
    id: integration.id,
    owner: integration.owner ?? "",
    repo: integration.repo ?? "",
    defaultBranch: integration.defaultBranch,
    enabled: integration.repositoryEnabled,
    encryptedWebhookSecret: integration.encryptedWebhookSecret,
    outputs: integration.outputs ?? [],
  };
}

function toIntegrationWithRepository<
  T extends {
    id: string;
    owner: string | null;
    repo: string | null;
    defaultBranch: string | null;
    repositoryEnabled: boolean;
    encryptedWebhookSecret: string | null;
    outputs?: Array<{
      id: string;
      repositoryId: string;
      outputType: string;
      enabled: boolean;
      config: unknown;
      createdAt: Date;
    }>;
  },
>(integration: T) {
  return {
    ...integration,
    repositories: [toRepositoryRecord(integration)],
  };
}

async function findRepositoryInOrganization(
  organizationId: string,
  owner: string,
  repo: string
) {
  const [existing] = await db
    .select({ id: githubIntegrations.id })
    .from(githubIntegrations)
    .where(
      and(
        eq(githubIntegrations.organizationId, organizationId),
        sql`lower(${githubIntegrations.owner}) = ${owner.toLowerCase()}`,
        sql`lower(${githubIntegrations.repo}) = ${repo.toLowerCase()}`
      )
    )
    .limit(1);

  return existing ?? null;
}

export async function findConflictingRepositoryInOrganization(
  organizationId: string,
  owner: string,
  repo: string,
  excludeIntegrationId: string
) {
  const existing = await findRepositoryInOrganization(
    organizationId,
    owner,
    repo
  );

  if (!existing || existing.id === excludeIntegrationId) {
    return null;
  }

  return existing;
}

export class GitHubRepositoryNotFoundError extends Error {
  constructor(owner: string, repo: string) {
    super(`Repository ${owner}/${repo} not found or inaccessible`);
    this.name = "GitHubRepositoryNotFoundError";
  }
}

export async function validateRepositoryAccess(params: {
  owner: string;
  repo: string;
  token?: string;
  encryptedToken: string | null;
}) {
  const { owner, repo, token, encryptedToken } = params;
  const resolvedToken =
    token?.trim() ||
    (encryptedToken ? decryptToken(encryptedToken) : undefined);
  const octokit = createOctokit(resolvedToken);

  try {
    await octokit.request("GET /repos/{owner}/{repo}", {
      owner,
      repo,
      headers: {
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
  } catch (error) {
    const status = (error as ErrorWithStatus).status;

    if (status === 404) {
      throw new GitHubRepositoryNotFoundError(owner, repo);
    }

    throw error;
  }
}

export async function createGitHubIntegration(
  params: CreateGitHubIntegrationParams
) {
  const {
    organizationId,
    userId,
    token,
    displayName,
    owner,
    repo,
    defaultBranch,
  } = params;

  const hasAccess = await hasOrganizationAccess(userId, organizationId);
  if (!hasAccess) {
    throw new Error("User does not have access to this organization");
  }

  const existingRepository = await findRepositoryInOrganization(
    organizationId,
    owner,
    repo
  );

  if (existingRepository) {
    throw new Error("Repository already connected");
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
        "Unable to access repository. It may be private and require a Personal Access Token."
      );
    }
  }

  const webhookSecret = generateWebhookSecret();
  const encryptedWebhookSecret = encryptToken(webhookSecret);

  const [integration] = await db
    .insert(githubIntegrations)
    .values({
      id: nanoid(),
      organizationId,
      createdByUserId: userId,
      encryptedToken,
      displayName,
      owner,
      repo,
      defaultBranch,
      repositoryEnabled: true,
      encryptedWebhookSecret,
      enabled: true,
    })
    .returning();

  if (!integration) {
    throw new Error("Failed to create integration");
  }

  await db.insert(repositoryOutputs).values([
    {
      id: nanoid(),
      repositoryId: integration.id,
      outputType: "changelog",
      enabled: true,
      config: null,
    },
    {
      id: nanoid(),
      repositoryId: integration.id,
      outputType: "blog_post",
      enabled: true,
      config: null,
    },
    {
      id: nanoid(),
      repositoryId: integration.id,
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

export function getGitHubAppInstallUrl(state: string) {
  const { slug } = getGitHubAppConfig();
  const installUrl = new URL(
    `https://github.com/apps/${slug}/installations/select_target`
  );
  installUrl.searchParams.set("state", state);
  return installUrl.toString();
}

export async function upsertGitHubAppInstallation(params: {
  organizationId: string;
  userId: string;
  installationId: string;
}) {
  const hasAccess = await hasOrganizationAccess(
    params.userId,
    params.organizationId
  );
  if (!hasAccess) {
    throw new Error("User does not have access to this organization");
  }

  const installation = await getGitHubAppInstallation(params.installationId);
  if (!installation.account) {
    throw new Error("GitHub installation account is missing");
  }

  await assertGitHubInstallationAdmin({
    userId: params.userId,
    installationId: params.installationId,
    installationAccount: installation.account,
  });

  const values = {
    id: nanoid(),
    organizationId: params.organizationId,
    createdByUserId: params.userId,
    installationId: String(installation.id),
    accountId: String(installation.account.id),
    accountLogin: installation.account.login,
    accountName: installation.account.name ?? null,
    accountAvatarUrl: installation.account.avatar_url,
    accountType: installation.account.type,
    repositorySelection: installation.repository_selection ?? null,
    enabled: true,
  };

  const [record] = await db
    .insert(githubAppInstallations)
    .values(values)
    .onConflictDoUpdate({
      target: [
        githubAppInstallations.organizationId,
        githubAppInstallations.installationId,
      ],
      set: {
        accountId: values.accountId,
        accountLogin: values.accountLogin,
        accountName: values.accountName,
        accountAvatarUrl: values.accountAvatarUrl,
        accountType: values.accountType,
        repositorySelection: values.repositorySelection,
        enabled: true,
      },
    })
    .returning();

  if (!record) {
    throw new Error("Failed to save GitHub App installation");
  }

  return record;
}

export async function getGitHubAppInstallationByOrganization(
  organizationId: string
) {
  return db.query.githubAppInstallations.findFirst({
    where: and(
      eq(githubAppInstallations.organizationId, organizationId),
      eq(githubAppInstallations.enabled, true)
    ),
  });
}

export async function listGitHubAppInstallationsByOrganization(
  organizationId: string
) {
  return db.query.githubAppInstallations.findMany({
    where: and(
      eq(githubAppInstallations.organizationId, organizationId),
      eq(githubAppInstallations.enabled, true)
    ),
  });
}

const listRepositoriesForInstallation = Effect.fn(
  "GitHub.listInstallationRepositories"
)(function* (installation: GitHubInstallationReference) {
  const cacheKey = `github_app_repositories:${installation.organizationId}:${installation.installationId}`;
  if (redis) {
    const cache = redis;
    const cached = yield* Effect.tryPromise({
      try: () => cache.get(cacheKey),
      catch: (cause) =>
        new GitHubRepositoryCacheError({
          operation: "readRepositories",
          cause,
        }),
    });
    const decodedCached = yield* decodeCachedGitHubAppRepositories(cached).pipe(
      Effect.match({
        onFailure: () => null,
        onSuccess: (repositories) => repositories,
      })
    );

    if (decodedCached) {
      return decodedCached;
    }
  }

  const token = yield* createGitHubAppInstallationTokenEffect(
    installation.installationId
  );
  const octokit = createOctokit(token);
  const repositories: GitHubAppRepositoryResponse[] = [];
  let page = 1;

  while (true) {
    const currentPage = page;
    const { data } = yield* Effect.tryPromise({
      try: () =>
        octokit.request("GET /installation/repositories", {
          per_page: 100,
          page: currentPage,
          headers: {
            "X-GitHub-Api-Version": "2022-11-28",
          },
        }),
      catch: (cause) =>
        new GitHubRequestError({
          operation: "listRepositories",
          status: getErrorStatus(cause) ?? undefined,
          cause,
        }),
    });
    const response = yield* decodeGitHubAppRepositoriesResponse(data).pipe(
      Effect.mapError(
        (cause) =>
          new GitHubResponseError({ operation: "listRepositories", cause })
      )
    );
    repositories.push(...response.repositories);

    if (response.repositories.length < 100) {
      break;
    }
    page += 1;
  }

  const mappedRepositories: GitHubAppRepository[] = repositories.map(
    (repo) => ({
      id: String(repo.id),
      owner: repo.owner.login,
      name: repo.name,
      fullName: repo.full_name,
      private: repo.private,
      description: repo.description,
      defaultBranch: repo.default_branch,
    })
  );

  yield* Effect.tryPromise({
    try: async () => {
      await redis?.set(cacheKey, mappedRepositories, {
        ex: GITHUB_APP_REPOSITORIES_CACHE_TTL_SECONDS,
      });
    },
    catch: (cause) =>
      new GitHubRepositoryCacheError({ operation: "writeRepositories", cause }),
  });

  return mappedRepositories;
});

export const listGitHubAppRepositoriesEffect = Effect.fn(
  "GitHub.listRepositories"
)(function* (
  organizationId: string,
  preloadedInstallations?: GitHubInstallationReference[]
) {
  const installations =
    preloadedInstallations ??
    (yield* Effect.tryPromise({
      try: () => listGitHubAppInstallationsByOrganization(organizationId),
      catch: (cause) =>
        new GitHubPersistenceError({ operation: "listInstallations", cause }),
    }));

  if (installations.length === 0) {
    return [];
  }

  const repositoryLists = yield* Effect.forEach(
    installations,
    listRepositoriesForInstallation,
    { concurrency: 4 }
  );

  const repositoriesById = new Map<string, GitHubAppRepository>();
  for (const repositories of repositoryLists) {
    for (const repository of repositories) {
      repositoriesById.set(repository.id, repository);
    }
  }

  return [...repositoriesById.values()];
});

export async function getSelectedGitHubAppRepositoryIds(
  organizationId: string,
  githubAppInstallationIds: string[]
) {
  if (githubAppInstallationIds.length === 0) {
    return [];
  }

  const selected = await db.query.githubIntegrations.findMany({
    where: and(
      eq(githubIntegrations.organizationId, organizationId),
      inArray(
        githubIntegrations.githubAppInstallationId,
        githubAppInstallationIds
      ),
      eq(githubIntegrations.enabled, true)
    ),
    columns: {
      githubRepositoryId: true,
    },
  });

  return selected
    .map((repo) => repo.githubRepositoryId)
    .filter((id): id is string => Boolean(id));
}

export function setSelectedGitHubAppRepositoriesEffect(
  params: SelectGitHubRepositoriesParams
) {
  return selectGitHubRepositories(params, {
    listInstallations: (organizationId) =>
      Effect.tryPromise({
        try: () => listGitHubAppInstallationsByOrganization(organizationId),
        catch: (cause) =>
          new GitHubPersistenceError({ operation: "listInstallations", cause }),
      }),
    listRepositories: listRepositoriesForInstallation,
    saveSelection: saveGitHubRepositorySelection,
    invalidateRepositories: (installation) =>
      Effect.tryPromise({
        try: async () => {
          await redis?.del(
            `github_app_repositories:${installation.organizationId}:${installation.installationId}`
          );
        },
        catch: (cause) =>
          new GitHubRepositoryCacheError({
            operation: "invalidateRepositories",
            cause,
          }),
      }),
  });
}

export async function deleteGitHubAppInstallationForOrganization(
  organizationId: string,
  accountId?: string
) {
  const installations =
    await listGitHubAppInstallationsByOrganization(organizationId);
  const targets = accountId
    ? installations.filter(
        (installation) => installation.accountId === accountId
      )
    : installations;

  if (targets.length === 0) {
    return;
  }

  const targetRecordIds = targets.map((installation) => installation.id);

  await db
    .update(githubIntegrations)
    .set({
      enabled: false,
      repositoryEnabled: false,
    })
    .where(
      and(
        eq(githubIntegrations.organizationId, organizationId),
        inArray(githubIntegrations.githubAppInstallationId, targetRecordIds)
      )
    );

  await db
    .update(githubAppInstallations)
    .set({ enabled: false })
    .where(inArray(githubAppInstallations.id, targetRecordIds));

  await Promise.all(
    targets.map((installation) =>
      Promise.resolve(
        redis?.del(
          `github_app_repositories:${organizationId}:${installation.installationId}`
        )
      )
    )
  );
}

export async function getGitHubIntegrationsByOrganization(
  organizationId: string
) {
  const integrations = await db.query.githubIntegrations.findMany({
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
      outputs: true,
    },
  });

  return integrations.map((integration) =>
    toIntegrationWithRepository(integration)
  );
}

export async function getGitHubIntegrationById(integrationId: string) {
  const integration = await db.query.githubIntegrations.findFirst({
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
      outputs: true,
    },
  });

  if (!integration) {
    return null;
  }

  return toIntegrationWithRepository(integration);
}

async function getAuthorizedGitHubIntegration(
  integrationId: string,
  userId: string
) {
  const integration = await getGitHubIntegrationById(integrationId);

  if (!integration) {
    throw new Error("Integration not found");
  }

  const hasAccess = await hasOrganizationAccess(
    userId,
    integration.organizationId
  );

  if (!hasAccess) {
    throw new Error("User does not have access to this integration");
  }

  return integration;
}

export async function getDecryptedToken(integrationId: string, userId: string) {
  const integration = await getAuthorizedGitHubIntegration(
    integrationId,
    userId
  );

  if (!integration.encryptedToken) {
    return null;
  }

  return decryptToken(integration.encryptedToken);
}

export async function getGitHubCloneToken(
  integrationId: string,
  userId: string
) {
  const integration = await getAuthorizedGitHubIntegration(
    integrationId,
    userId
  );
  return getTokenForIntegrationId(integration.id, {
    organizationId: integration.organizationId,
  });
}

export async function getGitHubCloneTokenForOrganization(
  integrationId: string,
  organizationId: string
) {
  const integration = await getGitHubIntegrationById(integrationId);
  if (!integration || integration.organizationId !== organizationId) {
    throw new Error("Integration not found for this organization");
  }
  return getTokenForIntegrationId(integration.id, {
    organizationId: integration.organizationId,
  });
}

export async function addRepository(
  _params: AddRepositoryParams & { userId: string }
) {
  throw new Error(
    "GitHub integrations now support exactly one repository. Create a new integration for another repo."
  );
}

export async function getRepositoryById(repositoryId: string) {
  const integration = await db.query.githubIntegrations.findFirst({
    where: eq(githubIntegrations.id, repositoryId),
    with: {
      outputs: true,
    },
  });

  if (!integration) {
    return null;
  }

  return {
    ...toRepositoryRecord(integration),
    integration: {
      id: integration.id,
      organizationId: integration.organizationId,
      encryptedToken: integration.encryptedToken,
      enabled: integration.enabled,
    },
  };
}

export async function getOutputById(outputId: string) {
  const output = await db.query.repositoryOutputs.findFirst({
    where: eq(repositoryOutputs.id, outputId),
    with: {
      integration: true,
    },
  });

  if (!output) {
    return null;
  }

  return {
    ...output,
    repository: {
      id: output.integration.id,
      owner: output.integration.owner ?? "",
      repo: output.integration.repo ?? "",
      defaultBranch: output.integration.defaultBranch,
      enabled: output.integration.repositoryEnabled,
      integration: output.integration,
    },
  };
}

export async function configureOutput(params: ConfigureOutputParams) {
  const { repositoryId, outputType, enabled, config } = params;

  const [output] = await db
    .insert(repositoryOutputs)
    .values({
      id: nanoid(),
      repositoryId,
      outputType,
      enabled,
      config,
    })
    .onConflictDoUpdate({
      target: [repositoryOutputs.repositoryId, repositoryOutputs.outputType],
      set: {
        enabled,
        config,
      },
    })
    .returning();

  return output;
}

export async function setRepositoryOutputDirectory(
  params: SetRepositoryOutputDirectoryParams
) {
  const directoryConfig = JSON.stringify({ directory: params.directory });
  const mergedConfig = sql`(
    CASE
      WHEN jsonb_typeof(${repositoryOutputs.config}) = 'object'
        THEN ${repositoryOutputs.config}
      ELSE '{}'::jsonb
    END
  ) || ${directoryConfig}::jsonb`;
  const [output] = await db
    .insert(repositoryOutputs)
    .values({
      id: nanoid(),
      repositoryId: params.repositoryId,
      outputType: params.outputType,
      enabled:
        params.outputType === "changelog" || params.outputType === "blog_post",
      config: { directory: params.directory },
    })
    .onConflictDoUpdate({
      target: [repositoryOutputs.repositoryId, repositoryOutputs.outputType],
      set: { config: mergedConfig },
    })
    .returning();

  return output;
}

export async function toggleGitHubIntegration(
  integrationId: string,
  enabled: boolean
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
  data: {
    enabled?: boolean;
    repositoryEnabled?: boolean;
    displayName?: string;
    owner?: string;
    repo?: string;
  }
) {
  const [updated] = await db
    .update(githubIntegrations)
    .set(data)
    .where(eq(githubIntegrations.id, integrationId))
    .returning();

  return updated;
}

export async function updateGitHubIntegrationToken(
  integrationId: string,
  token: string
) {
  const integration = await getGitHubIntegrationById(integrationId);

  if (!integration) {
    throw new Error("Integration not found");
  }

  const owner = integration.owner?.trim();
  const repo = integration.repo?.trim();

  if (!owner || !repo) {
    throw new Error("Repository not configured for this integration");
  }

  const normalizedToken = token.trim();

  if (integration.encryptedToken) {
    const currentToken = decryptToken(integration.encryptedToken);

    if (currentToken === normalizedToken) {
      return integration;
    }
  }

  const octokit = createOctokit(normalizedToken);

  try {
    await octokit.request("GET /user");
  } catch (_error) {
    throw new Error("Invalid GitHub token");
  }

  try {
    await octokit.request("GET /repos/{owner}/{repo}", {
      owner,
      repo,
      headers: {
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
  } catch (_error) {
    throw new Error(`Token does not have access to ${owner}/${repo}`);
  }

  const encryptedToken = encryptToken(normalizedToken);

  const [updated] = await db
    .update(githubIntegrations)
    .set({ encryptedToken })
    .where(eq(githubIntegrations.id, integrationId))
    .returning();

  return updated;
}

export async function toggleRepository(repositoryId: string, enabled: boolean) {
  return updateRepository(repositoryId, { enabled });
}

export async function updateRepository(
  repositoryId: string,
  data: { enabled?: boolean; defaultBranch?: string | null }
) {
  const [updated] = await db
    .update(githubIntegrations)
    .set({
      ...(data.enabled !== undefined
        ? { repositoryEnabled: data.enabled }
        : {}),
      ...(data.defaultBranch !== undefined
        ? { defaultBranch: data.defaultBranch }
        : {}),
    })
    .where(eq(githubIntegrations.id, repositoryId))
    .returning();

  return updated;
}

export async function validateRepositoryBranchExists(
  params: ValidateRepositoryBranchExistsParams
) {
  const { owner, repo, branch, token, encryptedToken } = params;

  const normalizedBranch = branch.trim();
  if (!normalizedBranch) {
    return;
  }

  const resolvedToken = token?.trim() || undefined;
  const authToken =
    resolvedToken ??
    (encryptedToken ? decryptToken(encryptedToken) : undefined);
  const octokit = createOctokit(authToken);

  try {
    await octokit.request("GET /repos/{owner}/{repo}/branches/{branch}", {
      owner,
      repo,
      branch: normalizedBranch,
      headers: {
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
  } catch (error) {
    const status = (error as ErrorWithStatus).status;

    if (status === 404) {
      throw new GitHubBranchNotFoundError(owner, repo, normalizedBranch);
    }

    throw error;
  }
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
    .delete(githubIntegrations)
    .where(eq(githubIntegrations.id, repositoryId));
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
  repo: string,
  options?: { organizationId?: string }
) {
  const whereClauses = [
    sql`lower(${githubIntegrations.owner}) = ${owner.toLowerCase()}`,
    sql`lower(${githubIntegrations.repo}) = ${repo.toLowerCase()}`,
  ];

  if (options?.organizationId) {
    whereClauses.push(
      eq(githubIntegrations.organizationId, options.organizationId)
    );
  }

  const [integration] = await db
    .select({
      id: githubIntegrations.id,
      organizationId: githubIntegrations.organizationId,
      encryptedToken: githubIntegrations.encryptedToken,
      githubAppInstallationId: githubIntegrations.githubAppInstallationId,
      integrationEnabled: githubIntegrations.enabled,
      repositoryEnabled: githubIntegrations.repositoryEnabled,
    })
    .from(githubIntegrations)
    .where(and(...whereClauses))
    .limit(1)
    .$withCache(false);

  if (!(integration?.integrationEnabled && integration.repositoryEnabled)) {
    return undefined;
  }

  return runGitHubEffect(
    resolveGitHubCredentials(
      integration.id,
      integration,
      githubCredentialDependencies
    ).pipe(
      Effect.catchTag("GitHubCredentialsMissingError", () =>
        Effect.succeed(undefined)
      ),
      Effect.catchTag("GitHubRequestError", (error) => Effect.fail(error.cause))
    )
  );
}

const githubCredentialDependencies: GitHubCredentialDependencies = {
  findInstallation: (recordId, organizationId) =>
    Effect.tryPromise({
      try: () =>
        db
          .select({ installationId: githubAppInstallations.installationId })
          .from(githubAppInstallations)
          .where(
            and(
              eq(githubAppInstallations.id, recordId),
              eq(githubAppInstallations.organizationId, organizationId),
              eq(githubAppInstallations.enabled, true)
            )
          )
          .limit(1)
          .$withCache(false)
          .then(([installation]) => installation),
      catch: (cause) =>
        new GitHubPersistenceError({ operation: "findInstallation", cause }),
    }),
  createInstallationToken: createGitHubAppInstallationTokenEffect,
  decryptToken: (encryptedToken, integrationId) =>
    Effect.try({
      try: () => decryptToken(encryptedToken),
      catch: (cause) =>
        new GitHubCredentialDecryptionError({ integrationId, cause }),
    }),
};

export function createGitHubAppInstallationTokenForRecordEffect(
  recordId: string,
  organizationId: string
) {
  return resolveGitHubCredentials(
    recordId,
    {
      organizationId,
      githubAppInstallationId: recordId,
      encryptedToken: null,
    },
    githubCredentialDependencies
  );
}

export function getTokenForIntegrationIdEffect(
  integrationId: string,
  options?: { organizationId?: string }
) {
  return resolveGitHubToken(
    { integrationId, organizationId: options?.organizationId },
    {
      ...githubCredentialDependencies,
      findIntegration: (params) =>
        Effect.tryPromise({
          try: () =>
            db
              .select({
                organizationId: githubIntegrations.organizationId,
                githubAppInstallationId:
                  githubIntegrations.githubAppInstallationId,
                encryptedToken: githubIntegrations.encryptedToken,
              })
              .from(githubIntegrations)
              .where(
                params.organizationId
                  ? and(
                      eq(githubIntegrations.id, params.integrationId),
                      eq(
                        githubIntegrations.organizationId,
                        params.organizationId
                      )
                    )
                  : eq(githubIntegrations.id, params.integrationId)
              )
              .limit(1)
              .$withCache(false)
              .then(([integration]) => integration),
          catch: (cause) =>
            new GitHubPersistenceError({ operation: "findIntegration", cause }),
        }),
    }
  );
}

export function getTokenForIntegrationId(
  integrationId: string,
  options?: { organizationId?: string }
) {
  return runGitHubEffect(
    getTokenForIntegrationIdEffect(integrationId, options).pipe(
      Effect.catchTag("GitHubCredentialsMissingError", () =>
        Effect.succeed(null)
      ),
      Effect.catchTag("GitHubRequestError", (error) => Effect.fail(error.cause))
    )
  );
}

export async function getGitHubToolRepositoryContextByIntegrationId(
  integrationId: string,
  options?: { organizationId?: string }
): Promise<GitHubToolRepositoryContext> {
  const whereClause = options?.organizationId
    ? and(
        eq(githubIntegrations.id, integrationId),
        eq(githubIntegrations.organizationId, options.organizationId)
      )
    : eq(githubIntegrations.id, integrationId);

  const [integration] = await db
    .select({
      id: githubIntegrations.id,
      organizationId: githubIntegrations.organizationId,
      owner: githubIntegrations.owner,
      repo: githubIntegrations.repo,
      defaultBranch: githubIntegrations.defaultBranch,
      integrationEnabled: githubIntegrations.enabled,
      repositoryEnabled: githubIntegrations.repositoryEnabled,
    })
    .from(githubIntegrations)
    .where(whereClause)
    .limit(1);

  if (!integration) {
    throw new Error(
      `Repository access denied. Unknown integrationId ${integrationId}.`
    );
  }

  if (!(integration.integrationEnabled && integration.repositoryEnabled)) {
    throw new Error(
      `Repository access denied for integrationId ${integrationId}. Integration is disabled.`
    );
  }

  const owner = integration.owner?.trim();
  const repo = integration.repo?.trim();
  if (!owner || !repo) {
    throw new Error(
      `Repository configuration missing for integrationId ${integrationId}.`
    );
  }

  const token =
    (await getTokenForIntegrationId(integration.id, {
      organizationId: integration.organizationId,
    })) ?? undefined;

  return {
    integrationId: integration.id,
    organizationId: integration.organizationId,
    owner,
    repo,
    defaultBranch: integration.defaultBranch,
    token,
  };
}

export async function generateWebhookSecretForRepository(
  repositoryId: string,
  userId: string
): Promise<WebhookConfig> {
  const repository = await getRepositoryById(repositoryId);

  if (!repository) {
    throw new Error("Repository not found");
  }

  const hasAccess = await hasOrganizationAccess(
    userId,
    repository.integration.organizationId
  );

  if (!hasAccess) {
    throw new Error("User does not have access to this repository");
  }

  const secret = generateWebhookSecret();
  const encryptedSecret = encryptToken(secret);

  await db
    .update(githubIntegrations)
    .set({ encryptedWebhookSecret: encryptedSecret })
    .where(eq(githubIntegrations.id, repositoryId));

  const webhookUrl = buildWebhookUrl(
    repository.integration.id,
    repository.integration.organizationId,
    repositoryId
  );

  return {
    webhookUrl,
    webhookSecret: secret,
    repositoryId,
    owner: repository.owner,
    repo: repository.repo,
  };
}

export async function getWebhookConfigForRepository(
  repositoryId: string,
  userId: string
): Promise<WebhookConfig | null> {
  const repository = await getRepositoryById(repositoryId);

  if (!repository) {
    throw new Error("Repository not found");
  }

  const hasAccess = await hasOrganizationAccess(
    userId,
    repository.integration.organizationId
  );

  if (!hasAccess) {
    throw new Error("User does not have access to this repository");
  }

  if (!repository.encryptedWebhookSecret) {
    return null;
  }

  const webhookSecret = decryptToken(repository.encryptedWebhookSecret);
  const webhookUrl = buildWebhookUrl(
    repository.integration.id,
    repository.integration.organizationId,
    repositoryId
  );

  return {
    webhookUrl,
    webhookSecret,
    repositoryId,
    owner: repository.owner,
    repo: repository.repo,
  };
}

export async function hasWebhookConfigured(repositoryId: string) {
  const integration = await db.query.githubIntegrations.findFirst({
    where: eq(githubIntegrations.id, repositoryId),
    columns: {
      encryptedWebhookSecret: true,
    },
  });

  return !!integration?.encryptedWebhookSecret;
}

export async function getWebhookSecretByRepositoryId(repositoryId: string) {
  const integration = await db.query.githubIntegrations.findFirst({
    where: eq(githubIntegrations.id, repositoryId),
    columns: {
      encryptedWebhookSecret: true,
    },
  });

  if (!integration?.encryptedWebhookSecret) {
    return null;
  }

  return decryptToken(integration.encryptedWebhookSecret);
}

function buildWebhookUrl(
  integrationId: string,
  organizationId: string,
  repositoryId: string
): string {
  const baseUrl = getConfiguredAppUrl() ?? "http://localhost:3000";
  return `${baseUrl}/api/webhooks/github/${organizationId}/${integrationId}/${repositoryId}`;
}
