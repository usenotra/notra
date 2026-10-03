"use client";

import { PlayIcon, StopIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { ClaudeChatActions } from "@notra/ui/components/ai-skins/claude-chat/claude-chat-actions";
import { ClaudeChatComposer } from "@notra/ui/components/ai-skins/claude-chat/claude-chat-composer";
import { ClaudeChatMessage } from "@notra/ui/components/ai-skins/claude-chat/claude-chat-message";
import { ClaudeChatSearch } from "@notra/ui/components/ai-skins/claude-chat/claude-chat-search";
import { ClaudeChatSources } from "@notra/ui/components/ai-skins/claude-chat/claude-chat-sources";
import { ClaudeChatThinking } from "@notra/ui/components/ai-skins/claude-chat/claude-chat-thinking";
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
import { useClaudeChatPlayback } from "@/components/design-system/use-claude-chat-playback";
import {
  CLAUDE_CHAT_STORY_ASSISTANT_MESSAGES,
  CLAUDE_CHAT_STORY_REPLIES,
  CLAUDE_CHAT_STORY_THREAD,
  CLAUDE_CHAT_STORY_USER_MESSAGES,
} from "@/constants/design-system-claude-chat";
import {
  splitBoldSegments,
  splitWithOffsets,
} from "@/lib/design-system/text-segments";
import type { ClaudeChatStoryMessage } from "@/types/design-system-claude-chat";

function ClaudeChatFrame({
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
        "relative flex h-[36rem] flex-col overflow-hidden rounded-[1.25rem] border border-black/8 bg-[#faf9f5] dark:border-white/10 dark:bg-[#1c1b18]",
        className
      )}
    >
      {onPlay ? (
        <button
          aria-label={playing ? "Stop playback" : "Play conversation"}
          className="dark:hover:text-foreground absolute top-3 right-3 z-10 flex size-8 items-center justify-center rounded-full border border-black/8 bg-[#faf9f5]/90 text-[#8a8680] shadow-sm backdrop-blur-sm transition-colors hover:text-[#1f1e1b] dark:border-white/10 dark:bg-[#1c1b18]/90"
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

function ClaudeChatStoryText({ text }: { text: string }) {
  const blocks = splitWithOffsets(text, "\n\n", 2);

  return (
    <span className={blocks.length > 1 ? "flex flex-col gap-3.5" : undefined}>
      {blocks.map((block) => {
        const lines = splitWithOffsets(block.text, "\n", 1);
        const isList = lines.every((line) => line.text.startsWith("- "));
        if (isList) {
          return (
            <span className="flex flex-col gap-1.5 ps-1" key={block.offset}>
              {lines.map((line) => (
                <span className="flex gap-2.5" key={line.offset}>
                  <span
                    aria-hidden
                    className="mt-[0.7em] size-1 shrink-0 rounded-full bg-current"
                  />
                  <ClaudeChatInlineText text={line.text.slice(2)} />
                </span>
              ))}
            </span>
          );
        }

        return (
          <span key={block.offset}>
            <ClaudeChatInlineText text={block.text} />
          </span>
        );
      })}
    </span>
  );
}

function ClaudeChatInlineText({ text }: { text: string }) {
  const parts = splitBoldSegments(text);

  return (
    <>
      {parts.map((part) => {
        if (part.text.startsWith("**") && part.text.endsWith("**")) {
          return <strong key={part.offset}>{part.text.slice(2, -2)}</strong>;
        }

        return <span key={part.offset}>{part.text}</span>;
      })}
    </>
  );
}

function ClaudeChatStoryBody({
  message,
  showActions = true,
  reducedMotion = false,
  sequential = false,
}: {
  message: ClaudeChatStoryMessage;
  showActions?: boolean;
  reducedMotion?: boolean;
  sequential?: boolean;
}) {
  const isUser = message.from === "user";

  return (
    <ClaudeChatMessage
      actions={
        <div className={showActions ? undefined : "invisible"}>
          <ClaudeChatActions from={message.from} text={message.text} />
        </div>
      }
      from={message.from}
      search={
        message.search ? (
          <ClaudeChatSearch
            groups={message.search.groups}
            reducedMotion={reducedMotion}
            sequential={sequential}
            steps={message.search.steps}
            verb={message.search.verb}
          />
        ) : undefined
      }
      sources={
        message.sources && message.text ? (
          <ClaudeChatSources sources={message.sources} />
        ) : undefined
      }
    >
      {isUser ? message.text : <ClaudeChatStoryText text={message.text} />}
    </ClaudeChatMessage>
  );
}

function ClaudeChatRow({
  message,
  showActions = true,
  reducedMotion = false,
  sequential = false,
}: {
  message: ClaudeChatStoryMessage;
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
      <ClaudeChatStoryBody
        message={message}
        reducedMotion={reducedMotion}
        sequential={sequential}
        showActions={showActions}
      />
    </MessageScrollerItem>
  );
}

function ClaudeChatThread({
  messages,
  reducedMotion,
  completeIds,
  playing = false,
  thinking = false,
  busy = false,
  onSend,
  onStop,
}: {
  messages: ClaudeChatStoryMessage[];
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
          <MessageScrollerContent className="mx-auto w-full max-w-3xl gap-10 px-4 py-8">
            {messages.map((message) => (
              <ClaudeChatRow
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
                <ClaudeChatThinking reducedMotion={reducedMotion} />
              </MessageScrollerItem>
            ) : null}
          </MessageScrollerContent>
        </MessageScrollerViewport>
        <MessageScrollerButton />
      </MessageScroller>
      <div className="mx-auto w-full max-w-3xl px-4 pb-4">
        <ClaudeChatComposer busy={busy} onSend={onSend} onStop={onStop} />
      </div>
    </MessageScrollerProvider>
  );
}

function ClaudeChatPlayFrame({
  reducedMotion,
  allowSend = false,
}: {
  reducedMotion: boolean;
  allowSend?: boolean;
}) {
  const playback = useClaudeChatPlayback(
    CLAUDE_CHAT_STORY_THREAD,
    reducedMotion
  );
  const replyIndexRef = useRef(0);

  return (
    <ClaudeChatFrame
      onPlay={() => {
        if (playback.playing) {
          playback.stop();
          return;
        }
        playback.play().catch(() => undefined);
      }}
      playing={playback.playing}
    >
      <ClaudeChatThread
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
                  CLAUDE_CHAT_STORY_REPLIES[
                    replyIndexRef.current % CLAUDE_CHAT_STORY_REPLIES.length
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
    </ClaudeChatFrame>
  );
}

export function DesignSystemClaudeChatCatalog() {
  const reducedMotion = useReducedMotion() ?? false;

  return (
    <>
      <section className="scroll-mt-10 space-y-6" id="claude-chat-thread">
        <DesignSystemSectionHeader
          description="Play the thread — Claude spinner, Entwirren search, then the serif reply. Hover Opus 5 Hoch to pick model and effort."
          id="claude-chat-thread"
          title="Thread"
        />
        <ClaudeChatPlayFrame reducedMotion={reducedMotion} />
      </section>

      <section className="scroll-mt-10 space-y-6" id="claude-chat-user">
        <DesignSystemSectionHeader
          description="User turns sit in a warm gray pill, max 70% width, aligned end."
          id="claude-chat-user"
          title="User bubbles"
        />
        <div className="space-y-6 rounded-[1.25rem] border border-black/8 bg-[#faf9f5] px-4 py-8 dark:border-white/10 dark:bg-[#1c1b18]">
          {CLAUDE_CHAT_STORY_USER_MESSAGES.map((message) => (
            <ClaudeChatMessage from="user" key={message.id}>
              {message.text}
            </ClaudeChatMessage>
          ))}
        </div>
      </section>

      <section className="scroll-mt-10 space-y-6" id="claude-chat-assistant">
        <DesignSystemSectionHeader
          description="Assistant turns use serif type. Search sits above the reply; sources sit below."
          id="claude-chat-assistant"
          title="Assistant + search"
        />
        <div className="space-y-10 rounded-[1.25rem] border border-black/8 bg-[#faf9f5] px-4 py-8 dark:border-white/10 dark:bg-[#1c1b18]">
          <ClaudeChatThinking reducedMotion={reducedMotion} />
          {CLAUDE_CHAT_STORY_ASSISTANT_MESSAGES.map((message) => (
            <ClaudeChatStoryBody
              key={message.id}
              message={message}
              reducedMotion={reducedMotion}
            />
          ))}
        </div>
      </section>

      <section className="scroll-mt-10 space-y-6" id="claude-chat-models">
        <DesignSystemSectionHeader
          description="Hover Opus 5 Hoch — current model with check, Aufwand, then Weitere Modelle as a flyout."
          id="claude-chat-models"
          title="Model picker"
        />
        <div className="rounded-[1.25rem] border border-black/8 bg-[#faf9f5] px-4 py-6 dark:border-white/10 dark:bg-[#1c1b18]">
          <div className="mx-auto w-full max-w-3xl">
            <ClaudeChatComposer />
          </div>
        </div>
      </section>

      <section className="scroll-mt-10 space-y-6" id="claude-chat-playground">
        <DesignSystemSectionHeader
          description="Play the story, or send a message. Hover the chip to switch Opus, Fable, Sonnet, or Haiku."
          id="claude-chat-playground"
          title="Playground"
        />
        <ClaudeChatPlayFrame allowSend reducedMotion={reducedMotion} />
      </section>
    </>
  );
}
