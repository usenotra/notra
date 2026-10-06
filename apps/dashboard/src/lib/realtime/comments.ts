import { realtime } from "@notra/ai/realtime";
import { logWarn } from "@notra/ai/utils/server-log";

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
    logWarn(
      "Could not publish discussion update; clients will reconcile on refresh"
    );
  }
}
