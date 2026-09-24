import { unavailableImageRevisionToolInputSchema } from "@notra/ai/schemas/repo-image";
import {
  createGetBrandReferencesTool,
  createSearchBrandReferencesTool,
} from "@notra/ai/tools/brand-references";
import { createMarkdownTools } from "@notra/ai/tools/edit-markdown";
import { exampleTool } from "@notra/ai/tools/example";
import {
  createGetGeoCompetitorShareTool,
  createGetGeoOverviewTool,
  createGetGeoProjectContextTool,
  createGetGeoPromptResultsTool,
  createListGeoProjectsTool,
} from "@notra/ai/tools/geo";
import {
  createGetCommitsByTimeframeTool,
  createGetPullRequestsTool,
  createGetReleaseByTagTool,
} from "@notra/ai/tools/github";
import { createImageRevisionTool } from "@notra/ai/tools/image";
import {
  createGetLinearCyclesTool,
  createGetLinearIssuesTool,
  createGetLinearProjectsTool,
} from "@notra/ai/tools/linear";
import {
  createGetBrandIdentityTool,
  createListBrandIdentitiesTool,
} from "@notra/ai/tools/organization";
import { registerSitemapTools } from "@notra/ai/tools/sitemap";
import { getSkillByName, listAvailableSkills } from "@notra/ai/tools/skills";
import { registerWebSearchTools } from "@notra/ai/tools/web-search";
import type { AgentType } from "@notra/ai/types/brand-references";
import type {
  BuildToolSetDeps,
  BuildToolSetParams,
  LinearContext,
  RepoContext,
  ToolSet,
  ValidatedIntegration,
} from "@notra/ai/types/orchestration";
import { type Tool, tool } from "ai";

export function buildToolSet(
  params: BuildToolSetParams,
  deps?: BuildToolSetDeps
): ToolSet {
  if (deps?.skipTools) {
    return { tools: {}, descriptions: [] };
  }

  const {
    organizationId,
    currentMarkdown,
    contentType,
    currentPostId,
    userId,
    imageDefaults,
    useMarkup,
    onMarkdownUpdate,
    validatedIntegrations,
  } = params;

  const isImageContent = contentType === "image";

  const isDev = process.env.NODE_ENV === "development";

  const tools: Record<string, Tool> = {
    listAvailableSkills: listAvailableSkills({ organizationId }),
    getSkillByName: getSkillByName({ organizationId }),
  };

  const descriptions: string[] = [
    "**Skills**: Access knowledge and writing guidelines using listAvailableSkills and getSkillByName. If the user writes /skill-name, load that skill with getSkillByName before responding.",
  ];

  registerWebSearchTools(tools, descriptions);
  registerSitemapTools(tools, descriptions, { organizationId });
  registerBrandAndGeoTools(tools, descriptions, organizationId, contentType);

  if (isImageContent) {
    if (currentPostId && userId && imageDefaults) {
      tools.reviseImage = createImageRevisionTool({
        organizationId,
        userId,
        postId: currentPostId,
        title: imageDefaults.title,
        integrationId: imageDefaults.integrationId,
        branch: imageDefaults.branch,
        brandIdentityId: imageDefaults.brandIdentityId,
        useMarkup,
      });
      descriptions.unshift(
        "**Image Editing**: Revise the current image using reviseImage. It restores the saved sandbox snapshot, applies the visual change, saves the updated image back to this content item, and stores a new snapshot."
      );
    } else {
      tools.reviseImage = createUnavailableImageRevisionTool();
      descriptions.unshift(
        "**Image Editing**: Image revision is unavailable because the saved sandbox metadata is missing. Call reviseImage to explain the missing metadata."
      );
    }
  } else {
    const { getMarkdown, editMarkdown } = createMarkdownTools({
      currentMarkdown,
      onUpdate:
        onMarkdownUpdate ??
        (() => {
          console.log("onMarkdownUpdate is not set");
        }),
    });

    tools.getMarkdown = getMarkdown;
    tools.editMarkdown = editMarkdown;
    descriptions.unshift(
      "**Markdown Editing**: View and edit the document using getMarkdown and editMarkdown"
    );
  }

  if (isDev) {
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
      {
        organizationId,
        allowedIntegrationIds,
      },
      deps?.resolveContext
    );
    tools.getReleaseByTag = createGetReleaseByTagTool(
      {
        organizationId,
        allowedIntegrationIds,
      },
      deps?.resolveContext
    );
    tools.getCommitsByTimeframe = createGetCommitsByTimeframeTool(
      {
        organizationId,
        allowedIntegrationIds,
      },
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

  return { tools, descriptions };
}

function registerBrandAndGeoTools(
  tools: Record<string, Tool>,
  descriptions: string[],
  organizationId: string,
  contentType?: string
) {
  const agentType = brandAgentTypeFromContent(contentType);

  tools.listBrandIdentities = createListBrandIdentitiesTool({
    organizationId,
  });
  tools.getBrandIdentity = createGetBrandIdentityTool({ organizationId });
  tools.getBrandReferences = createGetBrandReferencesTool({
    organizationId,
    agentType,
  });
  tools.searchBrandReferences = createSearchBrandReferencesTool({
    organizationId,
    agentType,
  });
  tools.listGeoProjects = createListGeoProjectsTool({ organizationId });
  tools.getGeoOverview = createGetGeoOverviewTool({ organizationId });
  tools.getGeoPromptResults = createGetGeoPromptResultsTool({
    organizationId,
  });
  tools.getGeoCompetitorShare = createGetGeoCompetitorShareTool({
    organizationId,
  });
  tools.getGeoProjectContext = createGetGeoProjectContextTool({
    organizationId,
  });

  descriptions.push(
    "**Brand**: Load company and voice details with listBrandIdentities and getBrandIdentity. Match writing style with getBrandReferences or searchBrandReferences before drafting. Pass the same brandIdentityId to sitemap and brand-reference tools when writing for a non-default brand."
  );
  descriptions.push(
    "**GEO Analytics**: List GEO projects, then inspect AI visibility, prompt wins/losses, competitor share, and project context with listGeoProjects, getGeoOverview, getGeoPromptResults, getGeoCompetitorShare, and getGeoProjectContext."
  );
}

function brandAgentTypeFromContent(
  contentType?: string
): AgentType | undefined {
  if (contentType === "blog_post") {
    return "blog";
  }
  if (contentType === "twitter_post") {
    return "twitter";
  }
  if (contentType === "linkedin_post") {
    return "linkedin";
  }
  if (contentType === "changelog") {
    return "changelog";
  }
  return undefined;
}

function createUnavailableImageRevisionTool(): Tool {
  return tool({
    description:
      "Explain why this generated image cannot be revised because its saved sandbox metadata is missing.",
    inputSchema: unavailableImageRevisionToolInputSchema,
    execute: async () => ({
      status: "unavailable",
      message:
        "This image cannot be revised because the saved sandbox metadata is missing.",
    }),
  });
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

export function getRepoContextFromIntegrations(
  integrations: ValidatedIntegration[]
): RepoContext[] {
  return Array.from(
    new Set(
      integrations
        .filter((integration) => integration.type === "github")
        .map((integration) => integration.id)
    )
  ).map((integrationId) => ({ integrationId }));
}

export function getLinearContextFromIntegrations(
  integrations: ValidatedIntegration[]
): LinearContext[] {
  return Array.from(
    new Set(
      integrations
        .filter((integration) => integration.type === "linear")
        .map((integration) => integration.id)
    )
  ).map((integrationId) => ({ integrationId }));
}
