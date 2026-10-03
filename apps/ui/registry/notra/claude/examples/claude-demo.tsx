"use client";

import { useEffect, useRef } from "react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

import { ClaudeActions } from "../components/claude-actions";
import { ClaudeComposer } from "../components/claude-composer";
import { ClaudeLogoIcon } from "../components/claude-icons";
import { ClaudeMessage } from "../components/claude-message";
import { ClaudeSearch } from "../components/claude-search";
import { ClaudeSources } from "../components/claude-sources";
import { ClaudeThinking } from "../components/claude-thinking";
import {
  CLAUDE_DEMO_REPLIES,
  CLAUDE_DEMO_THREAD,
} from "../constants/claude-demo";
import { useClaudePlayback } from "../hooks/use-claude-playback";
import { useClaudeReducedMotion } from "../hooks/use-claude-reduced-motion";
import { splitBoldSegments, splitWithOffsets } from "../lib/claude-text";
import type { ClaudeDemoMessage } from "../types/claude";

const LIST_MARKER = "- ";

const ClaudeInlineText = ({ text }: { text: string }) =>
  splitBoldSegments(text).map((part) =>
    part.text.startsWith("**") && part.text.endsWith("**") ? (
      <strong key={part.offset}>{part.text.slice(2, -2)}</strong>
    ) : (
      <span key={part.offset}>{part.text}</span>
    )
  );

const ClaudeRichText = ({ text }: { text: string }) => {
  const blocks = splitWithOffsets(text, "\n\n", 2);

  return (
    <span className={blocks.length > 1 ? "flex flex-col gap-3.5" : undefined}>
      {blocks.map((block) => {
        const lines = splitWithOffsets(block.text, "\n", 1);
        if (lines.every((line) => line.text.startsWith(LIST_MARKER))) {
          return (
            <span className="flex flex-col gap-1.5 ps-1" key={block.offset}>
              {lines.map((line) => (
                <span className="flex gap-2.5" key={line.offset}>
                  <span
                    aria-hidden="true"
                    className="mt-[0.7em] size-1 shrink-0 rounded-full bg-current"
                  />
                  <span>
                    <ClaudeInlineText
                      text={line.text.slice(LIST_MARKER.length)}
                    />
                  </span>
                </span>
              ))}
            </span>
          );
        }
        return (
          <span key={block.offset}>
            <ClaudeInlineText text={block.text} />
          </span>
        );
      })}
    </span>
  );
};

const ClaudeDemoTurn = ({
  complete,
  message,
  reducedMotion,
  sequential,
}: {
  complete: boolean;
  message: ClaudeDemoMessage;
  reducedMotion: boolean;
  sequential: boolean;
}) => (
  <ClaudeMessage
    actions={
      <ClaudeActions
        className={complete ? undefined : "invisible"}
        from={message.from}
        text={message.text}
        timestamp={message.from === "user" ? "now" : undefined}
      />
    }
    from={message.from}
    search={
      message.search && (
        <ClaudeSearch
          groups={message.search.groups}
          items={message.search.items}
          reducedMotion={reducedMotion}
          sequential={sequential}
          steps={message.search.steps}
          summary={message.search.summary}
          thought={message.search.thought}
          verb={message.search.verb}
        />
      )
    }
    sources={
      message.sources &&
      message.text && <ClaudeSources sources={message.sources} />
    }
  >
    {message.from === "user" ? (
      message.text
    ) : (
      <ClaudeRichText text={message.text} />
    )}
  </ClaudeMessage>
);

export default function ClaudeDemo() {
  const reducedMotion = useClaudeReducedMotion();
  const playback = useClaudePlayback(CLAUDE_DEMO_THREAD, reducedMotion);
  const replyIndexRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasMountedRef = useRef(false);

  // Follow new messages inside the fixed-height card. Scrolling the viewport
  // directly (not scrollIntoView) keeps the host page from jumping.
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    const viewport = scrollRef.current?.querySelector(
      '[data-slot="scroll-area-viewport"]'
    );
    viewport?.scrollTo({ behavior: "smooth", top: viewport.scrollHeight });
  }, [playback.messages.length, playback.thinking]);

  const handleSend = (text: string) => {
    if (playback.playing) {
      return;
    }
    const reply =
      CLAUDE_DEMO_REPLIES[replyIndexRef.current % CLAUDE_DEMO_REPLIES.length];
    replyIndexRef.current += 1;
    playback.send(text, reply).catch(() => undefined);
  };

  return (
    <Card className="border-claude-border bg-claude-bg font-claude text-claude-fg h-150 w-full min-w-0 gap-0 rounded-2xl border py-0 text-base ring-0">
      <CardHeader className="flex h-10.75 shrink-0 items-center justify-between gap-3 px-3">
        <span className="text-claude-muted flex items-center gap-2 ps-1 text-sm font-medium">
          <ClaudeLogoIcon className="text-claude-accent size-4" />
          Claude
        </span>
      </CardHeader>
      <Separator className="bg-claude-border h-px w-full" />
      <ScrollArea className="min-h-0 flex-1" ref={scrollRef}>
        <CardContent className="mx-auto flex w-full max-w-3xl min-w-0 flex-col gap-4 px-5 py-6">
          {playback.messages.map((message) => {
            const complete = playback.completeIds.has(message.id);
            return (
              <ClaudeDemoTurn
                complete={complete}
                key={message.id}
                message={message}
                reducedMotion={reducedMotion}
                sequential={playback.playing && !complete}
              />
            );
          })}
          {playback.thinking && (
            <ClaudeThinking reducedMotion={reducedMotion} />
          )}
        </CardContent>
      </ScrollArea>
      <div className="mx-auto w-full max-w-3xl min-w-0 shrink-0 px-5 pb-4">
        <ClaudeComposer
          busy={playback.playing || playback.thinking}
          onSend={handleSend}
          onStop={playback.stop}
        />
      </div>
    </Card>
  );
}
