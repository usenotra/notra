import type { ChatAttachment } from "@notra/ai/types/chat";

import type { QueuedMessage } from "@/components/chat/chat-queue";

export function markQueuedMessageSteering<
  T extends { id: string; steering?: boolean },
>(queue: T[], id: string): T[] {
  return queue.map((item) =>
    item.id === id ? { ...item, steering: true } : item
  );
}

export function takeQueuedMessage<T extends { id: string }>(
  queue: T[],
  id: string
): { message: T; remaining: T[] } | null {
  const message = queue.find((item) => item.id === id);
  if (!message) {
    return null;
  }

  return {
    message,
    remaining: queue.filter((item) => item.id !== id),
  };
}

export function shouldDrainQueueAfterFinish({
  isAbort = false,
  isError,
  isDisconnect,
  wasInterruptedForQueue = false,
  wasStoppedByUser,
}: {
  isAbort?: boolean;
  isError: boolean;
  isDisconnect: boolean;
  wasInterruptedForQueue?: boolean;
  wasStoppedByUser: boolean;
}): boolean {
  return (
    !isError &&
    !isDisconnect &&
    !wasStoppedByUser &&
    (!isAbort || wasInterruptedForQueue)
  );
}

export function parseQueuedMessages(value: unknown): QueuedMessage[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (typeof item !== "object" || item === null) {
      return [];
    }

    const id = "id" in item ? item.id : null;
    const text = "text" in item ? item.text : null;
    if (typeof id !== "string" || typeof text !== "string") {
      return [];
    }

    const authorUserId =
      "authorUserId" in item && typeof item.authorUserId === "string"
        ? item.authorUserId
        : undefined;

    const attachments =
      "attachments" in item ? parseQueuedAttachments(item.attachments) : [];

    return [
      {
        id,
        text,
        ...(authorUserId ? { authorUserId } : {}),
        ...(attachments.length > 0 ? { attachments } : {}),
      },
    ];
  });
}

function parseQueuedAttachments(value: unknown): ChatAttachment[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is ChatAttachment =>
      typeof item === "object" &&
      item !== null &&
      typeof item.url === "string" &&
      typeof item.key === "string" &&
      typeof item.filename === "string" &&
      typeof item.mediaType === "string" &&
      typeof item.size === "number"
  );
}
