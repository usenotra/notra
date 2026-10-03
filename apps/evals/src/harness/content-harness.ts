/**
 * Replica of the background content agent (packages/ai/src/agents/background-gen.ts)
 * with the real prompts and the real tool definitions. Only the tools' `execute`
 * functions are swapped for fixture data, so no DB, GitHub or Redis is touched.
 */
import { createGateway } from "@ai-sdk/gateway";
import { buildContentDispatcherInstructions } from "@notra/ai/prompts/content-dispatcher";
import { getUserPrompt } from "@notra/ai/prompts/user";
import { getValidToneProfile } from "@notra/ai/schemas/tone";
import { renderSkillToolOutput } from "@notra/ai/skills/functions/guidance";
import { buildSystemSkills } from "@notra/ai/skills/system-skills";
import {
  createGetBrandReferencesTool,
  createSearchBrandReferencesTool,
} from "@notra/ai/tools/brand-references";
import { buildGitHubDataTools } from "@notra/ai/tools/github";
import { buildLinearDataTools } from "@notra/ai/tools/linear";
import {
  createCreatePostTool,
  createFailTool,
  createSkipTool,
  createUpdatePostTool,
  createViewPostTool,
} from "@notra/ai/tools/post";
import { getSkillByName, listAvailableSkills } from "@notra/ai/tools/skills";
import type {
  PostToolsConfig,
  PostToolsResult,
} from "@notra/ai/types/post-tools";
import type { BaseTonePromptInput } from "@notra/ai/types/prompts";
import {
  generateText,
  isStepCount,
  type ModelMessage,
  type Tool,
  ToolLoopAgent,
} from "ai";

import { PROD_GATEWAY_CACHING } from "../constants/gateway";
import type { ContentScenario } from "../fixtures/content-scenarios";
import type { TokenUsage } from "../types/eval";

export type ContentTypeId =
  | "changelog"
  | "blog_post"
  | "linkedin_post"
  | "twitter_post";

export interface ContentTypeConfig {
  readonly id: ContentTypeId;
  readonly skillName: string;
  readonly contentLabel: string;
  readonly brandAgentType: string;
  readonly includeSearchBrandReferencesTool: boolean;
}

/** Mirrors packages/ai/src/agents/{changelog,blog-post,linkedin,twitter}.ts */
export const CONTENT_TYPES: Record<ContentTypeId, ContentTypeConfig> = {
  changelog: {
    id: "changelog",
    skillName: "changelog",
    contentLabel: "changelog",
    brandAgentType: "changelog",
    includeSearchBrandReferencesTool: false,
  },
  blog_post: {
    id: "blog_post",
    skillName: "blog-post",
    contentLabel: "blog post",
    brandAgentType: "blog_post",
    includeSearchBrandReferencesTool: false,
  },
  linkedin_post: {
    id: "linkedin_post",
    skillName: "linkedin",
    contentLabel: "LinkedIn post",
    brandAgentType: "linkedin",
    includeSearchBrandReferencesTool: false,
  },
  twitter_post: {
    id: "twitter_post",
    skillName: "twitter",
    contentLabel: "tweet",
    brandAgentType: "twitter",
    includeSearchBrandReferencesTool: true,
  },
};

export interface HarnessPost {
  title: string;
  markdown: string;
  slug?: string | null;
  recommendations?: string | null;
}

export type HarnessDecision = "create" | "skip" | "fail" | "none";

export interface HarnessOutput {
  decision: HarnessDecision;
  post?: HarnessPost;
  reason?: string;
  toolCalls: string[];
  steps: number;
  /** Rejected or failed tool calls, e.g. a skip reason over 300 chars. */
  toolErrors?: string[];
}

const EVAL_ORG_ID = "org_eval";
const EVAL_COLLECTION_ID = "col_eval";

/** Same shape as apps/dashboard/src/workflows/steps/schedule-generation-step.ts */
export function buildPromptInput(
  scenario: ContentScenario
): BaseTonePromptInput {
  return {
    sourceTargets: `${scenario.owner}/${scenario.repo} (integrationId: ${scenario.integrationId})`,
    todayUtc: scenario.todayUtc,
    lookbackLabel: scenario.lookbackLabel,
    lookbackStartIso: scenario.lookbackStartIso,
    lookbackEndIso: scenario.lookbackEndIso,
    companyName: scenario.brand.companyName,
    companyDescription: scenario.brand.companyDescription,
    audience: scenario.brand.audience,
    customInstructions: null,
    language: scenario.brand.language,
    toneProfile: getValidToneProfile(
      scenario.brand.toneProfile,
      "Conversational"
    ),
    customTone: scenario.brand.customTone ?? null,
  };
}

