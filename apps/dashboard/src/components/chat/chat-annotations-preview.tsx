"use client";

import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@notra/ui/components/ui/button";
import { tween } from "@notra/ui/lib/motion";
import { cn } from "@notra/ui/lib/utils";
import {
  AnimatePresence,
  domAnimation,
  LazyMotion,
  m,
  useReducedMotion,
} from "motion/react";
import { useState } from "react";
import { useTranslations } from "use-intl";

import { ChatAnnotationNoteForm } from "@/components/chat/chat-annotation-note-form";
import { useChatQuote } from "@/components/chat/chat-quote";
import type { ChatAnnotationsPreviewProps } from "@/types/components/chat-annotations-preview";
import { getChatQuoteComposer } from "@/utils/chat-quote";

// Numbered like the block the agent receives. A row opens its note for edits.
export function ChatAnnotationsPreview({
  disabled = false,
}: ChatAnnotationsPreviewProps) {
  const t = useTranslations("chat.annotations");
  const context = useChatQuote();
  const reduceMotion = useReducedMotion();
  const annotations = context?.annotations ?? [];
  const [editingId, setEditingId] = useState<string | null>(null);
  const transition = reduceMotion
    ? { duration: 0 }
    : tween("fast", "emphasized");

  return (
    <LazyMotion features={domAnimation} strict>
      <AnimatePresence initial={false}>
        {annotations.length > 0 ? (
          <m.ol
            animate={{ height: "auto", opacity: 1 }}
            aria-label={t("label")}
            className="mx-3 mt-2 flex flex-col gap-1 overflow-hidden"
            exit={{ height: 0, opacity: 0 }}
            initial={{ height: 0, opacity: 0 }}
            key="annotations"
            transition={transition}
          >
            <AnimatePresence initial={false}>
              {annotations.map((annotation, index) => (
                <m.li
                  animate={{ height: "auto", opacity: 1 }}
                  className="flex min-w-0 items-start gap-2 overflow-hidden"
                  exit={{ height: 0, opacity: 0 }}
                  initial={{ height: 0, opacity: 0 }}
                  key={annotation.id}
                  transition={transition}
                >
                  <button
                    aria-label={t("show", { index: index + 1 })}
                    className="bg-muted text-muted-foreground hover:bg-foreground/10 hover:text-foreground focus-visible:ring-ring mt-0.5 flex size-4 shrink-0 cursor-pointer items-center justify-center rounded text-[10px] font-medium tabular-nums outline-none focus-visible:ring-2"
                    onClick={() =>
                      context?.focusAnnotation({
                        postId: annotation.postId,
                        text: annotation.text,
                      })
                    }
                    type="button"
                  >
                    {index + 1}
                  </button>
                  {editingId === annotation.id ? (
                    <ChatAnnotationNoteForm
                      className="w-full p-0"
                      initialNote={annotation.note}
                      onCancel={() => setEditingId(null)}
                      onSubmit={(note) => {
                        context?.setAnnotations((current) =>
                          current.map((item) =>
                            item.id === annotation.id
                              ? { ...item, note: note || undefined }
                              : item
                          )
                        );
                        setEditingId(null);
                      }}
                      submitLabel={t("save")}
                    />
                  ) : (
                    <button
                      aria-label={t("editNote", { index: index + 1 })}
                      className="hover:bg-muted/60 focus-visible:ring-ring min-w-0 flex-1 cursor-pointer rounded px-1 text-left outline-none focus-visible:ring-2"
                      disabled={disabled}
                      onClick={() => setEditingId(annotation.id)}
                      type="button"
                    >
                      <span className="text-muted-foreground block truncate text-xs">
                        <span className="text-foreground">
                          {annotation.title}
                        </span>
                        {" · "}
                        <span title={annotation.text}>“{annotation.text}”</span>
                      </span>
                      <span
                        className={cn(
                          "block truncate text-xs",
                          annotation.note
                            ? "text-foreground"
                            : "text-muted-foreground/70"
                        )}
                      >
                        {annotation.note ?? t("addNote")}
                      </span>
                    </button>
                  )}
                  <Button
                    aria-label={t("remove", { index: index + 1 })}
                    disabled={disabled}
                    onClick={() => {
                      context?.setAnnotations((current) =>
                        current.filter((item) => item.id !== annotation.id)
                      );
                      if (context) {
                        getChatQuoteComposer(context.scopeId)?.focus();
                      }
                    }}
                    size="icon-xs"
                    variant="ghost"
                  >
                    <HugeiconsIcon
                      aria-hidden="true"
                      className="size-3"
                      icon={Cancel01Icon}
                    />
                  </Button>
                </m.li>
              ))}
            </AnimatePresence>
          </m.ol>
        ) : null}
      </AnimatePresence>
    </LazyMotion>
  );
}
