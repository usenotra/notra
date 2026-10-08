"use client";

import { useTranslations } from "use-intl";

import { useChatQuote } from "@/components/chat/chat-quote";
import type { ChatMessageAnnotationsProps } from "@/types/components/chat-message-annotations";

// The annotations a user sent, shown in their message instead of the raw
// block. A row opens its post in the preview and flashes the passage.
export function ChatMessageAnnotations({
  annotations,
}: ChatMessageAnnotationsProps) {
  const t = useTranslations("chat.annotations");
  const quoteContext = useChatQuote();

  return (
    <ol aria-label={t("label")} className="mb-1.5 flex flex-col gap-1">
      {annotations.map((annotation, index) => (
        <li key={`${annotation.postId}-${annotation.text}`}>
          <button
            className="hover:bg-foreground/5 focus-visible:ring-ring flex w-full min-w-0 cursor-pointer items-start gap-2 rounded-md px-1 py-0.5 text-left outline-none focus-visible:ring-2"
            onClick={() =>
              quoteContext?.focusAnnotation({
                postId: annotation.postId,
                text: annotation.text,
              })
            }
            type="button"
          >
            <span className="bg-background text-muted-foreground mt-0.5 flex size-4 shrink-0 items-center justify-center rounded text-[10px] font-medium tabular-nums">
              {index + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className="text-muted-foreground block truncate text-xs">
                <span className="text-foreground">{annotation.title}</span>
                {" · "}
                <span title={annotation.text}>“{annotation.text}”</span>
              </span>
              {annotation.note ? (
                <span className="text-foreground block text-xs text-pretty">
                  {annotation.note}
                </span>
              ) : null}
            </span>
          </button>
        </li>
      ))}
    </ol>
  );
}
