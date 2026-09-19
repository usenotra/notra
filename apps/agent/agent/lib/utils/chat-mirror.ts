import {
  appendChatMessageIfMissing,
  claimChatSessionForExternalChannel,
  generateChatId,
  getChatMessageById,
  renameChatSession,
  upsertChatMessageById,
} from "@notra/ai/chat/history";
import {
  publishChatMirrorMessage,
  publishChatMirrorStatus,
} from "@notra/ai/chat/mirror";
import type { MirrorChatStatus } from "@notra/ai/types/chat";
import { getSessionAttribute } from "@notra/tools/utils/session";
import { Effect } from "effect";
import type {
  ActionResultStreamEvent,
  InputRequestedStreamEvent,
  MessageAppendedStreamEvent,
} from "eve/client";
import type { SessionContext } from "eve/context";
import type { HookContext } from "eve/hooks";

import {
  MIRROR_REQUESTED_MODEL,
  MIRROR_DELTA_THROTTLE_MAX_ENTRIES,
  MIRROR_DELTA_THROTTLE_MS,
  MIRROR_TOOL_NAME_OVERRIDES,
  MIRROR_TOOL_OUTPUT_MAX_CHARS,
  MIRRORED_CHANNEL_KINDS,
} from "../constants/chat-mirror";
import { ChatMirrorError } from "../schemas/chat-mirror";
import type { MirrorTarget, MirrorUiMessage } from "../types/chat-mirror";
import { getSelectedAssistantModelId } from "./model";

const SNAKE_SEGMENT_REGEX = /_([a-z0-9])/gu;

// eve streams deltas only, so each in-flight message keeps its own buffer.
const deltaBuffers = new Map<string, { publishedAt: number; text: string }>();

export function mirrorStep<T>(
  operation: string,
  run: () => Promise<T>
): Effect.Effect<T, ChatMirrorError> {
  return Effect.tryPromise({
    try: run,
    catch: (cause) => new ChatMirrorError({ cause, operation }),
  });
}

function runMirrorEffect(
  operation: Effect.Effect<unknown, unknown>
): Promise<void> {
  return Effect.runPromise(
    operation.pipe(
      Effect.asVoid,
      Effect.catch((error) =>
        Effect.logWarning("[agent] chat mirror failed", error)
      )
    )
  );
}

function getMirrorTarget(ctx: SessionContext): MirrorTarget | null {
  const organizationId = getSessionAttribute(ctx, "organizationId");
  const chatId = getSessionAttribute(ctx, "chatId");
  if (!(organizationId && chatId)) {
    return null;
  }
  return { organizationId, chatId, sessionId: ctx.session.id };
}

export async function resolveMirrorChatId(ctx: HookContext) {
  const kind = ctx.channel.kind;
  if (!(kind && MIRRORED_CHANNEL_KINDS.has(kind))) {
    return null;
  }
  return getSessionAttribute(ctx, "chatId");
}

export function appendAndPublishMirrorMessage(
  organizationId: string,
  chatId: string,
  message: MirrorUiMessage
): Effect.Effect<boolean, ChatMirrorError> {
  return Effect.gen(function* () {
    const appended = yield* mirrorStep("append-mirror-message", () =>
      appendChatMessageIfMissing(organizationId, chatId, message)
    );
    if (!appended) {
      return false;
    }
    yield* mirrorStep("publish-mirror-message", () =>
      publishChatMirrorMessage(organizationId, chatId, message)
    ).pipe(
      Effect.catch((error) =>
        Effect.logWarning("[agent] mirror publish failed", error)
      )
    );
    return true;
  });
}

