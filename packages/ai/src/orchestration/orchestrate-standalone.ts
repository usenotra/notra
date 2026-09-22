import { getEnabledMcpServerCount } from "@notra/ai/integrations/mcp-tool-index";
import { createModel } from "@notra/ai/model";
import { getStandaloneChatPrompt } from "@notra/ai/prompts/standalone-chat";
import { withRouterDefaults } from "@notra/ai/provider-options";
import { STANDALONE_SKILL_CATALOG_LIMIT } from "@notra/ai/skills/constants";
import { listSkillSummaries } from "@notra/ai/skills/functions/service";
import { createLazyMcpRuntime } from "@notra/ai/tools/mcp-lazy";
import type {
  AutoThinkingLevel,
  IntegrationFetchers,
  ValidatedIntegration,
} from "@notra/ai/types/orchestration";
import type { PostToolsResult } from "@notra/ai/types/post-tools";
import type {
  OrchestrateResult,
  StandaloneChatContextItem,
  StandaloneChatDeps,
  StandaloneChatInput,
} from "@notra/ai/types/standalone-chat";
import { loadChatWorkspace } from "@notra/ai/utils/chat-workspace";
import { withStandaloneCodeMode } from "@notra/ai/utils/code-mode";
import { normalizeMarkdownFileAttachments } from "@notra/ai/utils/message-attachments";
import { summarizeRouteUsage } from "@notra/ai/utils/route-usage";
import { buildTelemetryOptions } from "@notra/ai/utils/tcc";
import { withToolErrorPayloads } from "@notra/ai/utils/tool-error-payload";
import {
  convertToModelMessages,
  generateText,
  isStepCount,
  isToolUIPart,
  NoSuchToolError,
  Output,
  smoothStream,
  streamText,
  type UIMessage,
} from "ai";

import {
  hasEnabledGitHubIntegration,
  hasEnabledLinearIntegration,
} from "./integration-validator";
import { routeMessage, selectAutoModel } from "./router";
import {
  buildStandaloneToolSet,
  getLinearContextFromIntegrations,
  getRepoContextFromIntegrations,
  getStandaloneApprovalToolNames,
} from "./standalone-tool-registry";
import { getThinkingProviderOptions } from "./thinking";

const NOTRA_TOOLING_DESCRIPTION =
  "Read-only Notra data tools (GitHub, Linear, Granola, posts, integrations, brand references, skills, schedules, web search, webpage fetch, GEO projects, prompt results, and project context) run inside code_mode. Content, brand identity, GEO chart, schedule creation, and approval tools are called directly. Context.dev tools require API configuration when called.";

