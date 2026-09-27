"use client";

import { Popover } from "@base-ui/react/popover";
import { Cancel01Icon, QuoteUpIcon } from "@hugeicons/core-free-icons";
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

export function ChatQuoteProvider({
  children,
  conversationId,
}: ChatQuoteProviderProps) {
  const scopeId = useId();
  const [quote, setQuote] = useState<string | null>(null);
  const [selection, setSelection] = useState<ChatQuoteSelection | null>(null);
  const [previousConversationId, setPreviousConversationId] =
    useState(conversationId);
  if (previousConversationId !== conversationId) {
    setPreviousConversationId(conversationId);
    setQuote(null);
    setSelection(null);
  }
  const buttonRef = useRef<HTMLButtonElement>(null);
  const context = useMemo(
    () => ({ scopeId, quote, setQuote }),
    [scopeId, quote]
  );

  useEffect(() => {
    function updateSelection() {
      if (document.activeElement === buttonRef.current) {
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
      setSelection({ text, rect: range.getBoundingClientRect() });
    }
    function dismiss() {
      setSelection(null);
    }
    function onKeyDown(event: KeyboardEvent) {
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

  function quoteSelection() {
    if (!selection) {
      return;
    }
    setQuote(selection.text);
    setSelection(null);
    window.getSelection()?.removeAllRanges();
    getChatQuoteComposer(scopeId)?.focus();
  }

  return (
    <ChatQuoteContext value={context}>
      {children}
      <Popover.Root
        open={Boolean(selection)}
        onOpenChange={(open) => {
          if (!open) {
            setSelection(null);
          }
        }}
      >
        <Popover.Portal>
          <Popover.Positioner
            anchor={
              selection ? { getBoundingClientRect: () => selection.rect } : null
            }
            side="top"
            sideOffset={8}
            collisionPadding={8}
            className="z-50"
          >
            <Popover.Popup
              aria-label="Quote selected text"
              initialFocus={false}
              finalFocus={false}
              className="bg-popover text-popover-foreground duration-fast ease-emphasized rounded-md border p-0.5 opacity-100 shadow-sm transition-opacity outline-none data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none"
            >
              <Button
                aria-label="Quote selected text"
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
                aria-label="Remove quote"
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