export function upsertAndPublishMirrorMessage(
  organizationId: string,
  chatId: string,
  message: MirrorUiMessage
): Effect.Effect<boolean, ChatMirrorError> {
  return Effect.gen(function* () {
    const updated = yield* mirrorStep("upsert-mirror-message", () =>
      upsertChatMessageById(organizationId, chatId, message)
    );
    if (!updated) {
      return false;
    }
    yield* mirrorStep("publish-mirror-message", () =>
      publishChatMirrorMessage(organizationId, chatId, message)
    ).pipe(
      Effect.catch((error) =>
        Effect.logWarning("[agent] mirror publish failed", error)
      )
    );
    return true;
  });
}

export function claimMirroredChatSession(input: {
  organizationId: string;
  source: "slack" | "discord";
  externalChannelId: string;
  title: string;
  inboundMessage: MirrorUiMessage | null;
  loadHistory: () => Promise<MirrorUiMessage[]>;
}): Effect.Effect<string, ChatMirrorError> {
  return Effect.gen(function* () {
    const claim = yield* mirrorStep("claim-chat-session", () =>
      claimChatSessionForExternalChannel(
        input.organizationId,
        input.source,
        input.externalChannelId,
        generateChatId()
      )
    );

    if (!claim.created) {
      if (input.inboundMessage) {
        yield* appendAndPublishMirrorMessage(
          input.organizationId,
          claim.chatId,
          input.inboundMessage
        );
      }
      return claim.chatId;
    }

    const history = yield* mirrorStep("load-thread-history", input.loadHistory);
    const seedMessages = [...history];
    if (
      input.inboundMessage &&
      !seedMessages.some((item) => item.id === input.inboundMessage?.id)
    ) {
      seedMessages.push(input.inboundMessage);
    }
    for (const seedMessage of seedMessages) {
      yield* appendAndPublishMirrorMessage(
        input.organizationId,
        claim.chatId,
        seedMessage
      );
    }
    yield* mirrorStep("rename-chat-session", () =>
      renameChatSession(input.organizationId, claim.chatId, input.title)
    );

    return claim.chatId;
  });
}

function toolMessageId(sessionId: string, callId: string) {
  return `eve:${sessionId}:tool:${callId}`;
}

function snakeToCamel(value: string) {
  return value.replace(SNAKE_SEGMENT_REGEX, (_, letter: string) =>
    letter.toUpperCase()
  );
}

function mirrorToolPartType(toolName: string) {
  const mapped = MIRROR_TOOL_NAME_OVERRIDES[toolName] ?? snakeToCamel(toolName);
  return `tool-${mapped}` as const;
}

function truncateToolOutput(output: unknown): unknown {
  const serialized = JSON.stringify(output) ?? "";
  if (serialized.length <= MIRROR_TOOL_OUTPUT_MAX_CHARS) {
    return output;
  }
  return `${serialized.slice(0, MIRROR_TOOL_OUTPUT_MAX_CHARS)} (truncated)`;
}

export async function mirrorSessionStatus(
  ctx: SessionContext,
  status: MirrorChatStatus
): Promise<void> {
  const target = getMirrorTarget(ctx);
  if (!target) {
    return;
  }
  await runMirrorEffect(
    mirrorStep("publish-mirror-status", () =>
      publishChatMirrorStatus(target.organizationId, target.chatId, status)
    )
  );
}

export function mirrorAssistantMetadata(turnId: string) {
  return {
    model: getSelectedAssistantModelId(turnId),
    requestedModel: MIRROR_REQUESTED_MODEL,
  };
}

