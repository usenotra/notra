import { realtime } from "@notra/ai/realtime";

import type { CommentTarget } from "@/types/comments";
import { commentChannel } from "@/utils/comment-channel";

export async function publishCommentChange(target: CommentTarget) {
  if (!realtime) {
    return;
  }
  try {
    await realtime
      .channel(commentChannel(target))
      .emit("discussion.changed", { version: crypto.randomUUID() });
  } catch {
    console.warn(
      "Could not publish discussion update; clients will reconcile on refresh"
    );
  }
}
