"use client";

import { PlayIcon, StopIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { PerplexityActions } from "@notra/ui/components/ai-skins/perplexity/perplexity-actions";
import { PerplexityCitation } from "@notra/ui/components/ai-skins/perplexity/perplexity-citation";
import { PerplexityComposer } from "@notra/ui/components/ai-skins/perplexity/perplexity-composer";
import { PerplexityMessage } from "@notra/ui/components/ai-skins/perplexity/perplexity-message";
import { PerplexitySearch } from "@notra/ui/components/ai-skins/perplexity/perplexity-search";
import { PerplexityThinking } from "@notra/ui/components/ai-skins/perplexity/perplexity-thinking";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@notra/ui/components/ui/message-scroller";
import { cn } from "@notra/ui/lib/utils";
import { useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { useRef } from "react";

import { DesignSystemSectionHeader } from "@/components/design-system/design-system-section-header";
import { usePerplexityPlayback } from "@/components/design-system/use-perplexity-playback";
import {
  PERPLEXITY_STORY_ASSISTANT_MESSAGES,
  PERPLEXITY_STORY_REPLIES,
  PERPLEXITY_STORY_THREAD,
  PERPLEXITY_STORY_USER_MESSAGES,
} from "@/constants/design-system-perplexity";
import {
  splitBoldSegments,
  splitWithOffsets,
} from "@/lib/design-system/text-segments";
import type {
  PerplexityStoryCitation,
  PerplexityStoryMessage,
} from "@/types/design-system-perplexity";

const CITE_PATTERN = /(\{\{[a-z0-9-]+\}\})/;
const CITE_TOKEN_PATTERN = /^\{\{([a-z0-9-]+)\}\}$/;

function PerplexityFrame({
  children,
  className,
  playing = false,
  onPlay,
}: {
  children: ReactNode;
  className?: string;
  playing?: boolean;
  onPlay?: () => void;
}) {
  return (
    <div
      className={cn(
        "relative flex h-[36rem] flex-col overflow-hidden rounded-[1.25rem] border border-black/8 bg-white dark:border-white/10 dark:bg-[#111]",
        className
      )}
    >
      {onPlay ? (
        <button
          aria-label={playing ? "Stop playback" : "Play conversation"}
          className="dark:hover:text-foreground absolute top-3 right-3 z-10 flex size-8 items-center justify-center rounded-full border border-black/8 bg-white/90 text-[#8d8d8d] shadow-sm backdrop-blur-sm transition-colors hover:text-[#1a1a1a] dark:border-white/10 dark:bg-[#111]/90"
          onClick={onPlay}
          type="button"
        >
          <HugeiconsIcon icon={playing ? StopIcon : PlayIcon} size={16} />
        </button>
      ) : null}
      {children}
    </div>
  );
}

function citationById(
  citations: readonly PerplexityStoryCitation[] | undefined
) {
  return new Map((citations ?? []).map((item) => [item.id, item]));
}

function PerplexityInlineText({
  text,
  citations,
}: {
  text: string;
  citations?: readonly PerplexityStoryCitation[];
}) {
  const lookup = citationById(citations);
  const pieces = splitWithOffsets(text, CITE_PATTERN, 0);

  return (
    <span className="min-w-0 flex-1">
      {pieces.map((piece) => {
        const citeMatch = piece.text.match(CITE_TOKEN_PATTERN);
        if (citeMatch) {
          const citation = lookup.get(citeMatch[1] ?? "");
          if (!citation) {
            return null;
          }
          return (
            <PerplexityCitation
              domain={citation.domain}
              extra={citation.extra}
              key={piece.offset}
              label={citation.label}
            />
          );
        }

        const parts = splitBoldSegments(piece.text);
        return (
          <span key={piece.offset}>
            {parts.map((part) => {
              if (part.text.startsWith("**") && part.text.endsWith("**")) {
                return (
                  <strong key={part.offset}>{part.text.slice(2, -2)}</strong>
                );
              }
              return <span key={part.offset}>{part.text}</span>;
            })}
          </span>
        );
      })}
    </span>
  );
}

function PerplexityStoryText({
  text,
  citations,
}: {
  text: string;
  citations?: readonly PerplexityStoryCitation[];
}) {
  const blocks = splitWithOffsets(text, "\n\n", 2);

  return (
    <span className={blocks.length > 1 ? "flex flex-col gap-4" : undefined}>
      {blocks.map((block) => {
        const lines = splitWithOffsets(block.text, "\n", 1);
        const isList = lines.every((line) => line.text.startsWith("- "));
        const isHeading =
          lines.length === 1 &&
          block.text.startsWith("**") &&
          block.text.endsWith("**") &&
          !block.text.slice(2, -2).includes("**");

        if (isHeading) {
          return (
            <strong
              className="mt-1 block font-serif text-[18px] leading-7 font-semibold"
              key={block.offset}
            >
              {block.text.slice(2, -2)}
            </strong>
          );
        }

        if (isList) {
          return (
            <span className="flex flex-col gap-1.5 ps-1" key={block.offset}>
              {lines.map((line) => (
                <span
                  className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-2.5"
                  key={line.offset}
                >
                  <span
                    aria-hidden
                    className="mt-[0.75em] size-1 shrink-0 rounded-full bg-current"
                  />
                  <PerplexityInlineText
                    citations={citations}
                    text={line.text.slice(2)}
                  />
                </span>
              ))}
            </span>
          );
        }

        return (
          <span key={block.offset}>
            <PerplexityInlineText citations={citations} text={block.text} />
          </span>
        );
      })}
    </span>
  );
}

function PerplexityStoryBody({
  message,
  showActions = true,
  reducedMotion = false,
  sequential = false,
}: {
  message: PerplexityStoryMessage;
  showActions?: boolean;
  reducedMotion?: boolean;
  sequential?: boolean;
}) {
  const isUser = message.from === "user";

  return (
    <PerplexityMessage
      actions={
        isUser ? undefined : (
          <div className={showActions ? undefined : "invisible"}>
            <PerplexityActions
              sources={message.search?.sources}
              text={message.text}
            />
          </div>
        )
      }
      from={message.from}
      search={
        message.search ? (
          <PerplexitySearch
            extraCount={message.search.extraCount}
            previewCount={message.search.previewCount}
            queries={message.search.queries}
            reducedMotion={reducedMotion}
            sequential={sequential}
            sources={message.search.sources}
            title={message.search.title}
          />
        ) : undefined
      }
    >
      {isUser ? (
        message.text
      ) : (
        <PerplexityStoryText
          citations={message.citations}
          text={message.text}
        />
      )}
    </PerplexityMessage>
  );
}

function PerplexityRow({
  message,
  showActions = true,
  reducedMotion = false,
  sequential = false,
}: {
  message: PerplexityStoryMessage;
  showActions?: boolean;
  reducedMotion?: boolean;
  sequential?: boolean;
}) {
  return (
    <MessageScrollerItem
      className="[contain-intrinsic-size:none] [content-visibility:visible]"
      messageId={message.id}
      style={{ contentVisibility: "visible" }}
    >
      <PerplexityStoryBody
        message={message}
        reducedMotion={reducedMotion}
        sequential={sequential}
        showActions={showActions}
      />
    </MessageScrollerItem>
  );
}

function PerplexityThread({
  messages,
  reducedMotion,
  completeIds,
  playing = false,
  thinking = false,
  busy = false,
  onSend,
  onStop,
}: {
  messages: PerplexityStoryMessage[];
  reducedMotion: boolean;
  completeIds?: ReadonlySet<string>;
  playing?: boolean;
  thinking?: boolean;
  busy?: boolean;
  onSend?: (text: string) => void;
  onStop?: () => void;
}) {
  return (
    <MessageScrollerProvider autoScroll>
      <MessageScroller className="min-h-0 flex-1">
        <MessageScrollerViewport>
          <MessageScrollerContent className="mx-auto w-full max-w-3xl gap-8 px-5 py-8">
            {messages.map((message) => (
              <PerplexityRow
                key={message.id}
                message={message}
                reducedMotion={reducedMotion}
                sequential={Boolean(
                  playing && completeIds && !completeIds.has(message.id)
                )}
                showActions={completeIds?.has(message.id) ?? true}
              />
            ))}
            {thinking ? (
              <MessageScrollerItem
                className="[contain-intrinsic-size:none] [content-visibility:visible]"
                messageId="thinking"
                style={{ contentVisibility: "visible" }}
              >
                <PerplexityThinking reducedMotion={reducedMotion} />
              </MessageScrollerItem>
            ) : null}
          </MessageScrollerContent>
        </MessageScrollerViewport>
        <MessageScrollerButton />
      </MessageScroller>
      <div className="mx-auto w-full max-w-3xl px-4 pb-4">
        <PerplexityComposer busy={busy} onSend={onSend} onStop={onStop} />
      </div>
    </MessageScrollerProvider>
  );
}

function PerplexityPlayFrame({
  reducedMotion,
  allowSend = false,
}: {
  reducedMotion: boolean;
  allowSend?: boolean;
}) {
  const playback = usePerplexityPlayback(
    PERPLEXITY_STORY_THREAD,
    reducedMotion
  );
  const replyIndexRef = useRef(0);

  return (
    <PerplexityFrame
      onPlay={() => {
        if (playback.playing) {
          playback.stop();
          return;
        }
        playback.play().catch(() => undefined);
      }}
      playing={playback.playing}
    >
      <PerplexityThread
        busy={playback.playing || playback.thinking}
        completeIds={playback.completeIds}
        messages={playback.messages}
        onSend={
          allowSend
            ? (text) => {
                if (playback.playing) {
                  return;
                }
                const reply =
                  PERPLEXITY_STORY_REPLIES[
                    replyIndexRef.current % PERPLEXITY_STORY_REPLIES.length
                  ] ?? "Gerne.";
                replyIndexRef.current += 1;
                playback.send(text, reply).catch(() => undefined);
              }
            : undefined
        }
        onStop={playback.stop}
        playing={playback.playing}
        reducedMotion={reducedMotion}
        thinking={playback.thinking}
      />
    </PerplexityFrame>
  );
}

export function DesignSystemPerplexityCatalog() {
  const reducedMotion = useReducedMotion() ?? false;

  return (
    <>
      <section className="scroll-mt-10 space-y-6" id="perplexity-thread">
        <DesignSystemSectionHeader
          description="Play the thread — thinking, then globe search, then the serif answer."
          id="perplexity-thread"
          title="Thread"
        />
        <PerplexityPlayFrame reducedMotion={reducedMotion} />
      </section>

      <section className="scroll-mt-10 space-y-6" id="perplexity-user">
        <DesignSystemSectionHeader
          description="User turns sit in a light gray pill, sans-serif, aligned end."
          id="perplexity-user"
          title="User bubbles"
        />
        <div className="space-y-6 rounded-[1.25rem] border border-black/8 bg-white px-4 py-8 dark:border-white/10 dark:bg-[#111]">
          {PERPLEXITY_STORY_USER_MESSAGES.map((message) => (
            <PerplexityMessage from="user" key={message.id}>
              {message.text}
            </PerplexityMessage>
          ))}
        </div>
      </section>

      <section className="scroll-mt-10 space-y-6" id="perplexity-assistant">
        <DesignSystemSectionHeader
          description="Assistant turns use serif type. Search sits above; the action bar opens a sources drawer."
          id="perplexity-assistant"
          title="Assistant + search"
        />
        <div className="space-y-10 rounded-[1.25rem] border border-black/8 bg-white px-4 py-8 dark:border-white/10 dark:bg-[#111]">
          {PERPLEXITY_STORY_ASSISTANT_MESSAGES.map((message) => (
            <PerplexityStoryBody
              key={message.id}
              message={message}
              reducedMotion={reducedMotion}
            />
          ))}
        </div>
      </section>

      <section className="scroll-mt-10 space-y-6" id="perplexity-models">
        <DesignSystemSectionHeader
          description="Search / Research on the left, Model on the right."
          id="perplexity-models"
          title="Composer"
        />
        <div className="rounded-[1.25rem] border border-black/8 bg-white px-4 py-6 dark:border-white/10 dark:bg-[#111]">
          <div className="mx-auto w-full max-w-3xl">
            <PerplexityComposer />
          </div>
        </div>
      </section>

      <section className="scroll-mt-10 space-y-6" id="perplexity-playground">
        <DesignSystemSectionHeader
          description="Play the story, or send a follow-up. The Model chip opens the locked Pro list."
          id="perplexity-playground"
          title="Playground"
        />
        <PerplexityPlayFrame allowSend reducedMotion={reducedMotion} />
      </section>
    </>
  );
}