export async function mirrorAssistantDelta(
  ctx: SessionContext,
  data: MessageAppendedStreamEvent["data"]
): Promise<void> {
  const target = getMirrorTarget(ctx);
  if (!target) {
    return;
  }

  const messageId = `eve:${target.sessionId}:${data.turnId}:${data.stepIndex}`;
  const buffer = deltaBuffers.get(messageId) ?? { publishedAt: 0, text: "" };
  buffer.text += data.messageDelta;
  if (!deltaBuffers.has(messageId)) {
    if (deltaBuffers.size >= MIRROR_DELTA_THROTTLE_MAX_ENTRIES) {
      const oldestKey = deltaBuffers.keys().next().value;
      if (oldestKey !== undefined) {
        deltaBuffers.delete(oldestKey);
      }
    }
    deltaBuffers.set(messageId, buffer);
  }

  const now = Date.now();
  if (
    !buffer.text.trim() ||
    now - buffer.publishedAt < MIRROR_DELTA_THROTTLE_MS
  ) {
    return;
  }
  buffer.publishedAt = now;
  const text = buffer.text;

  await runMirrorEffect(
    mirrorStep("publish-mirror-delta", () =>
      publishChatMirrorMessage(target.organizationId, target.chatId, {
        id: messageId,
        role: "assistant",
        parts: [{ type: "text", text }],
        metadata: mirrorAssistantMetadata(data.turnId),
      })
    )
  );
}

export async function mirrorToolApprovals(
  ctx: SessionContext,
  data: InputRequestedStreamEvent["data"]
): Promise<void> {
  const target = getMirrorTarget(ctx);
  if (!target) {
    return;
  }

  for (const request of data.requests) {
    if (request.action.kind !== "tool-call") {
      continue;
    }
    const message: MirrorUiMessage = {
      id: toolMessageId(target.sessionId, request.action.callId),
      role: "assistant",
      parts: [
        {
          type: mirrorToolPartType(request.action.toolName),
          toolCallId: request.action.callId,
          state: "approval-requested",
          input: request.action.input,
          approval: { id: request.requestId },
        },
      ],
    };
    await runMirrorEffect(
      upsertAndPublishMirrorMessage(
        target.organizationId,
        target.chatId,
        message
      )
    );
  }
}

function findExistingToolPart(
  existing: MirrorUiMessage | null,
  callId: string
): { input: unknown; approvalId: string | null } {
  if (existing) {
    for (const part of existing.parts) {
      if ("toolCallId" in part && part.toolCallId === callId) {
        return {
          input: "input" in part ? part.input : {},
          approvalId: part.approval?.id ?? null,
        };
      }
    }
  }
  return { input: {}, approvalId: null };
}

export async function mirrorToolResult(
  ctx: SessionContext,
  data: ActionResultStreamEvent["data"]
): Promise<void> {
  const result = data.result;
  if (result.kind !== "tool-result") {
    return;
  }
  const target = getMirrorTarget(ctx);
  if (!target) {
    return;
  }

  const messageId = toolMessageId(target.sessionId, result.callId);
  await runMirrorEffect(
    Effect.gen(function* () {
      const existing = yield* mirrorStep("load-mirror-message", () =>
        getChatMessageById(target.organizationId, target.chatId, messageId)
      );
      const { input, approvalId } = findExistingToolPart(
        existing,
        result.callId
      );

      const type = mirrorToolPartType(result.toolName);
      let part: MirrorUiMessage["parts"][number];
      if (data.status === "rejected") {
        part = {
          type,
          toolCallId: result.callId,
          state: "output-denied",
          input,
          approval: {
            id: approvalId ?? result.callId,
            approved: false,
            reason: "discard",
          },
        };
      } else if (result.isError) {
        part = {
          type,
          toolCallId: result.callId,
          state: "output-error",
          input,
          errorText:
            typeof result.output === "string"
              ? result.output.slice(0, MIRROR_TOOL_OUTPUT_MAX_CHARS)
              : "Tool call failed",
        };
      } else {
        part = {
          type,
          toolCallId: result.callId,
          state: "output-available",
          input,
          output: truncateToolOutput(result.output),
          ...(approvalId
            ? { approval: { id: approvalId, approved: true as const } }
            : {}),
        };
      }

      const message: MirrorUiMessage = {
        id: messageId,
        role: "assistant",
        parts: [part],
      };
      yield* upsertAndPublishMirrorMessage(
        target.organizationId,
        target.chatId,
        message
      );
    })
  );
}
