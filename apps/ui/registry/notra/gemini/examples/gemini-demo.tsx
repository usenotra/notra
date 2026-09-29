"use client";

import { useEffect, useRef } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

import { GeminiActions } from "../components/gemini-actions";
import { GeminiComposer } from "../components/gemini-composer";
import { GeminiMessage } from "../components/gemini-message";
import { GeminiStoryText } from "../components/gemini-story-text";
import { GeminiThinking } from "../components/gemini-thinking";
import { GeminiThoughts } from "../components/gemini-thoughts";
import {
  GEMINI_STORY_REPLIES,
  GEMINI_STORY_THREAD,
} from "../constants/gemini-story";
import { useGeminiPlayback } from "../hooks/use-gemini-playback";
import { useGeminiReducedMotion } from "../hooks/use-gemini-reduced-motion";

export default function GeminiDemo() {
  const reducedMotion = useGeminiReducedMotion();
  const playback = useGeminiPlayback(GEMINI_STORY_THREAD, reducedMotion);
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
    viewport?.scrollTo({
      behavior: reducedMotion ? "auto" : "smooth",
      top: viewport.scrollHeight,
    });
  }, [playback.messages, playback.thinking, reducedMotion]);

  const handleSend = (text: string) => {
    if (playback.playing) {
      return;
    }
    const reply =
      GEMINI_STORY_REPLIES[
        replyIndexRef.current % GEMINI_STORY_REPLIES.length
      ] ?? "Sure.";
    replyIndexRef.current += 1;
    playback.send(text, reply).catch(() => undefined);
  };

  return (
    <Card
      className="border-gemini-border bg-gemini-bg font-gemini text-gemini-fg h-150 w-full min-w-0 gap-0 overflow-hidden rounded-2xl border py-0 text-base ring-0"
      data-slot="gemini-demo"
    >
      <CardHeader className="flex h-12 shrink-0 items-center justify-between gap-3 ps-5 pe-3">
        <CardTitle className="text-gemini-muted text-base leading-6 font-normal">
          Gemini
        </CardTitle>
      </CardHeader>
      <ScrollArea className="min-h-0 flex-1" ref={scrollRef}>
        <CardContent
          aria-live="polite"
          className="mx-auto flex w-full max-w-3xl min-w-0 flex-col gap-8 px-5 pt-4 pb-8"
          role="log"
        >
          {playback.messages.map((message) => (
            <GeminiMessage
              actions={
                message.from === "assistant" ? (
                  <div
                    className={
                      playback.completeIds.has(message.id)
                        ? undefined
                        : "invisible"
                    }
                  >
                    <GeminiActions />
                  </div>
                ) : undefined
              }
              from={message.from}
              key={message.id}
              thoughts={
                message.thoughts ? (
                  <GeminiThoughts steps={message.thoughts} />
                ) : undefined
              }
            >
              {message.from === "user" ? (
                message.text
              ) : (
                <GeminiStoryText
                  sources={message.sources}
                  text={message.text}
                />
              )}
            </GeminiMessage>
          ))}
          {playback.thinking ? (
            <GeminiThinking
              label={playback.thinkingLabel}
              reducedMotion={reducedMotion}
            />
          ) : null}
        </CardContent>
      </ScrollArea>
      <CardContent className="mx-auto w-full max-w-3xl min-w-0 shrink-0 px-5 pb-5">
        <GeminiComposer
          busy={playback.playing || playback.thinking}
          onSend={handleSend}
          onStop={playback.stop}
        />
      </CardContent>
    </Card>
  );
}