function skillCatalog() {
  return buildSystemSkills().sort((a, b) => a.name.localeCompare(b.name));
}

function skillPayload(name: string) {
  const skill = skillCatalog().find((item) => item.name === name);
  if (!skill) {
    return {
      error: `Skill "${name}" not found. Use listAvailableSkills to see available skills.`,
    };
  }
  return {
    name: skill.name,
    description: skill.description,
    content: skill.content.trim(),
    skillContent: renderSkillToolOutput(skill),
  };
}

function assertIntegration(scenario: ContentScenario, integrationId: string) {
  if (integrationId !== scenario.integrationId) {
    throw new Error(
      `Integration ${integrationId} is not allowed for this request.`
    );
  }
}

const fixtureData = {
  commits(scenario: ContentScenario) {
    return {
      commits: scenario.commits.map((commit) => ({
        ...commit,
        url: `https://github.com/${scenario.owner}/${scenario.repo}/commit/${commit.sha}`,
      })),
      pagination: { page: 1, perPage: 100, hasNextPage: false, nextPage: null },
    };
  },
  pullRequest(scenario: ContentScenario, pullNumber: number) {
    const pr = scenario.pullRequests.find((item) => item.number === pullNumber);
    if (!pr) {
      throw new Error(
        "Not Found - https://docs.github.com/rest/pulls/pulls#get-a-pull-request"
      );
    }
    return {
      id: pr.number * 1000,
      number: pr.number,
      title: pr.title,
      body: pr.body,
      state: "closed",
      isDraft: false,
      merged: true,
      mergeableState: "unknown",
      authorLogin: pr.authorLogin,
      authorAssociation: "MEMBER",
      labels: pr.labels,
      requestedReviewers: [],
      head: { ref: `pr-${pr.number}`, sha: "0000000" },
      base: { ref: "main", sha: "0000000" },
      stats: {
        commits: 1,
        additions: pr.additions,
        deletions: pr.deletions,
        changedFiles: pr.changedFiles,
        comments: 0,
        reviewComments: 0,
      },
      createdAt: pr.mergedAt,
      updatedAt: pr.mergedAt,
      closedAt: pr.mergedAt,
      mergedAt: pr.mergedAt,
      htmlUrl: `https://github.com/${scenario.owner}/${scenario.repo}/pull/${pr.number}`,
    };
  },
  release(scenario: ContentScenario, tag: string) {
    const normalized = tag.trim().toLowerCase();
    const release =
      normalized === "latest"
        ? scenario.releases[0]
        : scenario.releases.find(
            (item) => item.tagName.toLowerCase() === normalized
          );
    if (!release) {
      throw new Error(
        "Not Found - https://docs.github.com/rest/releases/releases"
      );
    }
    return {
      id: 1,
      tagName: release.tagName,
      targetCommitish: "main",
      name: release.name,
      body: release.body,
      draft: false,
      prerelease: false,
      immutable: false,
      authorLogin: "release-bot",
      createdAt: release.publishedAt,
      publishedAt: release.publishedAt,
      updatedAt: release.publishedAt,
      htmlUrl: `https://github.com/${scenario.owner}/${scenario.repo}/releases/tag/${release.tagName}`,
      discussionUrl: null,
      mentionsCount: 0,
      assets: [],
    };
  },
  brandReferences(scenario: ContentScenario) {
    return {
      references: scenario.brand.references.map((reference) => ({
        type: reference.type,
        content: reference.content,
        note: reference.note ?? null,
      })),
      count: scenario.brand.references.length,
    };
  },
};

function withExecute(base: Tool, execute: (input: any) => unknown): Tool {
  return { ...base, execute: async (input: unknown) => execute(input) } as Tool;
}

interface HarnessState {
  result: PostToolsResult;
  posts: HarnessPost[];
}