export async function orchestrateStandaloneChat(
  input: StandaloneChatInput,
  deps?: StandaloneChatDeps
): Promise<OrchestrateResult> {
  const {
    organizationId,
    chatId,
    userId,
    messages,
    context = [],
    maxSteps = 50,
    log: inputLog,
    requestedModel,
    enableThinking = true,
    thinkingLevel = "medium",
    abortSignal,
    timezone,
    telemetryMetadata,
    useMarkup,
    projectId,
    surface = "chat",
  } = input;

  const log = deps?.log ?? inputLog;

  const validatedIntegrations =
    deps?.preValidatedIntegrations ??
    (await validateStandaloneIntegrations(
      organizationId,
      context,
      deps?.integrationFetchers
    ));

  const hasGitHub = hasEnabledGitHubIntegration(validatedIntegrations);
  const hasLinear = hasEnabledLinearIntegration(validatedIntegrations);
  const hasMcp = (await getEnabledMcpServerCount(organizationId)) > 0;
  const mcpContext = context.filter((item) => item.type === "mcp-server");

  const lastUserMessage = getLastUserMessage(messages);
  const hasNonTextPartsOnLatestTurn = lastUserMessageHasNonTextParts(messages);
  const isAuto = requestedModel === undefined || requestedModel === "auto";

  let selectedModel: string;
  let autoThinkingLevel: AutoThinkingLevel | undefined;
  let decisionReasoning: string;
  let decisionComplexity: "simple" | "complex" = "complex";

  if (isAuto) {
    const decision = await routeMessage(
      lastUserMessage,
      hasGitHub || hasLinear || hasMcp,
      log,
      hasNonTextPartsOnLatestTurn,
      telemetryMetadata
    );
    const auto = selectAutoModel(decision);
    selectedModel = auto.model;
    autoThinkingLevel = auto.thinkingLevel;
    decisionComplexity = decision.complexity;
    decisionReasoning = decision.requiresTools
      ? `auto → ${auto.model}: ${decision.reasoning}`
      : `auto → ${auto.model}: ${decision.reasoning} (tools available by default)`;
  } else {
    selectedModel = requestedModel;
    decisionReasoning = "User selected model explicitly";
  }

  const routingDecision = {
    model: selectedModel,
    complexity: decisionComplexity,
    requiresTools: true,
    reasoning: decisionReasoning,
    thinkingLevel: autoThinkingLevel,
  };

  const modelWithMemory = createModel(
    organizationId,
    routingDecision.model,
    {},
    log
  );

  const postResult: PostToolsResult = {};

  const baseToolSet = buildStandaloneToolSet(
    {
      organizationId,
      chatId,
      userId,
      useMarkup,
      validatedIntegrations,
      postResult,
    },
    {
      resolveContext: deps?.resolveContext,
      resolveLinearContext: deps?.resolveLinearContext,
      resolveGranolaContext: deps?.resolveGranolaContext,
    }
  );
  const { tools, toolCallers } = withStandaloneCodeMode(
    withToolErrorPayloads(baseToolSet.tools)
  );
  const notraToolNames = Object.keys(tools);
  const approvalToolNames = getStandaloneApprovalToolNames();

  const lazyMcpRuntime =
    !chatId || !hasMcp
      ? null
      : await createLazyMcpRuntime({
          organizationId,
          sessionId: chatId,
          surface: "standalone-chat",
          baseActiveToolNames: notraToolNames,
          tools,
          serverIntegrationIds:
            mcpContext.length > 0
              ? mcpContext.map((item) => item.integrationId)
              : undefined,
        });

  const toolingDescription =
    surface === "dashboard-agent"
      ? `${NOTRA_TOOLING_DESCRIPTION} This is the GEO dashboard: call the GEO chart tools directly for AI Traffic, visibility, trend, engine, and competitor questions, and use code_mode for prompt-level results and project context.`
      : NOTRA_TOOLING_DESCRIPTION;
  const descriptions = lazyMcpRuntime
    ? [toolingDescription, ...lazyMcpRuntime.descriptions]
    : [toolingDescription];

  const hasGitHubToolsActive = notraToolNames.some(isGitHubToolName);
  const hasLinearToolsActive = notraToolNames.some(isLinearToolName);
  const repoContext = hasGitHubToolsActive
    ? getRepoContextFromIntegrations(validatedIntegrations)
    : [];
  const linearContext = hasLinearToolsActive
    ? getLinearContextFromIntegrations(validatedIntegrations)
    : [];
  const [skillSummaries, workspace] = await Promise.all([
    getStandaloneSkillSummaries(organizationId),
    loadChatWorkspace({ organizationId, projectId }),
  ]);
  const systemPrompt = getStandaloneChatPrompt({
    skillSummaries,
    repoContext,
    linearContext,
    mcpContext,
    toolDescriptions: descriptions,
    hasGitHubEnabled: hasGitHubToolsActive,
    hasLinearEnabled: hasLinearToolsActive,
    hasMcpEnabled: hasMcp,
    timezone,
    workspace,
  });

  const effectiveThinkingLevel = autoThinkingLevel ?? thinkingLevel;
  const effectiveEnableThinking =
    enableThinking && (autoThinkingLevel ? autoThinkingLevel !== "off" : true);

  const providerOptions = withRouterDefaults(
    getThinkingProviderOptions(
      routingDecision.model,
      effectiveEnableThinking,
      effectiveThinkingLevel
    ),
    { modelId: routingDecision.model }
  );

  const messagesForModel = normalizeMarkdownFileAttachments(
    stripIncompleteToolParts(messages)
  );

  const modelMessages = await convertToModelMessages(messagesForModel, {
    ignoreIncompleteToolCalls: true,
  });
  const getActiveToolNames = async (
    options: Parameters<NonNullable<typeof lazyMcpRuntime>["prepareStep"]>[0]
  ) => {
    const lazyStep = await lazyMcpRuntime?.prepareStep(options);
    return Array.from(
      new Set([
        ...notraToolNames,
        ...(lazyStep?.activeTools?.map(String) ?? []),
      ])
    );
  };

  let firstChunkFired = false;
  const stream = streamText({
    model: modelWithMemory,
    instructions: systemPrompt,
    messages: modelMessages,
    tools,
    // Code-mode-only tools must stay active: the SDK binds code_mode to the
    // active tool set on every step.
    experimental_toolCallers: toolCallers,
    activeTools: Array.from(
      new Set([
        ...notraToolNames,
        ...(lazyMcpRuntime?.initialActiveTools ?? []),
      ])
    ),
    prepareStep: async (options) => ({
      activeTools: await getActiveToolNames(options),
    }),
    toolApproval: ({ toolCall }) =>
      approvalToolNames.has(toolCall.toolName) ||
      lazyMcpRuntime?.requiresApproval(toolCall.toolName)
        ? "user-approval"
        : undefined,
    stopWhen: isStepCount(maxSteps),
    experimental_transform: smoothStream(),
    // Without this, a tool call whose inputs fail schema validation throws an
    // `InvalidToolInputError` that surfaces as a fatal stream error and bricks
    // the chat. Instead, re-derive valid inputs from the schema so the agent
    // can carry on. Unknown tool names can't be repaired this way, so we let
    // them fall through to `onError` where they become a readable message.
    repairToolCall: async ({
      toolCall,
      tools: availableTools,
      inputSchema,
      error,
    }) => {
      if (NoSuchToolError.isInstance(error)) {
        return null;
      }

      const brokenTool = availableTools[toolCall.toolName];
      if (!brokenTool) {
        return null;
      }

      try {
        const { output: repairedInput } = await generateText({
          model: modelWithMemory,
          output: Output.object({ schema: brokenTool.inputSchema }),
          prompt: [
            `The assistant called the tool "${toolCall.toolName}" with inputs that failed validation:`,
            JSON.stringify(toolCall.input),
            "The tool expects inputs matching this JSON schema:",
            JSON.stringify(await inputSchema({ toolName: toolCall.toolName })),
            `Validation error: ${error.message}`,
            "Return corrected inputs that satisfy the schema.",
          ].join("\n"),
          ...buildTelemetryOptions(telemetryMetadata),
        });

        return { ...toolCall, input: JSON.stringify(repairedInput) };
      } catch (repairError) {
        console.error("[Standalone Chat] Tool call repair failed", {
          organizationId,
          toolName: toolCall.toolName,
          error:
            repairError instanceof Error
              ? repairError.message
              : String(repairError),
        });
        return null;
      }
    },
    providerOptions,
    abortSignal,
    ...buildTelemetryOptions(telemetryMetadata),
    onChunk({ chunk }) {
      if (firstChunkFired) {
        return;
      }
      if (chunk.type === "text-delta" || chunk.type === "reasoning-delta") {
        firstChunkFired = true;
        deps?.onFirstChunk?.();
      }
    },
    onAbort({ steps }) {
      console.log("[Standalone Chat Stream Aborted]", {
        organizationId,
        model: routingDecision.model,
        completedSteps: steps.length,
      });
      lazyMcpRuntime?.cleanup().catch(() => undefined);
    },
    async onEnd({ usage, steps }) {
      await deps?.onUsage?.(
        usage,
        routingDecision.model,
        await summarizeRouteUsage(steps, routingDecision.model)
      );
      await lazyMcpRuntime?.cleanup();
    },
    onError({ error }) {
      lazyMcpRuntime?.cleanup().catch(() => undefined);
      console.error("[Standalone Chat Stream Error]", {
        organizationId,
        model: routingDecision.model,
        error: error instanceof Error ? error.message : String(error),
      });
    },
  });

  return { stream, routingDecision };
}

