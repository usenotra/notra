import type {
  LanguageModelV4,
  LanguageModelV4CallOptions,
  LanguageModelV4Content,
  LanguageModelV4FunctionTool,
  LanguageModelV4Prompt,
  LanguageModelV4StreamPart,
} from "@ai-sdk/provider";
import {
  DEMO_BACKGROUND_POSTS,
  DEMO_BACKGROUND_WRITER_TOOLS,
  DEMO_CHAT_FALLBACK,
  DEMO_CHAT_SCENARIOS,
  DEMO_FAKE_TITLES,
  DEMO_GERMAN_HINT,
  DEMO_MODEL_PROVIDER,
  DEMO_STREAM_CHUNK_DELAY_MS,
  DEMO_TOOL_HINTS,
} from "@notra/ai/constants/demo-responses";
import type {
  DemoChatScenario,
  DemoJsonSchema,
  DemoToolArgs,
} from "@notra/ai/types/demo-model";
import { fakeFromJsonSchema } from "@notra/ai/utils/demo-json-schema";
import { simulateReadableStream } from "ai";

const SHORT_OUTPUT_TOKEN_LIMIT = 200;
const STREAM_INITIAL_DELAY_MS = 250;
const WORD_CHUNK = /\S+\s*/g;

type DemoPlan =
  | { kind: "text"; text: string }
  | { kind: "tool"; text: string; toolName: string; input: DemoToolArgs };

function messageText(message: LanguageModelV4Prompt[number]): string {
  if (typeof message.content === "string") {
    return message.content;
  }
  return message.content
    .map((part) => (part.type === "text" ? part.text : ""))
    .join(" ");
}

function lastUserText(prompt: LanguageModelV4Prompt): string {
  for (let index = prompt.length - 1; index >= 0; index--) {
    const message = prompt[index];
    if (message?.role === "user") {
      return messageText(message);
    }
  }
  return "";
}

function answeredToolCall(prompt: LanguageModelV4Prompt): boolean {
  return prompt.at(-1)?.role === "tool";
}

function functionTools(
  options: LanguageModelV4CallOptions
): LanguageModelV4FunctionTool[] {
  return (options.tools ?? []).filter(
    (tool): tool is LanguageModelV4FunctionTool => tool.type === "function"
  );
}

function toolArguments(
  tool: LanguageModelV4FunctionTool,
  seed: string,
  german: boolean,
  overrides: DemoToolArgs = {}
): DemoToolArgs {
  const schema: DemoJsonSchema = tool.inputSchema;
  const generated = fakeFromJsonSchema(schema, tool.name, {
    root: schema,
    seed,
    german,
    depth: 0,
  });
  const base =
    generated && typeof generated === "object" && !Array.isArray(generated)
      ? (generated as DemoToolArgs)
      : {};
  const allowed = new Set(Object.keys(schema.properties ?? {}));
  for (const [key, value] of Object.entries(overrides)) {
    if (allowed.has(key)) {
      base[key] = value;
    }
  }
  return base;
}

function localized(
  text: { en: string; de: string } | undefined,
  german: boolean
): string {
  if (!text) {
    return "";
  }
  return german ? text.de : text.en;
}

function pickScenario(text: string): DemoChatScenario | undefined {
  return DEMO_CHAT_SCENARIOS.find((scenario) => scenario.pattern.test(text));
}

function scenarioText(
  scenario: DemoChatScenario | undefined,
  german: boolean
): string {
  if (!scenario) {
    return german ? DEMO_CHAT_FALLBACK.de : DEMO_CHAT_FALLBACK.en;
  }
  // Without the matching tool, show the result inline instead of promising
  // an action that cannot happen.
  const args = scenario.toolArgs?.(german);
  if (typeof args?.markdown === "string") {
    return `**${String(args.title ?? "")}**\n\n${args.markdown}`;
  }
  const text = scenario.followUp ?? scenario.reply;
  return german ? text.de : text.en;
}

