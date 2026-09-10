import {
  GEO_CLAUDE_CODE_EFFORT,
  GEO_CODEX_REASONING_EFFORT,
  GEO_CODEX_WEB_SEARCH,
  GEO_OPENCODE_BOX_API_KEY_ENV,
  GEO_OPENCODE_BOX_MODEL_ID,
  GEO_OPENCODE_MODEL_API_KEY_ENV,
  GEO_OPENCODE_REASONING_EFFORT,
  GEO_OPENCODE_RUN_TIMEOUT_MS,
  GEO_OPENCODE_SOURCE_LIMIT,
} from "@notra/ai/constants/geo-opencode";
import type { GeoBoxHarness } from "@notra/ai/types/geo-opencode";
import {
  createGeoOpenCodeBoxName,
  createGeoOpenCodeBox,
  deleteGeoOpenCodeBox,
} from "@notra/ai/utils/geo-opencode-box";
import { extractHttpUrls } from "@notra/ai/utils/geo-opencode-sources";
import { geoBoxTokenUsage } from "@notra/ai/utils/geo-opencode-usage";
import { requireApiKey } from "@notra/utils/require-api-key";
import type {
  Chunk,
  ClaudeCodeAgentOptions,
  CodexAgentOptions,
  OpenCodeAgentOptions,
  StreamRun,
} from "@upstash/box";
import { Agent, Box, BoxApiKey, BoxError } from "@upstash/box";

function boxAgentFromHarness(harness: GeoBoxHarness | undefined): Agent {
  if (harness === "claude-code") {
    return Agent.ClaudeCode;
  }
  if (harness === "codex") {
    return Agent.Codex;
  }
  return Agent.OpenCode;
}

function boxModelApiKey(agent: Agent) {
  if (agent === Agent.OpenCode) {
    return requireApiKey(GEO_OPENCODE_MODEL_API_KEY_ENV);
  }
  return BoxApiKey.UpstashKey;
}

function boxStreamOptions(agent: Agent) {
  if (agent === Agent.ClaudeCode) {
    const options: ClaudeCodeAgentOptions = {
      effort: GEO_CLAUDE_CODE_EFFORT,
    };
    return options;
  }
  if (agent === Agent.Codex) {
    const options: CodexAgentOptions = {
      modelReasoningEffort: GEO_CODEX_REASONING_EFFORT,
      webSearch: GEO_CODEX_WEB_SEARCH,
    };
    return options;
  }
  const options: OpenCodeAgentOptions = {
    reasoningEffort: GEO_OPENCODE_REASONING_EFFORT,
    textVerbosity: "medium",
  };
  return options;
}

function abortReason(signal: AbortSignal) {
  return signal.reason instanceof Error
    ? signal.reason
    : new Error("OpenCode conversation was cancelled");
}

function remainingRunTimeout(deadlineAtMs?: number) {
  if (deadlineAtMs === undefined) {
    return GEO_OPENCODE_RUN_TIMEOUT_MS;
  }
  return Math.max(
    1,
    Math.min(GEO_OPENCODE_RUN_TIMEOUT_MS, deadlineAtMs - Date.now())
  );
}

function operationSignal(signal: AbortSignal | undefined, timeoutMs: number) {
  const timeoutController = new AbortController();
  const timeout = setTimeout(() => {
    timeoutController.abort(
      new DOMException("The operation timed out", "TimeoutError")
    );
  }, timeoutMs);
  return {
    signal: signal
      ? AbortSignal.any([signal, timeoutController.signal])
      : timeoutController.signal,
    dispose: () => clearTimeout(timeout),
  };
}

async function consumeGeoOpenCodeStream(
  streamPromise: Promise<StreamRun<string, Chunk>>,
  signal?: AbortSignal
) {
  const consume = async () => {
    const stream = await streamPromise;
    for await (const _chunk of stream) {
      // Draining the iterator populates the SDK's final result and cost.
    }
    return stream;
  };

  if (!signal) {
    return consume();
  }
  if (signal.aborted) {
    throw abortReason(signal);
  }

  let onAbort = () => {};
  const aborted = new Promise<never>((_, reject) => {
    onAbort = () => reject(abortReason(signal));
  });
  signal.addEventListener("abort", onAbort, { once: true });
  const consumption = consume();
  try {
    return await Promise.race([consumption, aborted]);
  } catch (error) {
    if (!signal.aborted) {
      throw error;
    }
    // The caller deletes this conversation's one-use box next, terminating the
    // backend run. Keep the abandoned SDK promise handled until that completes.
    void consumption.catch(() => undefined);
    throw abortReason(signal);
  } finally {
    signal.removeEventListener("abort", onAbort);
  }
}

