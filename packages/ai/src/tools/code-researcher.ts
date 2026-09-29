import { trackCodeResearchUsage } from "@notra/ai/billing/code-research-billing";
import {
  CODE_RESEARCH_TOOL_DESCRIPTIONS,
  CODE_RESEARCHER_MAX_STEPS,
} from "@notra/ai/constants/code-research";
import { AGENT_DEFAULT_MODEL } from "@notra/ai/constants/models";
import { assertRouteHasCredits } from "@notra/ai/gateway";
import { createModel } from "@notra/ai/model";
import { CODE_RESEARCHER_PROMPT } from "@notra/ai/prompts/code-researcher";
import { withRouterDefaults } from "@notra/ai/provider-options";
import { codeResearchBriefSchema } from "@notra/ai/schemas/code-research";
import {
  listRepositoryFilesInputSchema,
  openRepositoryInputSchema,
  readRepositoryFileInputSchema,
  repositoryHistoryInputSchema,
  searchRepositoryInputSchema,
  showRepositoryChangeInputSchema,
} from "@notra/ai/schemas/code-research-tools";
import { createGetPullRequestsTool } from "@notra/ai/tools/github";
import type {
  AgentTokenUsage,
  ResolveIntegrationContext,
} from "@notra/ai/types/agents";
import type {
  CodeResearcherProgress,
  CodeResearcherStep,
} from "@notra/ai/types/code-research";
import {
  type CodeResearchScope,
  listRepositoryFiles,
  openRepository,
  readRepositoryFile,
  repositoryHistory,
  searchRepository,
  showRepositoryChange,
} from "@notra/ai/utils/code-research-actions";
import {
  addStepUsage,
  finishStep,
  startStep,
} from "@notra/ai/utils/code-researcher-steps";
import { toAgentTokenUsage } from "@notra/ai/utils/token-usage";
import { withToolErrorPayloads } from "@notra/ai/utils/tool-error-payload";
import {
  isStepCount,
  type JSONValue,
  Output,
  type Tool,
  ToolLoopAgent,
  tool,
} from "ai";
import { z } from "zod";

const codeResearcherInputSchema = z.object({
  feature: z
    .string()
    .min(1)
    .describe(
      "What to research, in the user's words, for example 'the faster skills tab from PR #1279'"
    ),
  integrationId: z
    .string()
    .describe("The GitHub integrationId of the repository to read"),
  pullRequestNumber: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Pull request that built the feature, when known"),
  branch: z
    .string()
    .optional()
    .describe("Branch with unmerged work, when the feature is not merged yet"),
});

function buildResearchTools(params: {
  scope: CodeResearchScope;
  integrationId: string;
  organizationId: string;
  resolveContext?: ResolveIntegrationContext;
}): Record<string, Tool> {
  const { scope, integrationId } = params;
  // The researcher only ever reads the one repository it was given.
  const pinned = <T extends { integrationId: string }>(input: T): T => ({
    ...input,
    integrationId,
  });
  return withToolErrorPayloads({
    get_pull_requests: createGetPullRequestsTool(
      {
        organizationId: params.organizationId,
        allowedIntegrationIds: [integrationId],
      },
      params.resolveContext
    ),
    open_repository: tool({
      description: CODE_RESEARCH_TOOL_DESCRIPTIONS.open_repository,
      inputSchema: openRepositoryInputSchema,
      execute: (input) => openRepository(scope, pinned(input)),
    }),
    list_repository_files: tool({
      description: CODE_RESEARCH_TOOL_DESCRIPTIONS.list_repository_files,
      inputSchema: listRepositoryFilesInputSchema,
      execute: (input) => listRepositoryFiles(scope, pinned(input)),
    }),
    search_repository: tool({
      description: CODE_RESEARCH_TOOL_DESCRIPTIONS.search_repository,
      inputSchema: searchRepositoryInputSchema,
      execute: (input) => searchRepository(scope, pinned(input)),
    }),
    read_repository_file: tool({
      description: CODE_RESEARCH_TOOL_DESCRIPTIONS.read_repository_file,
      inputSchema: readRepositoryFileInputSchema,
      execute: (input) => readRepositoryFile(scope, pinned(input)),
    }),
    repository_history: tool({
      description: CODE_RESEARCH_TOOL_DESCRIPTIONS.repository_history,
      inputSchema: repositoryHistoryInputSchema,
      execute: (input) => repositoryHistory(scope, pinned(input)),
    }),
    show_repository_change: tool({
      description: CODE_RESEARCH_TOOL_DESCRIPTIONS.show_repository_change,
      inputSchema: showRepositoryChangeInputSchema,
      execute: (input) => showRepositoryChange(scope, pinned(input)),
    }),
  });
}