/** Decides what the fake model answers for one call. */
function planResponse(options: LanguageModelV4CallOptions): DemoPlan {
  const userText = lastUserText(options.prompt);
  const german = DEMO_GERMAN_HINT.test(userText);
  const seed = userText.slice(0, 200);

  if (options.responseFormat?.type === "json") {
    const schema: DemoJsonSchema = options.responseFormat.schema ?? {};
    const value = fakeFromJsonSchema(
      schema,
      options.responseFormat.name ?? "",
      {
        root: schema,
        seed,
        german,
        depth: 0,
      }
    );
    return { kind: "text", text: JSON.stringify(value) };
  }

  const scenario = pickScenario(userText);
  const tools = functionTools(options);
  const toolChoice = options.toolChoice?.type ?? "auto";

  if (answeredToolCall(options.prompt)) {
    const followUp = scenario?.followUp ?? scenario?.reply;
    return { kind: "text", text: localized(followUp, german) || "Done." };
  }

  const backgroundWriter = DEMO_BACKGROUND_WRITER_TOOLS.every((name) =>
    tools.some((tool) => tool.name === name)
  );
  if (backgroundWriter) {
    const createPost = tools.find((tool) => tool.name === "createPost");
    const allText = options.prompt.map(messageText).join("\n");
    const post = DEMO_BACKGROUND_POSTS.find((candidate) =>
      candidate.pattern.test(allText)
    );
    if (createPost && post) {
      return {
        kind: "tool",
        text: "",
        toolName: createPost.name,
        input: toolArguments(createPost, seed, false, {
          title: post.title,
          markdown: post.markdown,
          slug: null,
          recommendations: null,
        }),
      };
    }
  }

  if (toolChoice !== "none" && tools.length > 0) {
    const choice = options.toolChoice;
    const forcedName = choice?.type === "tool" ? choice.toolName : undefined;
    const forced = forcedName
      ? tools.find((tool) => tool.name === forcedName)
      : undefined;
    const candidates = scenario?.toolPattern
      ? tools.filter((tool) => scenario.toolPattern?.test(tool.name))
      : [];
    const hinted = DEMO_TOOL_HINTS.find(
      (hint) =>
        hint.pattern.test(userText) &&
        candidates.some((tool) => tool.name === hint.toolName)
    );
    const matched = hinted
      ? candidates.find((tool) => tool.name === hinted.toolName)
      : candidates[0];
    const tool =
      forced ?? matched ?? (toolChoice === "required" ? tools[0] : undefined);
    if (tool) {
      return {
        kind: "tool",
        text: localized(scenario?.reply, german),
        toolName: tool.name,
        input: toolArguments(tool, seed, german, scenario?.toolArgs?.(german)),
      };
    }
  }

  // Short-output calls are titles, labels and commit messages.
  if (
    options.maxOutputTokens !== undefined &&
    options.maxOutputTokens < SHORT_OUTPUT_TOKEN_LIMIT
  ) {
    const titles = german ? DEMO_FAKE_TITLES.de : DEMO_FAKE_TITLES.en;
    return { kind: "text", text: titles[seed.length % titles.length] ?? "" };
  }

  return { kind: "text", text: scenarioText(scenario, german) };
}

function usageFor(text: string) {
  const outputTokens = Math.max(1, Math.ceil(text.length / 4));
  return {
    inputTokens: {
      total: 1200,
      noCache: 1200,
      cacheRead: undefined,
      cacheWrite: undefined,
    },
    outputTokens: { total: outputTokens, text: outputTokens, reasoning: 0 },
  };
}

function toolCallId(): string {
  return `demo_call_${crypto.randomUUID().slice(0, 8)}`;
}

function streamParts(plan: DemoPlan): LanguageModelV4StreamPart[] {
  const parts: LanguageModelV4StreamPart[] = [
    { type: "stream-start", warnings: [] },
  ];
  if (plan.text) {
    parts.push({ type: "text-start", id: "text-1" });
    for (const word of plan.text.match(WORD_CHUNK) ?? [plan.text]) {
      parts.push({ type: "text-delta", id: "text-1", delta: word });
    }
    parts.push({ type: "text-end", id: "text-1" });
  }
  if (plan.kind === "tool") {
    const id = toolCallId();
    const input = JSON.stringify(plan.input);
    parts.push(
      { type: "tool-input-start", id, toolName: plan.toolName },
      { type: "tool-input-delta", id, delta: input },
      { type: "tool-input-end", id },
      { type: "tool-call", toolCallId: id, toolName: plan.toolName, input }
    );
  }
  parts.push({
    type: "finish",
    usage: usageFor(plan.text),
    finishReason:
      plan.kind === "tool"
        ? { unified: "tool-calls", raw: undefined }
        : { unified: "stop", raw: undefined },
  });
  return parts;
}

function generateContent(plan: DemoPlan): LanguageModelV4Content[] {
  const content: LanguageModelV4Content[] = [];
  if (plan.text) {
    content.push({ type: "text", text: plan.text });
  }
  if (plan.kind === "tool") {
    content.push({
      type: "tool-call",
      toolCallId: toolCallId(),
      toolName: plan.toolName,
      input: JSON.stringify(plan.input),
    });
  }
  return content;
}

/**
 * A language model that never leaves the process. It answers structured
 * output calls with schema-valid data, chat with canned Fieldnote scenarios
 * and calls matching tools, so agent flows run end to end in the demo.
 */
export function createDemoLanguageModel(modelId: string): LanguageModelV4 {
  return {
    specificationVersion: "v4",
    provider: DEMO_MODEL_PROVIDER,
    modelId,
    supportedUrls: {},
    doGenerate: async (options) => {
      const plan = planResponse(options);
      return {
        content: generateContent(plan),
        finishReason:
          plan.kind === "tool"
            ? { unified: "tool-calls", raw: undefined }
            : { unified: "stop", raw: undefined },
        usage: usageFor(plan.text),
        warnings: [],
        response: { id: `demo-${crypto.randomUUID()}`, modelId },
      };
    },
    doStream: async (options) => {
      const plan = planResponse(options);
      return {
        stream: simulateReadableStream({
          chunks: streamParts(plan),
          initialDelayInMs: STREAM_INITIAL_DELAY_MS,
          chunkDelayInMs: DEMO_STREAM_CHUNK_DELAY_MS,
        }),
      };
    },
  };
}