/** Real tool definitions from @notra/ai with fixture-backed execute functions. */
export function buildHarnessTools(
  scenario: ContentScenario,
  contentType: ContentTypeConfig,
  state: HarnessState
): Record<string, Tool> {
  const config: PostToolsConfig = {
    organizationId: EVAL_ORG_ID,
    collectionId: EVAL_COLLECTION_ID,
    contentType: contentType.id,
  };
  const github = buildGitHubDataTools({
    organizationId: EVAL_ORG_ID,
    allowedIntegrationIds: [scenario.integrationId],
  });
  // Schedules only attach Linear tools when Linear is connected
  // (dataPointSettings.includeLinearData = hasLinear); no scenario has Linear.
  const linear = buildLinearDataTools({
    organizationId: EVAL_ORG_ID,
    allowedIntegrationIds: [],
    dataPointSettings: { includeLinearData: false },
  });

  const tools: Record<string, Tool> = {
    getBrandReferences: withExecute(
      createGetBrandReferencesTool({
        organizationId: EVAL_ORG_ID,
        agentType: contentType.brandAgentType,
      } as never),
      () => fixtureData.brandReferences(scenario)
    ),
  };
  if (contentType.includeSearchBrandReferencesTool) {
    tools.searchBrandReferences = withExecute(
      createSearchBrandReferencesTool({
        organizationId: EVAL_ORG_ID,
        agentType: contentType.brandAgentType,
      } as never),
      () => fixtureData.brandReferences(scenario)
    );
  }

  for (const [name, base] of Object.entries(github)) {
    tools[name] = withExecute(base, (input: Record<string, unknown>) => {
      assertIntegration(scenario, String(input.integrationId));
      if (name === "getCommitsByTimeframe") {
        return fixtureData.commits(scenario);
      }
      if (name === "getPullRequests") {
        return fixtureData.pullRequest(scenario, Number(input.pull_number));
      }
      return fixtureData.release(scenario, String(input.tag ?? "latest"));
    });
  }
  for (const [name, base] of Object.entries(linear)) {
    tools[name] = withExecute(base, (input: Record<string, unknown>) => {
      throw new Error(
        `Integration ${String(input.integrationId)} is not allowed for this request.`
      );
    });
  }

  tools.listAvailableSkills = withExecute(
    listAvailableSkills({ organizationId: EVAL_ORG_ID }),
    () => {
      const skills = skillCatalog().map((skill) => ({
        name: skill.name,
        description: skill.description,
        isSystem: true,
      }));
      return { skills, total: skills.length };
    }
  );
  tools.getSkillByName = withExecute(
    getSkillByName({ organizationId: EVAL_ORG_ID }),
    (input: { name: string }) => skillPayload(input.name)
  );

  // background-gen registers it as `createPost` for every content type.
  tools.createPost = withExecute(
    createCreatePostTool(config, state.result),
    (input: HarnessPost) => {
      state.posts.push(input);
      const postId = `post_${state.posts.length}`;
      state.result.posts ??= [];
      state.result.posts.push({
        postId,
        title: input.title,
        recommendations: input.recommendations ?? null,
      });
      return { postId, status: "created", totalCreated: state.posts.length };
    }
  );
  tools.updatePost = withExecute(
    createUpdatePostTool(config, state.result),
    (input: { postId: string } & Partial<HarnessPost>) => {
      const index = Number(input.postId.replace("post_", "")) - 1;
      const existing = state.posts[index];
      if (!existing) {
        return { postId: input.postId, status: "not_found" };
      }
      state.posts[index] = {
        ...existing,
        ...Object.fromEntries(
          Object.entries(input).filter(([, value]) => value !== undefined)
        ),
      } as HarnessPost;
      return { postId: input.postId, status: "updated" };
    }
  );
  tools.viewPost = withExecute(
    createViewPostTool(config),
    (input: { postId: string }) => {
      const post = state.posts[Number(input.postId.replace("post_", "")) - 1];
      return post
        ? { postId: input.postId, ...post }
        : { error: "Post not found" };
    }
  );
  tools.skip = withExecute(
    createSkipTool(state.result),
    (input: { reason: string }) => {
      state.result.skipReason = input.reason;
      return { status: "skipped", reason: input.reason };
    }
  );
  tools.fail = withExecute(
    createFailTool(state.result),
    (input: { reason: string }) => {
      state.result.failReason = input.reason;
      return { status: "failed", reason: input.reason };
    }
  );
  return tools;
}

let gatewayInstance: ReturnType<typeof createGateway> | undefined;
function model(modelId: string) {
  gatewayInstance ??= createGateway({
    apiKey: process.env.AI_GATEWAY_API_KEY?.trim(),
  });
  return gatewayInstance(modelId);
}

