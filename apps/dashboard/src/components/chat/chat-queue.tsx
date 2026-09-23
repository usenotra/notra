"use client";

import type { ContextItem, TextSelection } from "@notra/ai/types/chat";

import { MessageAuthorAvatar } from "@/components/chat/message-author-avatar";
import { Composer } from "@/components/composer/composer-shell";
import {
  COMPOSER_QUEUED_CHIP,
  COMPOSER_QUEUED_CHIP_LABEL,
} from "@/constants/composer";
import type { ChatMessageAuthor } from "@/types/chat";
import { unknownChatMessageAuthor } from "@/utils/chat-message-author";

export interface QueuedMessage {
  id: string;
  text: string;
  authorUserId?: string;
  selection?: TextSelection;
  context?: ContextItem[];
  steering?: boolean;
}

interface ChatQueueProps {
  messages: QueuedMessage[];
  onEdit?: (message: QueuedMessage) => void;
  onRemove?: (id: string) => void;
  onSteer?: (message: QueuedMessage) => void;
  authorsById?: Map<string, ChatMessageAuthor>;
  showAuthorAvatars?: boolean;
}

export function ChatQueue({
  messages,
  onEdit,
  onRemove,
  onSteer,
  authorsById,
  showAuthorAvatars = false,
}: ChatQueueProps) {
  const hasPendingSteer = messages.some((message) => message.steering);

  if (messages.length === 0) {
    return null;
  }

  return (
    <div
      aria-label="Queued messages"
      className="flex w-full min-w-0 flex-col gap-1.5"
      role="group"
    >
      {messages.map((message) => (
        <Composer.Chip>
          className={COMPOSER_QUEUED_CHIP}
          editLabel="Edit queued message"
          icon={
            showAuthorAvatars && message.authorUserId ? (
              <MessageAuthorAvatar
                author={
                  authorsById?.get(message.authorUserId) ??
                  unknownChatMessageAuthor(message.authorUserId)
                }
                size="sm"
              />
            ) : undefined
          }
          key={message.id}
          label={message.text}
          labelClassName={COMPOSER_QUEUED_CHIP_LABEL}
          onEdit={onEdit ? () => onEdit(message) : undefined}
          onRemove={onRemove ? () => onRemove(message.id) : undefined}
          onSteer={
            hasPendingSteer || !onSteer ? undefined : () => onSteer(message)
          }
          pending={Boolean(message.steering)}
          removeLabel={
            message.steering ? "Cancel steering" : "Remove from queue"
          }
          steerLabel="Steer with this message"
        />
      ))}
    </div>
  );
}
