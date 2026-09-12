import { contentTypeSchema } from "@notra/ai/schemas/content";
import {
  createAddBrandReferenceTool,
  createGetAvailableBrandReferencesTool,
} from "@notra/ai/tools/brand-references";
import { exampleTool } from "@notra/ai/tools/example";
import {
  createGetGeoCompetitorShareTool,
  createGetGeoOverviewTool,
  createGetGeoProjectContextTool,
  createGetGeoPromptResultsTool,
  createGetGeoTimeseriesTool,
  createListGeoProjectsTool,
} from "@notra/ai/tools/geo";
import {
  createGetCommitsByTimeframeTool,
  createGetPullRequestsTool,
  createGetReleaseByTagTool,
} from "@notra/ai/tools/github";
import {
  createGetGranolaFoldersTool,
  createGetGranolaNotesTool,
  createGetGranolaNoteTool,
} from "@notra/ai/tools/granola";
import { createImageTool } from "@notra/ai/tools/image";
import {
  createGetLinearCyclesTool,
  createGetLinearIssuesTool,
  createGetLinearProjectsTool,
} from "@notra/ai/tools/linear";
import {
  createGetAvailableIntegrationsTool,
  createGetBrandIdentityTool,
  createListBrandIdentitiesTool,
} from "@notra/ai/tools/organization";
import {
  createCreatePostTool,
  createGetAvailablePostsTool,
  createGetPostTool,
  createUpdatePostTool,
  createViewPostTool,
  getCreatePostToolName,
} from "@notra/ai/tools/post";
import { getSkillByName, listAvailableSkills } from "@notra/ai/tools/skills";
import {
  createFetchWebpageTool,
  createUnavailableFetchWebpageTool,
  createUnavailableWebSearchTool,
  createWebSearchTool,
  FETCH_WEBPAGE_TOOL_DESCRIPTION,
  FETCH_WEBPAGE_TOOL_NAME,
  isWebSearchAvailable,
  WEB_SEARCH_TOOL_DESCRIPTION,
  WEB_SEARCH_TOOL_NAME,
} from "@notra/ai/tools/web-search";
import type {
  BuildStandaloneToolSetDeps,
  BuildStandaloneToolSetParams,
  LinearContext,
  RepoContext,
  ToolSet,
  ValidatedIntegration,
} from "@notra/ai/types/orchestration";
import type { Tool } from "ai";

