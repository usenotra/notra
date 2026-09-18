import type { RefObject } from "react";
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

export interface CommentTimestampProps {
  createdAt: string;
}

export interface CommentThreadLinesProps {
  parentId: string | null;
  isLastReply: boolean;
}

export interface CommentRepliesProps {
  replies: DiscussionComment[];
  itemProps: CommentItemProps;
}

export interface CommentContentProps extends CommentEditFormProps {
  editing: boolean;
  body: string;
}

export interface CommentEditFormProps {
  draft: string;
  disabled: boolean;
  onDraftChange: (value: string) => void;
  onCancel: () => void;
  onSave: () => Promise<void>;
}

export type CommentItemMenuProps = Pick<
  CommentItemProps,
  "comment" | "currentUserId" | "onReply" | "onReact" | "onDelete"
> & {
  disabled: boolean;
  onStartEdit: () => void;
};

export interface DiscussionFeedProps extends DiscussionListProps {
  isPending: boolean;
  isError: boolean;
  onRetry: () => void;
}

export interface DiscussionListProps {
  items: DiscussionComment[];
  currentUserId: string;
  busy: boolean;
  onReply: CommentItemProps["onReply"];
  onEdit: CommentItemProps["onEdit"];
  onDelete: CommentItemProps["onDelete"];
  onReact: CommentItemProps["onReact"];
}

export interface DiscussionComposerProps {
  draft: string;
  reply: DiscussionComment | null;
  busy: boolean;
  canSubmit: boolean;
  textarea: RefObject<HTMLTextAreaElement | null>;
  onDraftChange: (value: string) => void;
  onSubmit: () => void;
  onCancelReply: () => void;
}
