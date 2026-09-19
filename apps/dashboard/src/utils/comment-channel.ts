import type { CommentTarget } from "@/types/comments";

export function commentChannel(target: CommentTarget) {
  return `discussion:${encodeURIComponent(target.organizationId)}:${target.targetType}:${encodeURIComponent(target.targetId)}`;
}