function sumUsage(usage: {
  inputTokens?: number;
  outputTokens?: number;
  inputTokenDetails?: { cacheReadTokens?: number };
}): TokenUsage {
  return {
    inputTokens: usage.inputTokens ?? 0,
    outputTokens: usage.outputTokens ?? 0,
    cachedInputTokens: usage.inputTokenDetails?.cacheReadTokens ?? 0,
  };
}

interface StepLike {
  content: readonly { type: string; toolName?: string; error?: unknown }[];
}

/** Tool calls the SDK rejected (invalid input) or whose execute threw. */
function collectToolErrors(steps: readonly StepLike[]): string[] {
  const errors: string[] = [];
  for (const step of steps) {
    for (const part of step.content) {
      if (part.type === "tool-error") {
        const message =
          part.error instanceof Error ? part.error.message : String(part.error);
        errors.push(`${part.toolName ?? "tool"}: ${message.slice(0, 300)}`);
      }
    }
  }
  return errors;
}

function toOutput(
  state: HarnessState,
  toolCalls: string[],
  steps: number,
  toolErrors: string[]
): HarnessOutput {
  const base = { toolCalls, steps, toolErrors };
  const post = state.posts[0];
  if (post) {
    return { decision: "create", post, ...base };
  }
  if (state.result.skipReason) {
    return { decision: "skip", reason: state.result.skipReason, ...base };
  }
  if (state.result.failReason) {
    return { decision: "fail", reason: state.result.failReason, ...base };
  }
  return { decision: "none", ...base };
}

export function transcriptFor(output: HarnessOutput): string {
  const lines = [
    `decision: ${output.decision}`,
    `steps: ${output.steps}`,
    `tools: ${output.toolCalls.join(" → ") || "none"}`,
  ];
  if (output.reason) {
    lines.push(`reason: ${output.reason}`);
  }
  for (const error of output.toolErrors ?? []) {
    lines.push(`tool error: ${error}`);
  }
  if (output.post) {
    lines.push("", `# ${output.post.title}`, "", output.post.markdown);
    if (output.post.recommendations) {
      lines.push("", "---", "recommendations:", output.post.recommendations);
    }
  }
  return lines.join("\n");
}

export interface RunAgentParams {
  modelId: string;
  scenario: ContentScenario;
  contentType: ContentTypeConfig;
  abortSignal: AbortSignal;
}

export interface AgentRun {
  output: HarnessOutput;
  usage: TokenUsage;
  providerMetadata: unknown;
}

/** Full agent loop, same settings as runBackgroundGen. */
export async function runContentAgent(
  params: RunAgentParams
): Promise<AgentRun> {
  const state: HarnessState = { result: {}, posts: [] };
  const agent = new ToolLoopAgent({
    model: model(params.modelId),
    providerOptions: {
      anthropic: { thinking: { type: "adaptive" } },
      gateway: {
        tags: ["eval-content-generation"],
        disallowPromptTraining: true,
        caching: PROD_GATEWAY_CACHING,
      },
    },
    tools: buildHarnessTools(params.scenario, params.contentType, state),
    instructions: buildContentDispatcherInstructions({
      contentLabel: params.contentType.contentLabel,
      contentType: params.contentType.id,
      primarySkillName: params.contentType.skillName,
    }),
    stopWhen: isStepCount(50),
    maxRetries: 0,
  });
  const result = await agent.generate({
    prompt: getUserPrompt(
      params.contentType.contentLabel,
      buildPromptInput(params.scenario)
    ),
    abortSignal: params.abortSignal,
  });
  const toolCalls = result.steps.flatMap((step) =>
    step.toolCalls.map((call) => call.toolName)
  );
  return {
    output: toOutput(
      state,
      toolCalls,
      result.steps.length,
      collectToolErrors(result.steps)
    ),
    usage: sumUsage(result.totalUsage),
    providerMetadata: result.providerMetadata,
  };
}

interface ReplayedCall {
  toolName: string;
  input: Record<string, unknown>;
  output: unknown;
  isError?: boolean;
}

/**
 * The tool calls a well-behaved agent makes before writing: skills, brand voice,
 * then every source the scenario has. Replayed so the draft stage starts from
 * identical context for every model.
 */