function buildResearchPrompt(
  input: z.infer<typeof codeResearcherInputSchema>
): string {
  return [
    `Feature: ${input.feature}`,
    `integrationId: ${input.integrationId}`,
    input.pullRequestNumber
      ? `Pull request: #${String(input.pullRequestNumber)}`
      : null,
    input.branch ? `Branch: ${input.branch}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * A subagent for the standalone chat: it reads one connected repository in a
 * read-only Upstash Box and returns a feature brief. Every tool call streams
 * to the UI as a preliminary result; the chat model only sees the brief.
 */
export function createCodeResearcherTool(params: {
  organizationId: string;
  sessionKey: string;
  allowedIntegrationIds: string[];
  resolveContext?: ResolveIntegrationContext;
  useMarkup?: boolean;
  chargeAiCredits?: boolean;
}): Tool {
  return tool({
    description:
      "Delegates to a code researcher that reads the connected GitHub repository in a read-only sandbox and returns a brief about one product feature: what it does for users, how they reach it, and its limits. Use it before writing content about a specific feature (for example 'we just shipped X' or a pull request), because pull request titles rarely explain the user value. Takes 30 to 90 seconds. Do not call it for broad changelogs covering many changes.",
    inputSchema: codeResearcherInputSchema,
    async *execute(input, { abortSignal }) {
      if (!params.allowedIntegrationIds.includes(input.integrationId)) {
        throw new Error(
          `Unknown GitHub integration ${input.integrationId}. Use one of: ${params.allowedIntegrationIds.join(", ")}.`
        );
      }
      await assertRouteHasCredits({
        organizationId: params.organizationId,
        modelId: AGENT_DEFAULT_MODEL,
      });

      const agent = new ToolLoopAgent({
        model: createModel(params.organizationId, AGENT_DEFAULT_MODEL, {
          disableMemory: true,
        }),
        providerOptions: withRouterDefaults(
          { gateway: { tags: ["code-research"] } },
          { modelId: AGENT_DEFAULT_MODEL }
        ),
        instructions: CODE_RESEARCHER_PROMPT,
        tools: buildResearchTools({
          scope: {
            sessionKey: params.sessionKey,
            organizationId: params.organizationId,
          },
          integrationId: input.integrationId,
          organizationId: params.organizationId,
          resolveContext: params.resolveContext,
        }),
        output: Output.object({ schema: codeResearchBriefSchema }),
        stopWhen: isStepCount(CODE_RESEARCHER_MAX_STEPS),
      });

      let steps: CodeResearcherStep[] = [];
      const progress = (): CodeResearcherProgress => ({
        status: "running",
        steps,
      });
      yield progress();

      // Usage is summed per model step and billed in `finally`, so a run the
      // user stops halfway still pays for the tokens it already used.
      let usage: AgentTokenUsage | null = null;
      try {
        const result = await agent.stream({
          prompt: buildResearchPrompt(input),
          abortSignal,
        });
        for await (const part of result.fullStream) {
          if (part.type === "finish-step") {
            usage = addStepUsage(usage, toAgentTokenUsage(part.usage));
          } else if (part.type === "tool-call") {
            steps = startStep(
              steps,
              part.toolCallId,
              part.toolName,
              part.input
            );
            yield progress();
          } else if (part.type === "tool-result") {
            steps = finishStep(steps, part.toolCallId, { output: part.output });
            yield progress();
          } else if (part.type === "tool-error") {
            steps = finishStep(steps, part.toolCallId, {
              errorText:
                part.error instanceof Error
                  ? part.error.message
                  : String(part.error),
            });
            yield progress();
          }
        }
        const brief = await result.output;
        yield { ...brief, steps };
      } finally {
        if (usage) {
          await trackCodeResearchUsage({
            organizationId: params.organizationId,
            usage,
            modelId: AGENT_DEFAULT_MODEL,
            useMarkup: params.useMarkup,
            chargeAiCredits: params.chargeAiCredits,
          });
        }
      }
    },
    toModelOutput: ({ output }) => {
      // The chat model gets the brief; the step trail is only for the UI.
      const { steps: _steps, ...brief } = (output ?? {}) as unknown as Record<
        string,
        JSONValue
      >;
      return { type: "json", value: brief };
    },
  });
}