async function getStandaloneSkillSummaries(organizationId: string) {
  return listSkillSummaries(
    { organizationId },
    { limit: STANDALONE_SKILL_CATALOG_LIMIT }
  );
}

function isGitHubToolName(toolName: string) {
  return [
    "getPullRequests",
    "getReleaseByTag",
    "getCommitsByTimeframe",
  ].includes(toolName);
}

function isLinearToolName(toolName: string) {
  return ["getLinearIssues", "getLinearProjects", "getLinearCycles"].includes(
    toolName
  );
}

function lastUserMessageHasNonTextParts(messages: UIMessage[]): boolean {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (!message || message.role !== "user") {
      continue;
    }
    if (!Array.isArray(message.parts)) {
      return false;
    }
    return message.parts.some((part) => part.type !== "text");
  }
  return false;
}

function getLastUserMessage(messages: UIMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (!message || message.role !== "user") {
      continue;
    }
    const parts = message.parts;
    if (!Array.isArray(parts)) {
      continue;
    }
    for (const part of parts) {
      if (part.type === "text") {
        return part.text;
      }
    }
  }
  return "";
}

// Tool-part states that are "complete" from the user's perspective and must
// survive history trimming before `convertToModelMessages` runs. Missing
// `approval-responded` here previously dropped the user's approval payload,
// leaving the conversation ending on an assistant turn — which Bedrock-routed
// Anthropic (Sonnet 4.6 / Opus 4.7 via AI Gateway) rejects with
// "This model does not support assistant message prefill".
const TERMINAL_TOOL_STATES = new Set([
  "output-available",
  "output-error",
  "output-denied",
  "approval-responded",
]);

