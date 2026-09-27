import { chatErrorPayloadSchema } from "@notra/ai/schemas/chat";

import type {
  ChatErrorMessages,
  HandleStandaloneChatErrorOptions,
} from "@/utils/chat-error-types";

function getStandaloneChatErrorMessage(
  err: Error,
  messages: ChatErrorMessages
) {
  const errorMessage = err.message || String(err);

  const parsed = (() => {
    try {
      return chatErrorPayloadSchema.safeParse(JSON.parse(errorMessage));
    } catch {
      return null;
    }
  })();

  if (parsed?.success && parsed.data.code === "USAGE_LIMIT_REACHED") {
    return {
      message: messages.usageLimit,
      shouldLog: false,
      isUsageLimit: true,
    };
  }

  if (parsed?.success && parsed.data.error) {
    return {
      message: parsed.data.error,
      shouldLog: false,
      isUsageLimit: false,
    };
  }

  if (
    errorMessage.includes("USAGE_LIMIT_REACHED") ||
    errorMessage.includes("Usage limit reached")
  ) {
    return {
      message: messages.usageLimit,
      shouldLog: false,
      isUsageLimit: true,
    };
  }

  return {
    message: errorMessage.trim() ? errorMessage : messages.fallback,
    shouldLog: true,
    isUsageLimit: false,
  };
}

export function handleStandaloneChatError(
  err: Error,
  {
    setChatError,
    setPendingMessageId,
    messages,
  }: HandleStandaloneChatErrorOptions
) {
  const { message, shouldLog, isUsageLimit } = getStandaloneChatErrorMessage(
    err,
    messages
  );

  if (shouldLog) {
    console.error("Standalone chat error:", err);
  }

  setChatError(message);
  setPendingMessageId?.(null);
  return { isUsageLimit };
}