async function runGeoOpenCodePrompt(
  box: Box,
  prompt: string,
  agent: Agent,
  model: string,
  signal?: AbortSignal,
  deadlineAtMs?: number
) {
  const sourceUrls = new Set<string>();
  const toolCalls: unknown[] = [];
  const collectSources = (value: unknown) => {
    for (const url of extractHttpUrls(value)) {
      if (sourceUrls.size >= GEO_OPENCODE_SOURCE_LIMIT) {
        break;
      }
      sourceUrls.add(url);
    }
  };

  const operation = operationSignal(signal, remainingRunTimeout(deadlineAtMs));
  try {
    if (operation.signal.aborted) {
      throw abortReason(operation.signal);
    }
    const stream = await consumeGeoOpenCodeStream(
      box.agent.stream({
        prompt,
        options: { ...boxStreamOptions(agent) },
        onToolUse: (tool) => {
          toolCalls.push(tool);
          collectSources(tool.input);
        },
        onToolResult: ({ output }) => {
          collectSources(output);
        },
      }),
      operation.signal
    );
    if (operation.signal.aborted) {
      throw abortReason(operation.signal);
    }

    const text = stream.result.trim();
    if (!text) {
      throw new BoxError("Box agent returned no result");
    }
    collectSources(text);
    return {
      text,
      sources: [...sourceUrls].map((url) => ({ url, title: null })),
      toolCalls,
      usage: geoBoxTokenUsage(stream.cost, model),
    };
  } catch (error) {
    if (operation.signal.aborted) {
      throw abortReason(operation.signal);
    }
    throw error;
  } finally {
    operation.dispose();
  }
}

export async function askGeoOpenCodeConversation(
  prompts: readonly string[],
  signal?: AbortSignal,
  deadlineAtMs?: number,
  model = GEO_OPENCODE_BOX_MODEL_ID,
  harness: GeoBoxHarness = "opencode"
) {
  if (prompts.length === 0) {
    return [];
  }
  if (signal?.aborted) {
    throw abortReason(signal);
  }
  const agent = boxAgentFromHarness(harness);
  const boxApiKey = requireApiKey(GEO_OPENCODE_BOX_API_KEY_ENV);
  const modelApiKey = boxModelApiKey(agent);
  const boxName = createGeoOpenCodeBoxName();
  const createTimeoutMs = remainingRunTimeout(deadlineAtMs);
  const createOperation = operationSignal(signal, createTimeoutMs);
  let box: Box;
  try {
    box = await createGeoOpenCodeBox(
      boxName,
      boxApiKey,
      modelApiKey,
      createOperation.signal,
      createTimeoutMs,
      model,
      agent
    );
  } finally {
    createOperation.dispose();
  }

  let cleanupPromise: Promise<void> | null = null;
  const cleanup = () => {
    cleanupPromise ??= deleteGeoOpenCodeBox(box.id, boxApiKey);
    return cleanupPromise;
  };
  const results: Awaited<ReturnType<typeof runGeoOpenCodePrompt>>[] = [];
  let operationFailed = false;
  let operationError: unknown;
  try {
    for (const prompt of prompts) {
      results.push(
        // react-doctor-disable-next-line react-doctor/async-await-in-loop -- each prompt depends on the previous turn in the same box conversation
        await runGeoOpenCodePrompt(
          box,
          prompt,
          agent,
          model,
          signal,
          deadlineAtMs
        )
      );
    }
    if (signal?.aborted) {
      throw abortReason(signal);
    }
  } catch (error) {
    operationFailed = true;
    operationError = error;
  }
  let cleanupFailed = false;
  let cleanupError: unknown;
  try {
    await cleanup();
  } catch (error) {
    cleanupFailed = true;
    cleanupError = error;
  }
  if (operationFailed) {
    if (cleanupFailed) {
      throw new AggregateError(
        [operationError, cleanupError],
        "Box agent run and box cleanup failed"
      );
    }
    throw operationError;
  }
  if (cleanupFailed) {
    throw cleanupError;
  }
  return results;
}

export async function askGeoOpenCode(
  prompt: string,
  signal?: AbortSignal,
  deadlineAtMs?: number,
  model = GEO_OPENCODE_BOX_MODEL_ID,
  harness: GeoBoxHarness = "opencode"
) {
  const [result] = await askGeoOpenCodeConversation(
    [prompt],
    signal,
    deadlineAtMs,
    model,
    harness
  );
  if (!result) {
    throw new Error("Box agent returned no result");
  }
  return result;
}
