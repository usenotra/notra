"use client";

import { Popover } from "@base-ui/react/popover";
import {
  Cancel01Icon,
  NoteEditIcon,
  QuoteUpIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Message,
  type MessageProps,
} from "@notra/ui/components/ai-elements/message";
import { Button } from "@notra/ui/components/ui/button";
import { tween } from "@notra/ui/lib/motion";
import {
  AnimatePresence,
  domAnimation,
  LazyMotion,
  m,
  useReducedMotion,
} from "motion/react";
import {
  createContext,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { ChatAnnotationNoteForm } from "@/components/chat/chat-annotation-note-form";
import {
  CHAT_ANNOTATION_DRAFT_HIGHLIGHT_NAME,
  CHAT_ANNOTATIONS_MAX,
} from "@/constants/chat-annotations";
import type {
  ChatAnnotation,
  ChatAnnotationFocus,
} from "@/types/chat-annotations";
import type {
  ChatQuoteContextValue,
  ChatQuoteSelection,
  ChatQuoteProviderProps,
  ChatQuotePreviewProps,
} from "@/types/components/chat-quote";
import { getChatQuoteComposer } from "@/utils/chat-quote";

const ChatQuoteContext = createContext<ChatQuoteContextValue | null>(null);

export function useChatQuote() {
  return useContext(ChatQuoteContext);
}

// The live range follows scrolling; once a re-render detaches its text (the
// agent saved an edit), the last measured position keeps the popover put.
function getDraftRect(draft: ChatQuoteSelection) {
  const { range } = draft;
  if (range.startContainer.isConnected && !range.collapsed) {
    return range.getBoundingClientRect();
  }
  return draft.rect;
}

export function ChatQuoteProvider({
  children,
  conversationId,
}: ChatQuoteProviderProps) {
  const t = useTranslations("chat.quote");
  const tAnnotations = useTranslations("chat.annotations");
  const scopeId = useId();
  const [quote, setQuote] = useState<string | null>(null);
  const [annotations, setAnnotations] = useState<ChatAnnotation[]>([]);
  const [annotationFocus, setAnnotationFocus] =
    useState<ChatAnnotationFocus | null>(null);
  const [selection, setSelection] = useState<ChatQuoteSelection | null>(null);
  // An annotation being written: the popover holds a note form for it.
  const [draft, setDraft] = useState<ChatQuoteSelection | null>(null);
  const draftRef = useRef(draft);
  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);
  const [previousConversationId, setPreviousConversationId] =
    useState(conversationId);
  if (previousConversationId !== conversationId) {
    setPreviousConversationId(conversationId);
    setQuote(null);
    setAnnotations([]);
    setSelection(null);
    setDraft(null);
  }
  const buttonRef = useRef<HTMLButtonElement>(null);
  const context = useMemo(
    () => ({
      scopeId,
      quote,
      setQuote,
      annotations,
      setAnnotations,
      annotationFocus,
      focusAnnotation: (target: Omit<ChatAnnotationFocus, "nonce">) =>
        setAnnotationFocus({ ...target, nonce: Date.now() }),
      clearAnnotationFocus: () => setAnnotationFocus(null),
    }),
    [scopeId, quote, annotations, annotationFocus]
  );

  useEffect(() => {
    function updateSelection() {
      if (draftRef.current || document.activeElement === buttonRef.current) {
        return;
      }
      const selected = window.getSelection();
      if (!selected || selected.isCollapsed || !selected.rangeCount) {
        setSelection(null);
        return;
      }
      const range = selected.getRangeAt(0);
      const startElement =
        range.startContainer instanceof Element
          ? range.startContainer
          : range.startContainer.parentElement;
      const endElement =
        range.endContainer instanceof Element
          ? range.endContainer
          : range.endContainer.parentElement;
      const start = startElement?.closest("[data-chat-quote-source]");
      const end = endElement?.closest("[data-chat-quote-source]");
      const text = selected.toString().trim();
      if (
        !text ||
        start !== end ||
        start?.getAttribute("data-chat-quote-source") !== scopeId ||
        startElement?.closest("button, input, textarea, [contenteditable]") ||
        endElement?.closest("button, input, textarea, [contenteditable]") ||
        Array.from(
          start?.querySelectorAll("[data-chat-quote-ignore]") ?? []
        ).some((element) => range.intersectsNode(element)) ||
        !getChatQuoteComposer(scopeId)
      ) {
        setSelection(null);
        return;
      }
      const postId = start?.getAttribute("data-chat-quote-post-id");
      setSelection({
        text,
        range: range.cloneRange(),
        rect: range.getBoundingClientRect(),
        post: postId
          ? {
              postId,
              title: start?.getAttribute("data-chat-quote-post-title") ?? "",
            }
          : undefined,
      });
    }
    function dismiss() {
      // A note in progress follows its passage instead of closing.
      if (!draftRef.current) {
        setSelection(null);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (draftRef.current) {
        return;
      }
      if (event.key === "Escape") {
        dismiss();
      }
      if (
        event.key === "Tab" &&
        !event.shiftKey &&
        buttonRef.current &&
        document.activeElement !== buttonRef.current
      ) {
        event.preventDefault();
        event.stopPropagation();
        buttonRef.current.focus({ preventScroll: true });
      }
    }
    document.addEventListener("selectionchange", updateSelection);
    document.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("scroll", dismiss, true);
    window.addEventListener("resize", dismiss);
    return () => {
      document.removeEventListener("selectionchange", updateSelection);
      document.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("scroll", dismiss, true);
      window.removeEventListener("resize", dismiss);
    };
  }, [scopeId]);

  // Keeps the passage marked while focus sits in the note form.
  useEffect(() => {
    if (!(draft && "highlights" in CSS)) {
      return;
    }
    const highlight = new Highlight(draft.range);
    CSS.highlights.set(CHAT_ANNOTATION_DRAFT_HIGHLIGHT_NAME, highlight);
    return () => {
      CSS.highlights.delete(CHAT_ANNOTATION_DRAFT_HIGHLIGHT_NAME);
    };
  }, [draft]);

  function quoteSelection() {
    if (!selection) {
      return;
    }
    if (selection.post) {
      const { postId } = selection.post;
      const isKnownPassage = annotations.some(
        (annotation) =>
          annotation.postId === postId && annotation.text === selection.text
      );
      if (annotations.length >= CHAT_ANNOTATIONS_MAX && !isKnownPassage) {
        toast(tAnnotations("limit", { max: CHAT_ANNOTATIONS_MAX }));
        setSelection(null);
        return;
      }
      // Text selected in a previewed post opens a note form for it.
      setDraft(selection);
      setSelection(null);
      window.getSelection()?.removeAllRanges();
      return;
    }
    setQuote(selection.text);
    setSelection(null);
    window.getSelection()?.removeAllRanges();
    getChatQuoteComposer(scopeId)?.focus();
  }

  function addAnnotation(note: string) {
    const post = draft?.post;
    if (!(draft && post)) {
      return;
    }
    const { text } = draft;
    setAnnotations((current) => {
      const existing = current.find(
        (annotation) =>
          annotation.postId === post.postId && annotation.text === text
      );
      if (existing) {
        return current.map((annotation) =>
          annotation === existing
            ? { ...annotation, note: note || annotation.note }
            : annotation
        );
      }
      if (current.length >= CHAT_ANNOTATIONS_MAX) {
        return current;
      }
      return [
        ...current,
        {
          id: crypto.randomUUID(),
          postId: post.postId,
          title: post.title,
          text,
          note: note || undefined,
        },
      ];
    });
    setDraft(null);
  }

  const anchorSelection = draft ?? selection;

  return (
    <ChatQuoteContext value={context}>
      {children}
      <Popover.Root
        open={Boolean(anchorSelection)}
        onOpenChange={(open) => {
          if (!open) {
            setSelection(null);
            setDraft(null);
          }
        }}
      >
        <Popover.Portal>
          <Popover.Positioner
            anchor={
              anchorSelection
                ? {
                    getBoundingClientRect: () =>
                      draft ? getDraftRect(draft) : anchorSelection.rect,
                  }
                : null
            }
            side="top"
            sideOffset={8}
            collisionPadding={8}
            className="z-50"
          >
            <Popover.Popup
              aria-label={
                draft || selection?.post ? t("annotate") : t("quoteSelection")
              }
              initialFocus={false}
              finalFocus={false}
              className="bg-popover text-popover-foreground duration-fast ease-emphasized rounded-md border p-0.5 opacity-100 shadow-sm transition-opacity outline-none data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none"
            >
              {draft ? (
                <ChatAnnotationNoteForm
                  onCancel={() => setDraft(null)}
                  onSubmit={addAnnotation}
                />
              ) : null}
              {!draft && selection?.post ? (
                <Button
                  ref={buttonRef}
                  size="xs"
                  variant="ghost"
                  onPointerDown={(event) => event.preventDefault()}
                  onClick={quoteSelection}
                  onBlur={() => setSelection(null)}
                >
                  <HugeiconsIcon
                    icon={NoteEditIcon}
                    className="size-3.5"
                    aria-hidden="true"
                  />
                  {t("annotate")}
                </Button>
              ) : null}
              {draft || selection?.post ? null : (
                <Button
                  aria-label={t("quoteSelection")}
                  ref={buttonRef}
                  size="icon-xs"
                  variant="ghost"
                  onPointerDown={(event) => event.preventDefault()}
                  onClick={quoteSelection}
                  onBlur={() => setSelection(null)}
                >
                  <HugeiconsIcon
                    icon={QuoteUpIcon}
                    className="size-3.5"
                    aria-hidden="true"
                  />
                </Button>
              )}
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    </ChatQuoteContext>
  );
}

export function ChatQuoteMessage(props: MessageProps) {
  const context = useChatQuote();
  return <Message {...props} data-chat-quote-source={context?.scopeId} />;
}

// This short accordion resizes the composer so the input moves with the quote.
export function ChatQuotePreview({ disabled = false }: ChatQuotePreviewProps) {
  const t = useTranslations("chat.quote");
  const context = useChatQuote();
  const reduceMotion = useReducedMotion();
  return (
    <LazyMotion features={domAnimation} strict>
      <AnimatePresence initial={false}>
        {context?.quote ? (
          <m.div
            key="quote"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={
              reduceMotion ? { duration: 0 } : tween("fast", "emphasized")
            }
            className="overflow-hidden"
          >
            <div className="mx-3 mt-2 flex min-w-0 items-center gap-1">
              <blockquote
                className="border-border text-muted-foreground min-w-0 flex-1 truncate border-l-2 pl-2 text-xs"
                title={context.quote}
              >
                {context.quote}
              </blockquote>
              <Button
                aria-label={t("removeQuote")}
                disabled={disabled}
                size="icon-sm"
                variant="ghost"
                onClick={() => {
                  context.setQuote(null);
                  getChatQuoteComposer(context.scopeId)?.focus();
                }}
              >
                <HugeiconsIcon
                  icon={Cancel01Icon}
                  className="size-3"
                  aria-hidden="true"
                />
              </Button>
            </div>
          </m.div>
        ) : null}
      </AnimatePresence>
    </LazyMotion>
  );
}
