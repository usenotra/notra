"use client";

import { PlayIcon, StopIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { GeminiActions } from "@notra/ui/components/ai-skins/gemini/gemini-actions";
import { GeminiComposer } from "@notra/ui/components/ai-skins/gemini/gemini-composer";
import { GeminiMessage } from "@notra/ui/components/ai-skins/gemini/gemini-message";
import { GeminiThinking } from "@notra/ui/components/ai-skins/gemini/gemini-thinking";
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
import { useGeminiPlayback } from "@/components/design-system/use-gemini-playback";
import {
  GEMINI_STORY_ASSISTANT_MESSAGES,
  GEMINI_STORY_REPLIES,
  GEMINI_STORY_THREAD,
  GEMINI_STORY_USER_MESSAGES,
} from "@/constants/design-system-gemini";
import {
  splitBoldSegments,
  splitWithOffsets,
} from "@/lib/design-system/text-segments";
import type { GeminiStoryMessage } from "@/types/design-system-gemini";

function GeminiFrame({
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
        "relative flex h-[36rem] flex-col overflow-hidden rounded-[1.25rem] border border-black/8 bg-white dark:border-white/10 dark:bg-[#1f1f1f]",
        className
      )}
    >
      {onPlay ? (
        <button
          aria-label={playing ? "Stop playback" : "Play conversation"}
          className="dark:hover:text-foreground absolute top-3 right-3 z-10 flex size-8 items-center justify-center rounded-full border border-black/8 bg-white/90 text-[#5f6368] shadow-sm backdrop-blur-sm transition-colors hover:text-[#1f1f1f] dark:border-white/10 dark:bg-[#1f1f1f]/90"
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

function GeminiInlineText({ text }: { text: string }) {
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

function GeminiStoryText({ text }: { text: string }) {
  const paragraphs = splitWithOffsets(text, "\n\n", 2);

  return (
    <span className={paragraphs.length > 1 ? "flex flex-col gap-3" : undefined}>
      {paragraphs.map((paragraph) => (
        <span key={paragraph.offset}>
          <GeminiInlineText text={paragraph.text} />
        </span>
      ))}
    </span>
  );
}

function GeminiStoryBody({
  message,
  showActions = true,
}: {
  message: GeminiStoryMessage;
  showActions?: boolean;
}) {
  const isUser = message.from === "user";

  return (
    <GeminiMessage
      actions={
        isUser ? undefined : (
          <div className={showActions ? undefined : "invisible"}>
            <GeminiActions text={message.text} />
          </div>
        )
      }
      from={message.from}
    >
      {isUser ? message.text : <GeminiStoryText text={message.text} />}
    </GeminiMessage>
  );
}

function GeminiRow({
  message,
  showActions = true,
}: {
  message: GeminiStoryMessage;
  showActions?: boolean;
}) {
  return (
    <MessageScrollerItem
      className="[contain-intrinsic-size:none] [content-visibility:visible]"
      messageId={message.id}
      style={{ contentVisibility: "visible" }}
    >
      <GeminiStoryBody message={message} showActions={showActions} />
    </MessageScrollerItem>
  );
}

function GeminiThread({
  messages,
  reducedMotion,
  completeIds,
  thinking = false,
  thinkingLabel = "Web wird durchsucht",
  busy = false,
  onSend,
  onStop,
}: {
  messages: GeminiStoryMessage[];
  reducedMotion: boolean;
  completeIds?: ReadonlySet<string>;
  thinking?: boolean;
  thinkingLabel?: string;
  busy?: boolean;
  onSend?: (text: string) => void;
  onStop?: () => void;
}) {
  return (
    <MessageScrollerProvider autoScroll>
      <MessageScroller className="min-h-0 flex-1">
        <MessageScrollerViewport>
          <MessageScrollerContent className="mx-auto w-full max-w-3xl gap-8 px-4 py-8">
            {messages.map((message) => (
              <GeminiRow
                key={message.id}
                message={message}
                showActions={completeIds?.has(message.id) ?? true}
              />
            ))}
            {thinking ? (
              <MessageScrollerItem
                className="[contain-intrinsic-size:none] [content-visibility:visible]"
                messageId="thinking"
                style={{ contentVisibility: "visible" }}
              >
                <GeminiThinking
                  label={thinkingLabel}
                  reducedMotion={reducedMotion}
                />
              </MessageScrollerItem>
            ) : null}
          </MessageScrollerContent>
        </MessageScrollerViewport>
        <MessageScrollerButton />
      </MessageScroller>
      <div className="mx-auto w-full max-w-3xl px-4 pb-4">
        <GeminiComposer busy={busy} onSend={onSend} onStop={onStop} />
      </div>
    </MessageScrollerProvider>
  );
}

function GeminiPlayFrame({
  reducedMotion,
  allowSend = false,
}: {
  reducedMotion: boolean;
  allowSend?: boolean;
}) {
  const playback = useGeminiPlayback(GEMINI_STORY_THREAD, reducedMotion);
  const replyIndexRef = useRef(0);

  return (
    <GeminiFrame
      onPlay={() => {
        if (playback.playing) {
          playback.stop();
          return;
        }
        playback.play().catch(() => undefined);
      }}
      playing={playback.playing}
    >
      <GeminiThread
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
                  GEMINI_STORY_REPLIES[
                    replyIndexRef.current % GEMINI_STORY_REPLIES.length
                  ] ?? "Gerne.";
                replyIndexRef.current += 1;
                playback.send(text, reply).catch(() => undefined);
              }
            : undefined
        }
        onStop={playback.stop}
        reducedMotion={reducedMotion}
        thinking={playback.thinking}
        thinkingLabel={playback.thinkingLabel}
      />
    </GeminiFrame>
  );
}

export function DesignSystemGeminiCatalog() {
  const reducedMotion = useReducedMotion() ?? false;

  return (
    <>
      <section className="scroll-mt-10 space-y-6" id="gemini-thread">
        <DesignSystemSectionHeader
          description="Play the thread — sparkle search, then the reply. The Pro chip opens Flash, Pro, and Thinking."
          id="gemini-thread"
          title="Thread"
        />
        <GeminiPlayFrame reducedMotion={reducedMotion} />
      </section>

      <section className="scroll-mt-10 space-y-6" id="gemini-user">
        <DesignSystemSectionHeader
          description="User turns sit in a cool gray pill, max 70% width, aligned end."
          id="gemini-user"
          title="User bubbles"
        />
        <div className="space-y-6 rounded-[1.25rem] border border-black/8 bg-white px-4 py-8 dark:border-white/10 dark:bg-[#1f1f1f]">
          {GEMINI_STORY_USER_MESSAGES.map((message) => (
            <GeminiMessage from="user" key={message.id}>
              {message.text}
            </GeminiMessage>
          ))}
        </div>
      </section>

      <section className="scroll-mt-10 space-y-6" id="gemini-assistant">
        <DesignSystemSectionHeader
          description="Assistant turns have no bubble. Search is a sparkle plus status; actions sit under the reply."
          id="gemini-assistant"
          title="Assistant + actions"
        />
        <div className="space-y-10 rounded-[1.25rem] border border-black/8 bg-white px-4 py-8 dark:border-white/10 dark:bg-[#1f1f1f]">
          <GeminiThinking reducedMotion={reducedMotion} />
          {GEMINI_STORY_ASSISTANT_MESSAGES.map((message) => (
            <GeminiStoryBody key={message.id} message={message} />
          ))}
        </div>
      </section>

      <section className="scroll-mt-10 space-y-6" id="gemini-models">
        <DesignSystemSectionHeader
          description="Open Pro — current model with a left check, Neu on Flash, Thinking below the divider."
          id="gemini-models"
          title="Model picker"
        />
        <div className="rounded-[1.25rem] border border-black/8 bg-white px-4 py-6 dark:border-white/10 dark:bg-[#1f1f1f]">
          <div className="mx-auto w-full max-w-3xl">
            <GeminiComposer />
          </div>
        </div>
      </section>

      <section className="scroll-mt-10 space-y-6" id="gemini-playground">
        <DesignSystemSectionHeader
          description="Play the story, or send a message. Switch Flash-Lite, Flash, Pro, or Thinking from the chip."
          id="gemini-playground"
          title="Playground"
        />
        <GeminiPlayFrame allowSend reducedMotion={reducedMotion} />
      </section>
    </>
  );
}