export function gatheringCalls(
  scenario: ContentScenario,
  contentType: ContentTypeConfig
): ReplayedCall[] {
  const skills = skillCatalog().map((skill) => ({
    name: skill.name,
    description: skill.description,
    isSystem: true,
  }));
  const calls: ReplayedCall[] = [
    {
      toolName: "listAvailableSkills",
      input: { limit: 20, offset: 0 },
      output: { skills, total: skills.length },
    },
    {
      toolName: "getSkillByName",
      input: { name: contentType.skillName },
      output: skillPayload(contentType.skillName),
    },
    {
      toolName: "getBrandReferences",
      input: {},
      output: fixtureData.brandReferences(scenario),
    },
    {
      toolName: "getCommitsByTimeframe",
      input: {
        integrationId: scenario.integrationId,
        page: 1,
        since: scenario.lookbackStartIso,
        until: scenario.lookbackEndIso,
      },
      output: fixtureData.commits(scenario),
    },
  ];
  for (const pr of scenario.pullRequests) {
    calls.push({
      toolName: "getPullRequests",
      input: { integrationId: scenario.integrationId, pull_number: pr.number },
      output: fixtureData.pullRequest(scenario, pr.number),
    });
  }
  if (scenario.releases.length > 0) {
    calls.push({
      toolName: "getReleaseByTag",
      input: { integrationId: scenario.integrationId, tag: "latest" },
      output: fixtureData.release(scenario, "latest"),
    });
  }
  calls.push({
    toolName: "getSkillByName",
    input: { name: "unslop" },
    output: skillPayload("unslop"),
  });
  return calls;
}

export function replayMessages(
  prompt: string,
  calls: readonly ReplayedCall[]
): ModelMessage[] {
  const messages: ModelMessage[] = [{ role: "user", content: prompt }];
  calls.forEach((call, index) => {
    const toolCallId = `call_${index + 1}`;
    messages.push({
      role: "assistant",
      content: [
        {
          type: "tool-call",
          toolCallId,
          toolName: call.toolName,
          input: call.input,
        },
      ],
    });
    messages.push({
      role: "tool",
      content: [
        {
          type: "tool-result",
          toolCallId,
          toolName: call.toolName,
          output: call.isError
            ? { type: "error-text", value: String(call.output) }
            : { type: "json", value: call.output as never },
        },
      ],
    });
  });
  return messages;
}

export interface DraftParams extends RunAgentParams {
  /** Extra messages appended after the replayed gathering calls. */
  followUp?: ModelMessage[];
  /** Restrict the tool set (default: every harness tool). */
  finishTools?: readonly string[];
}

const MAX_DRAFT_STEPS = 12;

function hasFinished(state: HarnessState): boolean {
  return Boolean(
    state.posts.length > 0 || state.result.skipReason || state.result.failReason
  );
}

/**
 * Draft stage only: same system prompt and tools, gathering already replayed,
 * so every model writes from identical context.
 */
export async function runDraftStage(params: DraftParams): Promise<AgentRun> {
  const state: HarnessState = { result: {}, posts: [] };
  const allTools = buildHarnessTools(
    params.scenario,
    params.contentType,
    state
  );
  const tools = params.finishTools
    ? Object.fromEntries(
        Object.entries(allTools).filter(([name]) =>
          params.finishTools?.includes(name)
        )
      )
    : allTools;
  const messages = [
    ...replayMessages(
      getUserPrompt(
        params.contentType.contentLabel,
        buildPromptInput(params.scenario)
      ),
      gatheringCalls(params.scenario, params.contentType)
    ),
    ...(params.followUp ?? []),
  ];
  const result = await generateText({
    model: model(params.modelId),
    instructions: buildContentDispatcherInstructions({
      contentLabel: params.contentType.contentLabel,
      contentType: params.contentType.id,
      primarySkillName: params.contentType.skillName,
    }),
    messages,
    tools,
    // The loop continues from the replayed state: the model may still load a
    // supporting skill or retry a rejected call (e.g. a skip reason over 300
    // chars). Stop as soon as one createPost/skip/fail lands.
    stopWhen: [isStepCount(MAX_DRAFT_STEPS), () => hasFinished(state)],
    maxRetries: 0,
    abortSignal: params.abortSignal,
    providerOptions: {
      anthropic: { thinking: { type: "adaptive" } },
      gateway: {
        tags: ["eval-content-draft"],
        disallowPromptTraining: true,
        caching: PROD_GATEWAY_CACHING,
      },
    },
  });
  const toolCalls = result.steps.flatMap((step) =>
    step.toolCalls.map((call) => call.toolName)
  );
  return {
    output: toOutput(
      state,
      toolCalls,
      result.steps.length,
      collectToolErrors(result.steps)
    ),
    usage: sumUsage(result.totalUsage),
    providerMetadata: result.providerMetadata,
  };
}