export function buildStandaloneToolSet(
  params: BuildStandaloneToolSetParams,
  deps?: BuildStandaloneToolSetDeps
): ToolSet {
  const {
    chatId,
    organizationId,
    userId,
    useMarkup,
    validatedIntegrations,
    postResult,
  } = params;

  const tools: Record<string, Tool> = {};
  const descriptions: string[] = [];

  for (const contentType of contentTypeSchema.options) {
    if (contentType === "image") {
      continue;
    }
    tools[getCreatePostToolName(contentType)] = createCreatePostTool(
      {
        organizationId,
        contentType,
        needsApproval: true,
        chatId,
        sourceMetadata: chatId ? { chatId } : undefined,
      },
      postResult
    );
  }

  if (userId) {
    tools.createImage = createImageTool({
      chatId,
      organizationId,
      userId,
      useMarkup,
    });
  }

  tools.updatePost = createUpdatePostTool(
    { organizationId, contentType: "blog_post" },
    postResult
  );

  tools.viewPost = createViewPostTool({
    organizationId,
    contentType: "blog_post",
  });
  tools.getAvailablePosts = createGetAvailablePostsTool({ organizationId });
  tools.getPost = createGetPostTool({ organizationId });
  tools.listBrandIdentities = createListBrandIdentitiesTool({ organizationId });
  tools.getBrandIdentity = createGetBrandIdentityTool({ organizationId });
  tools.getAvailableIntegrations = createGetAvailableIntegrationsTool({
    organizationId,
  });
  tools.getAvailableBrandReferences = createGetAvailableBrandReferencesTool({
    organizationId,
  });
  tools.addBrandReference = createAddBrandReferenceTool({ organizationId });
  tools.listGeoProjects = createListGeoProjectsTool({ organizationId });
  tools.getGeoOverview = createGetGeoOverviewTool({ organizationId });
  tools.getGeoTimeseries = createGetGeoTimeseriesTool({ organizationId });
  tools.getGeoPromptResults = createGetGeoPromptResultsTool({ organizationId });
  tools.getGeoCompetitorShare = createGetGeoCompetitorShareTool({
    organizationId,
  });
  tools.getGeoProjectContext = createGetGeoProjectContextTool({
    organizationId,
  });

  descriptions.push(
    userId
      ? "**Content Creation**: Create posts using createChangelog, createBlogPost, createTwitterPost, createLinkedInPost, createInvestorUpdate, createImage, plus updatePost and viewPost. createImage runs in a sandbox, saves the generated image as a draft, and stores a sandbox snapshot for future revisions."
      : "**Content Creation**: Create posts using createChangelog, createBlogPost, createTwitterPost, createLinkedInPost, createInvestorUpdate, plus updatePost and viewPost"
  );
  descriptions.push(
    "**Organization Data**: Inspect brand identities, brand references, available integrations, and existing posts using listBrandIdentities, getBrandIdentity, getAvailableBrandReferences, getAvailableIntegrations, getAvailablePosts, and getPost"
  );
  descriptions.push(
    "**Brand References**: When the user tells you they just published a post and shares its URL, congratulate them, then ask if they want to save it as a brand reference. Only after they agree, call addBrandReference with the post content, type, and URL."
  );
  descriptions.push(
    "**GEO Analytics**: List GEO projects and inspect AI visibility summaries, trends, prompt-level results, competitor share, and detailed project context using listGeoProjects, getGeoOverview, getGeoTimeseries, getGeoPromptResults, getGeoCompetitorShare, and getGeoProjectContext"
  );

  tools.listAvailableSkills = listAvailableSkills({ organizationId });
  tools.getSkillByName = getSkillByName({ organizationId });
  descriptions.push(
    "**Skills**: Access knowledge and writing guidelines using listAvailableSkills and getSkillByName"
  );
  const hasContextDev = isWebSearchAvailable();
  tools[FETCH_WEBPAGE_TOOL_NAME] = hasContextDev
    ? createFetchWebpageTool()
    : createUnavailableFetchWebpageTool();
  tools[WEB_SEARCH_TOOL_NAME] = hasContextDev
    ? createWebSearchTool()
    : createUnavailableWebSearchTool();
  descriptions.push(FETCH_WEBPAGE_TOOL_DESCRIPTION);
  descriptions.push(WEB_SEARCH_TOOL_DESCRIPTION);

  if (process.env.NODE_ENV === "development") {
    tools.example = exampleTool();
    descriptions.push(
      "**Example (testing)**: A dummy tool triggered when the user says 'example' — echoes a message for UI testing"
    );
  }

  const hasGitHub = validatedIntegrations.some(
    (i) => i.type === "github" && i.repositories.length > 0
  );

  if (hasGitHub) {
    const allowedIntegrationIds = Array.from(
      new Set(
        validatedIntegrations
          .filter((integration) => integration.type === "github")
          .map((integration) => integration.id)
      )
    );

    tools.getPullRequests = createGetPullRequestsTool(
      { organizationId, allowedIntegrationIds },
      deps?.resolveContext
    );
    tools.getReleaseByTag = createGetReleaseByTagTool(
      { organizationId, allowedIntegrationIds },
      deps?.resolveContext
    );
    tools.getCommitsByTimeframe = createGetCommitsByTimeframeTool(
      { organizationId, allowedIntegrationIds },
      deps?.resolveContext
    );

    const repos = getGitHubRepoList(validatedIntegrations);
    descriptions.push(
      `**GitHub Integration**: Fetch PRs, releases, and commits from: ${repos}`
    );
  }

  const hasLinear = validatedIntegrations.some((i) => i.type === "linear");

  if (hasLinear) {
    const allowedLinearIntegrationIds = Array.from(
      new Set(
        validatedIntegrations
          .filter((integration) => integration.type === "linear")
          .map((integration) => integration.id)
      )
    );

    tools.getLinearIssues = createGetLinearIssuesTool(
      { organizationId, allowedIntegrationIds: allowedLinearIntegrationIds },
      deps?.resolveLinearContext
    );
    tools.getLinearProjects = createGetLinearProjectsTool(
      { organizationId, allowedIntegrationIds: allowedLinearIntegrationIds },
      deps?.resolveLinearContext
    );
    tools.getLinearCycles = createGetLinearCyclesTool(
      { organizationId, allowedIntegrationIds: allowedLinearIntegrationIds },
      deps?.resolveLinearContext
    );

    const teams = getLinearTeamList(validatedIntegrations);
    descriptions.push(
      `**Linear Integration**: Fetch issues, projects, and cycles${teams ? ` from: ${teams}` : ""}`
    );
  }

  const hasGranola = validatedIntegrations.some((i) => i.type === "granola");

  if (hasGranola) {
    const granolaIntegrationIds = new Set<string>();
    for (const integration of validatedIntegrations) {
      if (integration.type === "granola") {
        granolaIntegrationIds.add(integration.id);
      }
    }
    const allowedGranolaIntegrationIds = Array.from(granolaIntegrationIds);

    tools.getGranolaNotes = createGetGranolaNotesTool(
      { organizationId, allowedIntegrationIds: allowedGranolaIntegrationIds },
      deps?.resolveGranolaContext
    );
    tools.getGranolaNote = createGetGranolaNoteTool(
      { organizationId, allowedIntegrationIds: allowedGranolaIntegrationIds },
      deps?.resolveGranolaContext
    );
    tools.getGranolaFolders = createGetGranolaFoldersTool(
      { organizationId, allowedIntegrationIds: allowedGranolaIntegrationIds },
      deps?.resolveGranolaContext
    );

    const workspaces = getGranolaWorkspaceList(validatedIntegrations);
    descriptions.push(
      `**Granola Integration**: Fetch meeting notes, transcripts, and AI summaries${workspaces ? ` from: ${workspaces}` : ""}`
    );
  }

  return { tools, descriptions };
}

