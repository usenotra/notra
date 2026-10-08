"use client";

import { Attachment01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type {
  ChatAttachment,
  ContextItem,
  TextSelection,
} from "@notra/ai/types/chat";
import { Composer } from "@notra/ui/components/ui/composer";
import { useTranslations } from "use-intl";

import { MessageAuthorAvatar } from "@/components/chat/message-author-avatar";
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
  /** Files that belong to this message only; sent with it when it drains. */
  attachments?: ChatAttachment[];
  steering?: boolean;
}

interface ChatQueueProps {
  messages: QueuedMessage[];
  onEdit?: (message: QueuedMessage) => void;
  onRemove?: (id: string) => void;
  onSteer?: (message: QueuedMessage) => void;
  authorsById?: Map<string, ChatMessageAuthor>;
  /** Turns the serialized message into a readable chip label. */
  formatLabel?: (text: string) => string;
  showAuthorAvatars?: boolean;
}

export function ChatQueue({
  messages,
  onEdit,
  onRemove,
  onSteer,
  authorsById,
  formatLabel,
  showAuthorAvatars = false,
}: ChatQueueProps) {
  const t = useTranslations("chat.queue");
  const hasPendingSteer = messages.some((message) => message.steering);

  if (messages.length === 0) {
    return null;
  }

  return (
    <div
      aria-label={t("label")}
      className="flex w-full min-w-0 flex-col gap-1.5"
      role="group"
    >
      {messages.map((message) => {
        const files = message.attachments ?? [];
        const fileNames = files.map((file) => file.filename).join(", ");
        const author =
          showAuthorAvatars && message.authorUserId ? (
            <MessageAuthorAvatar
              author={
                authorsById?.get(message.authorUserId) ??
                unknownChatMessageAuthor(message.authorUserId)
              }
              size="sm"
            />
          ) : null;
        const filesBadge =
          files.length > 0 ? (
            <span
              className="text-muted-foreground inline-flex shrink-0 items-center gap-0.5 tabular-nums"
              title={t("attachments", {
                count: files.length,
                names: fileNames,
              })}
            >
              <HugeiconsIcon className="size-3.5" icon={Attachment01Icon} />
              <span className="sr-only">
                {t("attachments", { count: files.length, names: fileNames })}
              </span>
              {files.length > 1 ? (
                <span aria-hidden="true">{files.length}</span>
              ) : null}
            </span>
          ) : null;

        return (
          <Composer.Chip
            className={COMPOSER_QUEUED_CHIP}
            editLabel={t("edit")}
            icon={
              author || filesBadge ? (
                <>
                  {author}
                  {filesBadge}
                </>
              ) : undefined
            }
            key={message.id}
            label={
              (formatLabel ? formatLabel(message.text) : message.text) ||
              fileNames
            }
            labelClassName={COMPOSER_QUEUED_CHIP_LABEL}
            onEdit={onEdit ? () => onEdit(message) : undefined}
            onRemove={onRemove ? () => onRemove(message.id) : undefined}
            onSteer={
              hasPendingSteer || !onSteer ? undefined : () => onSteer(message)
            }
            pending={Boolean(message.steering)}
            removeLabel={message.steering ? t("cancelSteering") : t("remove")}
            steerLabel={t("steer")}
          />
        );
      })}
    </div>
  );
}
