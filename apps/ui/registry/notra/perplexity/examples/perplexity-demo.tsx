"use client";

import { useEffect, useRef } from "react";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

import { PerplexityActions } from "../components/perplexity-actions";
import { PerplexityAnswer } from "../components/perplexity-answer";
import { PerplexityComposer } from "../components/perplexity-composer";
import { PerplexityLogoIcon } from "../components/perplexity-icons";
import { PerplexityMessage } from "../components/perplexity-message";
import { PerplexitySearch } from "../components/perplexity-search";
import { PerplexityThinking } from "../components/perplexity-thinking";
import { PerplexityUserActions } from "../components/perplexity-user-actions";
import {
  PERPLEXITY_DEMO_REPLIES,
  PERPLEXITY_DEMO_THREAD,
} from "../constants/perplexity-demo";
import { usePerplexityPlayback } from "../hooks/use-perplexity-playback";
import { usePerplexityReducedMotion } from "../hooks/use-perplexity-reduced-motion";
import type { PerplexityThreadMessage } from "../types/perplexity";

/** Copy should not include the citation markers. */
const CITE_STRIP = /\s?\{\{[a-z0-9,-]+\}\}/g;

interface ThreadMessageProps {
  complete: boolean;
  message: PerplexityThreadMessage;
  reducedMotion: boolean;
  sequential: boolean;
}

const ThreadMessage = ({
  complete,
  message,
  reducedMotion,
  sequential,
}: ThreadMessageProps) => {
  if (message.from === "user") {
    return (
      <PerplexityMessage
        actions={
          <PerplexityUserActions text={message.text} timestamp="09:18" />
        }
        from="user"
      >
        {message.text}
      </PerplexityMessage>
    );
  }

  return (
    <PerplexityMessage
      actions={
        <PerplexityActions
          className={complete ? undefined : "invisible"}
          sources={message.search?.sources}
          text={message.text.replace(CITE_STRIP, "")}
        />
      }
      from="assistant"
      search={
        message.search ? (
          <PerplexitySearch
            extraCount={message.search.extraCount}
            previewCount={message.search.previewCount}
            queries={message.search.queries}
            reducedMotion={reducedMotion}
            sequential={sequential}
            duration={message.search.duration}
            sources={message.search.sources}
            title={message.search.title}
          />
        ) : undefined
      }
    >
      {message.text ? (
        <PerplexityAnswer citations={message.citations} text={message.text} />
      ) : null}
    </PerplexityMessage>
  );
};

export default function PerplexityDemo() {
  const reducedMotion = usePerplexityReducedMotion();
  const playback = usePerplexityPlayback(PERPLEXITY_DEMO_THREAD, reducedMotion);
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

  const send = (text: string) => {
    if (playback.playing) {
      return;
    }
    const reply =
      PERPLEXITY_DEMO_REPLIES[
        replyIndexRef.current % PERPLEXITY_DEMO_REPLIES.length
      ] ?? "Sure.";
    replyIndexRef.current += 1;
    playback.send(text, reply).catch(() => undefined);
  };

  return (
    <Card className="bg-pplx-bg font-pplx text-pplx-fg ring-pplx-border h-150 w-full min-w-0 gap-0 rounded-2xl py-0 text-base">
      <CardHeader className="flex h-12 shrink-0 items-center justify-between gap-3 px-4">
        <CardTitle className="text-pplx-muted flex items-center gap-2 text-sm font-medium">
          <PerplexityLogoIcon className="size-5" />
          Perplexity
        </CardTitle>
      </CardHeader>
      <Separator className="bg-pplx-border" />
      <ScrollArea className="min-h-0 flex-1" ref={scrollRef}>
        <div className="mx-auto flex w-full max-w-3xl min-w-0 flex-col gap-5 px-5 pt-6 pb-6 wrap-break-word">
          {playback.messages.map((message) => (
            <ThreadMessage
              complete={playback.completeIds.has(message.id)}
              key={message.id}
              message={message}
              reducedMotion={reducedMotion}
              sequential={
                playback.playing && !playback.completeIds.has(message.id)
              }
            />
          ))}
          {playback.thinking ? (
            <PerplexityThinking reducedMotion={reducedMotion} />
          ) : null}
        </div>
      </ScrollArea>
      <div className="mx-auto w-full max-w-3xl min-w-0 shrink-0 px-4 pb-4">
        <PerplexityComposer
          busy={playback.playing || playback.thinking}
          onSend={send}
          onStop={playback.stop}
        />
      </div>
    </Card>
  );
}