function getGitHubRepoList(integrations: ValidatedIntegration[]): string {
  const repos: string[] = [];
  for (const integration of integrations) {
    if (integration.type === "github") {
      for (const repo of integration.repositories) {
        repos.push(`${repo.owner}/${repo.repo}`);
      }
    }
  }
  return repos.join(", ");
}

function getLinearTeamList(integrations: ValidatedIntegration[]): string {
  const teams: string[] = [];
  for (const integration of integrations) {
    if (integration.type === "linear") {
      teams.push(integration.linearTeamName ?? integration.displayName);
    }
  }
  return teams.join(", ");
}

function getGranolaWorkspaceList(integrations: ValidatedIntegration[]): string {
  const workspaces: string[] = [];
  for (const integration of integrations) {
    if (integration.type === "granola") {
      workspaces.push(integration.workspaceName ?? integration.displayName);
    }
  }
  return workspaces.join(", ");
}

export function getRepoContextFromIntegrations(
  integrations: ValidatedIntegration[]
): RepoContext[] {
  return integrations.flatMap((integration) => {
    if (integration.type !== "github") {
      return [];
    }

    return integration.repositories.map((repository) => ({
      integrationId: integration.id,
      owner: repository.owner,
      repo: repository.repo,
    }));
  });
}

export function getLinearContextFromIntegrations(
  integrations: ValidatedIntegration[]
): LinearContext[] {
  return integrations.flatMap((integration) => {
    if (integration.type !== "linear") {
      return [];
    }

    return {
      integrationId: integration.id,
      teamName: integration.linearTeamName ?? undefined,
      displayName: integration.displayName,
    };
  });
}
