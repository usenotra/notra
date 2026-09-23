import type { QueuedMessage } from "@/components/chat/chat-queue";

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

export function shouldDrainQueueAfterError({
  hasPendingSteer,
  hasSteerInFlight,
  isUsageLimit,
}: {
  hasPendingSteer: boolean;
  hasSteerInFlight: boolean;
  isUsageLimit: boolean;
}): boolean {
  return !hasPendingSteer && !hasSteerInFlight && !isUsageLimit;
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

    return [authorUserId ? { id, text, authorUserId } : { id, text }];
  });
}
