import type { z } from "@hono/zod-openapi";
import {
  allowUnmeteredAiInDevelopment,
  autumn,
} from "@notra/ai/billing/autumn";
import { checkChatBilling } from "@notra/ai/billing/chat-billing";
import {
  claimChatSessionForExternalChannel,
  clearActiveChatStream,
  clearLastResponseStopped,
  generateAndSetChatTitle,
  generateChatId,
  getStandaloneChatSession,
  loadChatHistory,
  replaceChatHistory,
  setActiveChatStream,
} from "@notra/ai/chat/history";
import { getStandaloneChatIntegrations } from "@notra/ai/chat/integrations-cache";
import type { useLogger } from "@notra/ai/evlog";
import type { ChatBillingCheck } from "@notra/ai/types/billing";
import { isRelayChannelSource } from "@notra/ai/utils/chat-surface";
import type { sendChatMessageRequestSchema } from "@notra/schemas/api/chats";
import type { UIMessage } from "ai";
import type { Context } from "hono";
import { nanoid } from "nanoid";

import { createDirectStandaloneChatResponse } from "./direct-stream";
import { buildApiChatTelemetryMetadata } from "./tcc";

type SendChatMessageInput = z.infer<typeof sendChatMessageRequestSchema>;

interface RunChatMessageArgs {
  c: Context;
  organizationId: string;
  existingChatId: string | null;
  body: SendChatMessageInput;
  log: ReturnType<typeof useLogger>;
  requestId: string;
}

export async function runChatMessage({
  c,
  organizationId,
  existingChatId,
  body,
  log,
  requestId,
}: RunChatMessageArgs): Promise<Response> {
  let useMarkup = false;
  let chargeAiCredits = false;
  if (autumn && !allowUnmeteredAiInDevelopment) {
    let billing: ChatBillingCheck;
    try {
      billing = await checkChatBilling(organizationId);
    } catch (checkError) {
      console.error("[Autumn] Check error:", {
        requestId,
        customerId: organizationId,
        error: checkError,
      });
      return c.json(
        { error: "Failed to check usage limits", code: "BILLING_ERROR" },
        500
      );
    }

    if (!billing.allowed) {
      return c.json(
        {
          error: "Usage limit reached",
          code: "USAGE_LIMIT_REACHED",
          balance: billing.balanceRemaining ?? 0,
        },
        403
      );
    }

    useMarkup = billing.useMarkup;
    chargeAiCredits = billing.chargeAiCredits;
  }

  const {
    message,
    model,
    enableThinking,
    thinkingLevel,
    timezone,
    context: inputContext,
    externalChannelId,
  } = body;

  let resolvedChatId = existingChatId;
  let isNewChat = resolvedChatId === null;
  let externalChannelClaimed = false;

  if (resolvedChatId) {
    const existingChat = await getStandaloneChatSession(
      organizationId,
      resolvedChatId
    );
    if (!existingChat) {
      return c.json({ error: "Chat not found" }, 404);
    }
  } else if (
    externalChannelId &&
    isRelayChannelSource(externalChannelId.source) &&
    externalChannelId.id
  ) {
    const claim = await claimChatSessionForExternalChannel(
      organizationId,
      externalChannelId.source,
      externalChannelId.id,
      generateChatId()
    );
    resolvedChatId = claim.chatId;
    isNewChat = claim.created;
    externalChannelClaimed = true;
  }

  const chatId = resolvedChatId ?? generateChatId();
  const auth = c.get("auth") as { keyId?: string } | undefined;

  const userMessage: UIMessage = {
    id: nanoid(),
    role: "user",
    parts: [{ type: "text", text: message }],
  };

  const streamAcquired = await setActiveChatStream(
    organizationId,
    chatId,
    userMessage.id
  );
  if (!streamAcquired) {
    return c.json(
      { error: "A response is already being generated for this chat" },
      409
    );
  }

  try {
    const existingMessages = isNewChat
      ? []
      : await loadChatHistory(organizationId, chatId);
    const messages = [...existingMessages, userMessage];

    const validatedIntegrations =
      await getStandaloneChatIntegrations(organizationId);
    const context = inputContext ?? [];

    const externalChannelIdForInsert =
      isNewChat && !externalChannelClaimed ? externalChannelId : undefined;

    const [historySaved] = await Promise.all([
      replaceChatHistory(
        organizationId,
        chatId,
        messages,
        externalChannelIdForInsert
      ),
      clearLastResponseStopped(organizationId, chatId),
    ]);

    if (!historySaved) {
      await clearActiveChatStream(organizationId, chatId, userMessage.id);
      return c.json({ error: "Chat not found" }, 404);
    }

    if (existingMessages.length === 0) {
      await generateAndSetChatTitle(organizationId, chatId, userMessage);
    }

    return await createDirectStandaloneChatResponse({
      organizationId,
      chatId,
      messages,
      context,
      validatedIntegrations,
      useMarkup,
      chargeAiCredits,
      requestId,
      log,
      model,
      enableThinking,
      thinkingLevel,
      timezone,
      abortSignal: c.req.raw.signal,
      externalChannelId,
      telemetryMetadata: buildApiChatTelemetryMetadata({
        apiKeyId: auth?.keyId,
        chatId,
        externalChannelId: externalChannelId?.id,
        externalChannelSource: externalChannelId?.source,
        existingChatId,
        organizationId,
      }),
    });
  } catch (error) {
    await clearActiveChatStream(organizationId, chatId, userMessage.id).catch(
      () => undefined
    );
    throw error;
  }
}