const STRIP_TAIL_SCAN_DEPTH = 2;

function stripIncompleteToolParts(messages: UIMessage[]): UIMessage[] {
  const scanFrom = Math.max(0, messages.length - STRIP_TAIL_SCAN_DEPTH);
  let hasIncomplete = false;
  for (let index = scanFrom; index < messages.length; index += 1) {
    const message = messages[index];
    if (!(message && Array.isArray(message.parts))) {
      continue;
    }
    if (
      message.parts.some(
        (part) => isToolUIPart(part) && !TERMINAL_TOOL_STATES.has(part.state)
      )
    ) {
      hasIncomplete = true;
      break;
    }
  }
  if (!hasIncomplete) {
    return messages;
  }
  return messages.map((message, index) => {
    if (index < scanFrom || !Array.isArray(message.parts)) {
      return message;
    }
    const filtered = message.parts.filter(
      (part) => !isToolUIPart(part) || TERMINAL_TOOL_STATES.has(part.state)
    );
    if (filtered.length === message.parts.length) {
      return message;
    }
    return { ...message, parts: filtered };
  });
}

async function validateStandaloneIntegrations(
  organizationId: string,
  contextItems: StandaloneChatContextItem[],
  fetchers?: IntegrationFetchers
): Promise<ValidatedIntegration[]> {
  if (!fetchers) {
    return [];
  }

  const [githubFromOrganization, linearFromOrganization] = await Promise.all([
    fetchers.listGitHubIntegrationsByOrganization !== undefined
      ? getEnabledGitHubIntegrations(
          organizationId,
          fetchers.listGitHubIntegrationsByOrganization
        )
      : Promise.resolve<ValidatedIntegration[]>([]),
    fetchers.listLinearIntegrationsByOrganization !== undefined
      ? getEnabledLinearIntegrations(
          organizationId,
          fetchers.listLinearIntegrationsByOrganization
        )
      : Promise.resolve<ValidatedIntegration[]>([]),
  ]);

  if (githubFromOrganization.length > 0 || linearFromOrganization.length > 0) {
    return [...githubFromOrganization, ...linearFromOrganization];
  }

  if (!contextItems.length) {
    return [];
  }

  const validatedIntegrations: ValidatedIntegration[] = [];

  const githubItems = contextItems.filter((c) => c.type === "github-repo");
  const linearItems = contextItems.filter((c) => c.type === "linear-team");

  if (githubItems.length > 0 && fetchers.getGitHubIntegrationById) {
    const integrationIds = [
      ...new Set(githubItems.map((c) => c.integrationId)),
    ];

    for (const integrationId of integrationIds) {
      try {
        const integration =
          await fetchers.getGitHubIntegrationById(integrationId);

        if (
          !integration ||
          integration.organizationId !== organizationId ||
          !integration.enabled
        ) {
          continue;
        }

        const contextRepos = githubItems
          .filter((c) => c.integrationId === integrationId)
          .map((c) => ({ owner: c.owner, repo: c.repo }));

        const enabledRepos = integration.repositories
          .filter((r) => {
            if (!r.enabled) {
              return false;
            }
            return contextRepos.some(
              (cr) => cr.owner === r.owner && cr.repo === r.repo
            );
          })
          .map((r) => ({
            id: r.id,
            owner: r.owner,
            repo: r.repo,
            defaultBranch: r.defaultBranch ?? null,
            enabled: r.enabled,
          }));

        if (enabledRepos.length === 0) {
          continue;
        }

        validatedIntegrations.push({
          id: integration.id,
          type: "github",
          enabled: integration.enabled,
          displayName: integration.displayName,
          organizationId: integration.organizationId,
          repositories: enabledRepos,
        });
      } catch (error) {
        console.error(
          `[Standalone Chat] Error validating GitHub integration ${integrationId}:`,
          error
        );
      }
    }
  }

  if (linearItems.length > 0 && fetchers.getLinearIntegrationById) {
    const integrationIds = [
      ...new Set(linearItems.map((c) => c.integrationId)),
    ];

    for (const integrationId of integrationIds) {
      try {
        const integration =
          await fetchers.getLinearIntegrationById(integrationId);

        if (
          !integration ||
          integration.organizationId !== organizationId ||
          !integration.enabled
        ) {
          continue;
        }

        validatedIntegrations.push({
          id: integration.id,
          type: "linear",
          enabled: integration.enabled,
          displayName: integration.displayName,
          organizationId: integration.organizationId,
          linearTeamId: integration.linearTeamId,
          linearTeamName: integration.linearTeamName,
        });
      } catch (error) {
        console.error(
          `[Standalone Chat] Error validating Linear integration ${integrationId}:`,
          error
        );
      }
    }
  }

  return validatedIntegrations;
}

