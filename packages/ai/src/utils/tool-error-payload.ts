import { logError } from "@notra/ai/utils/server-log";
import type { Tool } from "ai";

const MAX_ERROR_MESSAGE_LENGTH = 600;

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function isExplicitlyNonRetryable(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "retryable" in error &&
    error.retryable === false
  );
}

function toErrorPayload(toolName: string, error: unknown) {
  const rawMessage = error instanceof Error ? error.message : String(error);
  const message =
    rawMessage.length > MAX_ERROR_MESSAGE_LENGTH
      ? `${rawMessage.slice(0, MAX_ERROR_MESSAGE_LENGTH)}…`
      : rawMessage;
  logError("[Tool Error]", error, { toolName });
  const retryable = !isExplicitlyNonRetryable(error);
  return {
    isError: true,
    error: message,
    retryable,
    hint: retryable
      ? "The tool call failed. Review the error, adjust the inputs or approach, and retry. If the failure persists, tell the user what went wrong instead of silently stopping."
      : "This failure is not retryable. Do not call this tool again in this response. Tell the user what went wrong and what they need to fix.",
  };
}

function isAsyncIterable(value: unknown): value is AsyncIterable<unknown> {
  return (
    typeof value === "object" && value !== null && Symbol.asyncIterator in value
  );
}

// Generator tools stream preliminary results; errors surface while iterating.
async function* withIterableErrorPayload(
  toolName: string,
  iterable: AsyncIterable<unknown>,
  abortSignal: AbortSignal | undefined
) {
  try {
    yield* iterable;
  } catch (error) {
    if (isAbortError(error) || abortSignal?.aborted) {
      throw error;
    }
    yield toErrorPayload(toolName, error);
  }
}

export function withToolErrorPayloads(
  tools: Record<string, Tool>
): Record<string, Tool> {
  const wrapped: Record<string, Tool> = {};
  for (const [toolName, originalTool] of Object.entries(tools)) {
    const { execute } = originalTool;
    if (!execute) {
      wrapped[toolName] = originalTool;
      continue;
    }
    const handleError = (error: unknown, abortSignal?: AbortSignal) => {
      if (isAbortError(error) || abortSignal?.aborted) {
        throw error;
      }
      return toErrorPayload(toolName, error);
    };
    wrapped[toolName] = {
      ...originalTool,
      execute: (input, options) => {
        let result: unknown;
        try {
          result = execute.call(originalTool, input, options);
        } catch (error) {
          return handleError(error, options?.abortSignal);
        }
        if (isAsyncIterable(result)) {
          return withIterableErrorPayload(
            toolName,
            result,
            options?.abortSignal
          );
        }
        return Promise.resolve(result).catch((error: unknown) =>
          handleError(error, options?.abortSignal)
        );
      },
    };
  }
  return wrapped;
}
