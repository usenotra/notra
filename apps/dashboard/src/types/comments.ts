import type { z } from "zod";

import type { commentTargetSchema } from "@/schemas/comments";

export type CommentTarget = z.infer<typeof commentTargetSchema>;
export interface DiscussionComment {
  id: string;
  parentId: string | null;
  depth: number;
  userId: string | null;
  body: string;
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  name: string;
  image: string | null;
  reactions: { emoji: string; userId: string }[];
  pending?: boolean;
}
export interface CommentItemProps {
  comment: DiscussionComment;
  comments: DiscussionComment[];
  currentUserId: string;
  busy: boolean;
  onReply: (comment: DiscussionComment) => void;
  onEdit: (id: string, body: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<void>;
  onReact: (id: string, emoji: string, active: boolean) => void;
}

export type CommentActionsProps = Pick<
  CommentItemProps,
  "comment" | "currentUserId" | "busy" | "onReply" | "onDelete" | "onReact"
> & { onStartEdit: () => void };

export interface CommentBodyProps {
  body: string;
}