async function getEnabledGitHubIntegrations(
  organizationId: string,
  listGitHubIntegrationsByOrganization: NonNullable<
    IntegrationFetchers["listGitHubIntegrationsByOrganization"]
  >
): Promise<ValidatedIntegration[]> {
  try {
    const integrations =
      await listGitHubIntegrationsByOrganization(organizationId);

    return integrations
      .filter((integration) => integration.enabled)
      .map((integration) => ({
        id: integration.id,
        type: "github" as const,
        enabled: integration.enabled,
        displayName: integration.displayName,
        organizationId: integration.organizationId,
        repositories: integration.repositories
          .filter((repository) => repository.enabled)
          .map((repository) => ({
            id: repository.id,
            owner: repository.owner,
            repo: repository.repo,
            defaultBranch: repository.defaultBranch ?? null,
            enabled: repository.enabled,
          })),
      }))
      .filter((integration) => integration.repositories.length > 0);
  } catch (error) {
    console.error(
      `[Standalone Chat] Error listing GitHub integrations for org ${organizationId}:`,
      error
    );
    return [];
  }
}

async function getEnabledLinearIntegrations(
  organizationId: string,
  listLinearIntegrationsByOrganization: NonNullable<
    IntegrationFetchers["listLinearIntegrationsByOrganization"]
  >
): Promise<ValidatedIntegration[]> {
  try {
    const integrations =
      await listLinearIntegrationsByOrganization(organizationId);

    return integrations
      .filter((integration) => integration.enabled)
      .map((integration) => ({
        id: integration.id,
        type: "linear" as const,
        enabled: integration.enabled,
        displayName: integration.displayName,
        organizationId: integration.organizationId,
        linearTeamId: integration.linearTeamId,
        linearTeamName: integration.linearTeamName,
      }));
  } catch (error) {
    console.error(
      `[Standalone Chat] Error listing Linear integrations for org ${organizationId}:`,
      error
    );
    return [];
  }
}
