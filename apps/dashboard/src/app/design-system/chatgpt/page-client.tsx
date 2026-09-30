"use client";

import { PlayIcon, StopIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { ChatgptActions } from "@notra/ui/components/ai-skins/chatgpt/chatgpt-actions";
import { ChatgptActivity } from "@notra/ui/components/ai-skins/chatgpt/chatgpt-activity";
import { ChatgptComposer } from "@notra/ui/components/ai-skins/chatgpt/chatgpt-composer";
import { ChatgptMessage } from "@notra/ui/components/ai-skins/chatgpt/chatgpt-message";
import { ChatgptReasoning } from "@notra/ui/components/ai-skins/chatgpt/chatgpt-reasoning";
import { ChatgptThinking } from "@notra/ui/components/ai-skins/chatgpt/chatgpt-thinking";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@notra/ui/components/ui/message-scroller";
import { cn } from "@notra/ui/lib/utils";
import { domAnimation, LazyMotion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { useRef } from "react";

import { DesignSystemSectionHeader } from "@/components/design-system/design-system-section-header";
import { useChatgptPlayback } from "@/components/design-system/use-chatgpt-playback";
import {
  CHATGPT_STORY_ASSISTANT_MESSAGES,
  CHATGPT_STORY_REPLIES,
  CHATGPT_STORY_THREAD,
  CHATGPT_STORY_USER_MESSAGES,
} from "@/constants/design-system-chatgpt";
import {
  splitBoldSegments,
  splitWithOffsets,
} from "@/lib/design-system/text-segments";
import type { ChatgptStoryMessage } from "@/types/design-system-chatgpt";

function ChatgptFrame({
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
        "bg-background relative flex h-[36rem] flex-col overflow-hidden rounded-[1.25rem] border",
        className
      )}
    >
      {onPlay ? (
        <button
          aria-label={playing ? "Stop playback" : "Play conversation"}
          className="bg-background/90 text-muted-foreground hover:text-foreground absolute top-3 right-3 z-10 flex size-8 items-center justify-center rounded-full border shadow-sm backdrop-blur-sm transition-colors"
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

function ChatgptStoryText({ text }: { text: string }) {
  const paragraphs = splitWithOffsets(text, "\n\n", 2);

  return (
    <span className={paragraphs.length > 1 ? "flex flex-col gap-3" : undefined}>
      {paragraphs.map((paragraph) => {
        const parts = splitBoldSegments(paragraph.text);

        return (
          <span key={paragraph.offset}>
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

function ChatgptStoryBody({
  message,
  showActions = true,
}: {
  message: ChatgptStoryMessage;
  showActions?: boolean;
}) {
  const isUser = message.from === "user";

  return (
    <ChatgptMessage
      actions={
        isUser ? undefined : (
          <div className={showActions ? undefined : "invisible"}>
            <ChatgptActions text={message.text} />
          </div>
        )
      }
      from={message.from}
      reasoning={
        message.reasoning ? (
          <ChatgptReasoning
            complete={showActions}
            key={`${message.id}-work`}
            search={
              message.reasoning.search ? (
                <ChatgptActivity
                  seconds={message.reasoning.seconds}
                  sites={message.reasoning.search.sites}
                  sourceCount={message.reasoning.search.sourceCount}
                  sources={message.reasoning.search.sources}
                  websites={message.reasoning.search.websites}
                />
              ) : undefined
            }
            seconds={message.reasoning.seconds}
          >
            <div className="text-foreground text-[15px] leading-7">
              <ChatgptStoryText text={message.reasoning.text} />
            </div>
          </ChatgptReasoning>
        ) : undefined
      }
    >
      <ChatgptStoryText text={message.text} />
    </ChatgptMessage>
  );
}

function ChatgptRow({
  message,
  showActions = true,
}: {
  message: ChatgptStoryMessage;
  showActions?: boolean;
}) {
  return (
    <MessageScrollerItem
      className="[contain-intrinsic-size:none] [content-visibility:visible]"
      messageId={message.id}
      style={{ contentVisibility: "visible" }}
    >
      <ChatgptStoryBody message={message} showActions={showActions} />
    </MessageScrollerItem>
  );
}

function ChatgptThread({
  messages,
  reducedMotion,
  completeIds,
  thinking = false,
  busy = false,
  onSend,
  onStop,
}: {
  messages: ChatgptStoryMessage[];
  reducedMotion: boolean;
  completeIds?: ReadonlySet<string>;
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
              <ChatgptRow
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
                <ChatgptThinking reducedMotion={reducedMotion} />
              </MessageScrollerItem>
            ) : null}
          </MessageScrollerContent>
        </MessageScrollerViewport>
        <MessageScrollerButton />
      </MessageScroller>
      <div className="mx-auto w-full max-w-3xl px-4 pb-4">
        <ChatgptComposer busy={busy} onSend={onSend} onStop={onStop} />
      </div>
    </MessageScrollerProvider>
  );
}

function ChatgptPlayFrame({
  reducedMotion,
  allowSend = false,
}: {
  reducedMotion: boolean;
  allowSend?: boolean;
}) {
  const playback = useChatgptPlayback(CHATGPT_STORY_THREAD, reducedMotion);
  const replyIndexRef = useRef(0);

  return (
    <ChatgptFrame
      onPlay={async () => {
        if (playback.playing) {
          playback.stop();
          return;
        }
        await playback.play();
      }}
      playing={playback.playing}
    >
      <ChatgptThread
        busy={playback.playing || playback.thinking}
        completeIds={playback.completeIds}
        messages={playback.messages}
        onSend={
          allowSend
            ? async (text) => {
                if (playback.playing) {
                  return;
                }
                const reply =
                  CHATGPT_STORY_REPLIES[
                    replyIndexRef.current % CHATGPT_STORY_REPLIES.length
                  ] ?? "Gerne.";
                replyIndexRef.current += 1;
                await playback.send(text, reply);
              }
            : undefined
        }
        onStop={playback.stop}
        reducedMotion={reducedMotion}
        thinking={playback.thinking}
      />
    </ChatgptFrame>
  );
}

export function DesignSystemChatgptCatalog() {
  const reducedMotion = useReducedMotion() ?? false;

  return (
    <LazyMotion features={domAnimation} strict>
      <section className="scroll-mt-10 space-y-6" id="chatgpt-thread">
        <DesignSystemSectionHeader
          description="Play the thread as a live conversation — thinking, search, then the reply. Hover the effort chip to pick model and reasoning."
          id="chatgpt-thread"
          title="Thread"
        />
        <ChatgptPlayFrame reducedMotion={reducedMotion} />
      </section>

      <section className="scroll-mt-10 space-y-6" id="chatgpt-user">
        <DesignSystemSectionHeader
          description="User turns sit in a light gray-blue pill, max 70% width, aligned end."
          id="chatgpt-user"
          title="User bubbles"
        />
        <div className="bg-background space-y-6 rounded-[1.25rem] border px-4 py-8">
          {CHATGPT_STORY_USER_MESSAGES.map((message) => (
            <ChatgptMessage from="user" key={message.id}>
              {message.text}
            </ChatgptMessage>
          ))}
        </div>
      </section>

      <section className="scroll-mt-10 space-y-6" id="chatgpt-assistant">
        <DesignSystemSectionHeader
          description="Assistant turns have no bubble. Reasoning and search sit with the reply."
          id="chatgpt-assistant"
          title="Assistant + actions"
        />
        <div className="bg-background space-y-10 rounded-[1.25rem] border px-4 py-8">
          {CHATGPT_STORY_ASSISTANT_MESSAGES.map((message) => (
            <ChatgptStoryBody key={message.id} message={message} />
          ))}
        </div>
      </section>

      <section className="scroll-mt-10 space-y-6" id="chatgpt-models">
        <DesignSystemSectionHeader
          description="Hover the Medium chip — Model and Effort fly out to the side, without the Advanced header."
          id="chatgpt-models"
          title="Model picker"
        />
        <div className="bg-background rounded-[1.25rem] border px-4 py-6">
          <div className="mx-auto w-full max-w-3xl">
            <ChatgptComposer />
          </div>
        </div>
      </section>

      <section className="scroll-mt-10 space-y-6" id="chatgpt-playground">
        <DesignSystemSectionHeader
          description="Play the story, or send a message. Hover the chip to switch Sol, Terra, Luna, or GPT-5.5."
          id="chatgpt-playground"
          title="Playground"
        />
        <ChatgptPlayFrame allowSend reducedMotion={reducedMotion} />
      </section>
    </LazyMotion>
  );
}
