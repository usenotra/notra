"use client";

import type { ContextItem, TextSelection } from "@notra/ai/types/chat";
import { SPRING } from "@notra/ui/lib/motion";
import { AnimatePresence, LazyMotion, m, useReducedMotion } from "motion/react";

import { MessageAuthorAvatar } from "@/components/chat/message-author-avatar";
import { Composer } from "@/components/composer/composer-shell";
import type { ChatMessageAuthor } from "@/types/chat";
import { unknownChatMessageAuthor } from "@/utils/chat-message-author";

export interface QueuedMessage {
  id: string;
  text: string;
  authorUserId?: string;
  selection?: TextSelection;
  context?: ContextItem[];
}

interface ChatQueueProps {
  messages: QueuedMessage[];
  onEdit: (message: QueuedMessage) => void;
  onRemove: (id: string) => void;
  onSteer?: (message: QueuedMessage) => void;
  authorsById?: Map<string, ChatMessageAuthor>;
  showAuthorAvatars?: boolean;
}

const INSTANT = { duration: 0 } as const;
// `m.*` components only animate once motion features are loaded. Loading
// them here keeps the queue working in hosts without their own LazyMotion
// boundary.
const loadMotionFeatures = () =>
  import("@/lib/motion-features").then((mod) => mod.default);

export function ChatQueue({
  messages,
  onEdit,
  onRemove,
  onSteer,
  authorsById,
  showAuthorAvatars = false,
}: ChatQueueProps) {
  const reduceMotion = useReducedMotion();
  const hasMessages = messages.length > 0;
  const containerTransition = reduceMotion ? INSTANT : SPRING.snappy;
  const itemTransition = reduceMotion ? INSTANT : SPRING.snappy;

  return (
    <LazyMotion features={loadMotionFeatures} strict>
      <AnimatePresence initial={false}>
        {hasMessages && (
          <m.div
            animate={{ height: "auto", opacity: 1, y: 0 }}
            aria-label="Queued messages"
            className="border-border bg-muted overflow-hidden rounded-t-[14px] border border-b-0 px-2.5 pt-1.5 pb-1"
            exit={{ height: 0, opacity: 0, y: 12 }}
            initial={{ height: 0, opacity: 0, y: 12 }}
            transition={containerTransition}
          >
            <div className="flex flex-wrap items-center gap-1.5">
              <AnimatePresence initial={false}>
                {messages.map((message) => (
                  <m.div
                    animate={{ opacity: 1, scale: 1 }}
                    className="max-w-full"
                    exit={{ opacity: 0, scale: 0.96 }}
                    initial={{ opacity: 0, scale: 0.96 }}
                    key={message.id}
                    layout={!reduceMotion}
                    transition={itemTransition}
                  >
                    <Composer.Chip
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
                      label={message.text}
                      onEdit={() => onEdit(message)}
                      onRemove={() => onRemove(message.id)}
                      onSteer={onSteer ? () => onSteer(message) : undefined}
                      removeLabel="Remove from queue"
                      steerLabel="Steer with this message"
                    />
                  </m.div>
                ))}
              </AnimatePresence>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </LazyMotion>
  );
}
