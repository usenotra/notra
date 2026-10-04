import {
  getGeoCompetitorShareInputSchema,
  getGeoOverviewInputSchema,
  getGeoProjectContextInputSchema,
  getGeoPromptResultsInputSchema,
  getGeoTimeseriesInputSchema,
  listGeoProjectsInputSchema,
} from "@notra/ai/schemas/geo-tools";
import type { OrganizationToolConfig } from "@notra/ai/types/organization";
import { toolDescription } from "@notra/ai/utils/description";
import {
  loadGeoCompetitorShareForTool,
  loadGeoOverviewForTool,
  loadGeoProjectContextForTool,
  loadGeoProjectsForTool,
  loadGeoPromptResultsForTool,
  loadGeoTimeseriesForTool,
} from "@notra/ai/utils/geo-tool-data";
import { type Tool, tool } from "ai";

export function createListGeoProjectsTool(
  config: OrganizationToolConfig
): Tool {
  return tool({
    description: toolDescription({
      toolName: "listGeoProjects",
      intro:
        "Lists the organization's GEO projects with their names, company names, tracking status, and latest scan time.",
      whenToUse:
        "Use before a project-specific GEO tool when the user has not clearly identified a project, or when they ask what GEO projects exist.",
      usageNotes:
        "Use the returned project ID with getGeoProjectContext or to scope GEO analytics tools. Never guess a project ID.",
    }),
    inputSchema: listGeoProjectsInputSchema,
    execute: () => loadGeoProjectsForTool(config.organizationId),
  });
}

export function createGetGeoOverviewTool(config: OrganizationToolConfig): Tool {
  return tool({
    description: toolDescription({
      toolName: "getGeoOverview",
      intro:
        "Gets the organization's GEO (AI visibility) status: how often AI engines like ChatGPT, Claude, and Gemini mention the company, per-engine mention rates and average positions, and which competitors the engines recommend instead.",
      whenToUse:
        "Use when the user asks about GEO performance, AI visibility, brand mentions in AI answers, engine performance, or competing brands in AI search.",
      usageNotes:
        "Choose a trailing window from 1 to 365 days. Omit projectId for all projects, or use an ID from listGeoProjects. Data may be empty if no scans have run yet.",
    }),
    inputSchema: getGeoOverviewInputSchema,
    execute: ({ projectId, days }) =>
      loadGeoOverviewForTool(config.organizationId, projectId, days),
  });
}

export function createGetGeoTimeseriesTool(
  config: OrganizationToolConfig
): Tool {
  return tool({
    description: toolDescription({
      toolName: "getGeoTimeseries",
      intro:
        "Returns daily GEO performance per AI engine, including checks, mentions, mention rate, and average position.",
      whenToUse:
        "Use when the user asks whether AI visibility is improving or declining, requests a trend, or wants to compare engine performance over time.",
      usageNotes:
        "Choose a trailing window from 1 to 365 days. Omit projectId for all projects, or use an ID from listGeoProjects.",
    }),
    inputSchema: getGeoTimeseriesInputSchema,
    execute: ({ projectId, days }) =>
      loadGeoTimeseriesForTool(config.organizationId, projectId, days),
  });
}

export function createGetGeoPromptResultsTool(
  config: OrganizationToolConfig
): Tool {
  return tool({
    description: toolDescription({
      toolName: "getGeoPromptResults",
      intro:
        "Returns the latest GEO result for each tracked prompt and AI engine, including whether the brand was mentioned, its position, sentiment, and an answer excerpt.",
      whenToUse:
        "Use when the user asks which prompts the brand wins or loses, what an AI engine answered, where the brand ranks, or which questions need content improvements.",
      usageNotes:
        "Use includeAnswers=true only when full answers are necessary. Omit projectId for all projects, or use an ID from listGeoProjects.",
    }),
    inputSchema: getGeoPromptResultsInputSchema,
    execute: ({ projectId, days, limit, includeAnswers }) =>
      loadGeoPromptResultsForTool(
        config.organizationId,
        projectId,
        days,
        limit,
        includeAnswers
      ),
  });
}

export function createGetGeoCompetitorShareTool(
  config: OrganizationToolConfig
): Tool {
  return tool({
    description: toolDescription({
      toolName: "getGeoCompetitorShare",
      intro:
        "Ranks competitor brands by how often AI engines mentioned them in tracked GEO answers.",
      whenToUse:
        "Use when the user asks which competitors dominate AI answers, who is recommended instead of the brand, or which competitor deserves closer analysis.",
      usageNotes:
        "Choose a trailing window and result limit. Omit projectId for all projects, or use an ID from listGeoProjects.",
    }),
    inputSchema: getGeoCompetitorShareInputSchema,
    execute: ({ projectId, days, limit }) =>
      loadGeoCompetitorShareForTool(
        config.organizationId,
        projectId,
        days,
        limit
      ),
  });
}

export function createGetGeoProjectContextTool(
  config: OrganizationToolConfig
): Tool {
  return tool({
    description: toolDescription({
      toolName: "getGeoProjectContext",
      intro:
        "Returns one GEO project's brand name and aliases, its most relevant tracked competitors (the ones AI engines recommend most) with the total tracked count, tracked prompts, and latest per-engine checks.",
      whenToUse:
        "Use for a detailed project-level picture before giving GEO positioning, competitor, prompt, or content recommendations.",
      usageNotes:
        "Call listGeoProjects first and pass an exact project ID. Use includeAnswers=true only when full answers are necessary. When trackedCompetitorCount is larger than the competitors returned, pass competitorSearch to look up a specific one.",
    }),
    inputSchema: getGeoProjectContextInputSchema,
    execute: ({ projectId, includeAnswers, competitorSearch }) =>
      loadGeoProjectContextForTool(
        config.organizationId,
        projectId,
        includeAnswers,
        competitorSearch
      ),
  });
}
