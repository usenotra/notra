"use client";

import { useEffect, useRef } from "react";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

import { ChatgptActions } from "../components/chatgpt-actions";
import { ChatgptActivity } from "../components/chatgpt-activity";
import { ChatgptComposer } from "../components/chatgpt-composer";
import { ChatgptLogoIcon } from "../components/chatgpt-icons";
import { ChatgptMessage } from "../components/chatgpt-message";
import { ChatgptReasoning } from "../components/chatgpt-reasoning";
import { ChatgptSourceChip } from "../components/chatgpt-source-chip";
import { ChatgptThinking } from "../components/chatgpt-thinking";
import {
  CHATGPT_STORY_REPLIES,
  CHATGPT_STORY_THREAD,
} from "../constants/chatgpt-story";
import { useChatgptPlayback } from "../hooks/use-chatgpt-playback";
import type {
  ChatgptActivitySource,
  ChatgptStoryMessage,
  ChatgptTextSegment,
} from "../types/chatgpt";

const BOLD_PATTERN = /(\*\*[^*]+\*\*)/g;

/** Copy should not include the citation markers. */
const CITE_STRIP = /\s?\{\{[a-z0-9,-]+\}\}/g;

const CITE_PATTERN = /(\{\{[a-z0-9,-]+\}\})/g;

const CITE_TOKEN_PATTERN = /^\{\{([a-z0-9,-]+)\}\}$/;

const PARAGRAPH_SEPARATOR = "\n\n";

const splitWithOffsets = (
  text: string,
  separator: string | RegExp,
  separatorLength: number
) => {
  const segments: ChatgptTextSegment[] = [];
  let offset = 0;
  for (const part of text.split(separator)) {
    if (part.length > 0) {
      segments.push({ offset, text: part });
    }
    offset += part.length + separatorLength;
  }
  return segments;
};

const ChatgptStoryText = ({
  sources = [],
  text,
}: {
  sources?: readonly ChatgptActivitySource[];
  text: string;
}) => {
  const paragraphs = splitWithOffsets(
    text,
    PARAGRAPH_SEPARATOR,
    PARAGRAPH_SEPARATOR.length
  );

  return (
    <span className={paragraphs.length > 1 ? "flex flex-col gap-3" : undefined}>
      {paragraphs.map((paragraph) => (
        <span key={paragraph.offset}>
          {splitWithOffsets(paragraph.text, CITE_PATTERN, 0).map((piece) => {
            const ids = piece.text.match(CITE_TOKEN_PATTERN)?.[1]?.split(",");
            if (ids) {
              const wanted = new Set(ids);
              const cited = sources.filter((source) => wanted.has(source.id));
              return <ChatgptSourceChip key={piece.offset} sources={cited} />;
            }
            return splitWithOffsets(piece.text, BOLD_PATTERN, 0).map((part) =>
              part.text.startsWith("**") && part.text.endsWith("**") ? (
                <strong key={`${piece.offset}:${part.offset}`}>
                  {part.text.slice(2, -2)}
                </strong>
              ) : (
                <span key={`${piece.offset}:${part.offset}`}>{part.text}</span>
              )
            );
          })}
        </span>
      ))}
    </span>
  );
};

const ChatgptStoryBody = ({
  complete = true,
  message,
}: {
  complete?: boolean;
  message: ChatgptStoryMessage;
}) => {
  if (message.from === "user") {
    return <ChatgptMessage from="user">{message.text}</ChatgptMessage>;
  }

  const { reasoning } = message;

  return (
    <ChatgptMessage
      actions={
        <div className={complete ? undefined : "invisible"}>
          <ChatgptActions text={message.text.replace(CITE_STRIP, "")} />
        </div>
      }
      from="assistant"
      reasoning={
        reasoning && (
          <ChatgptReasoning
            complete={complete}
            search={
              !reasoning.steps &&
              reasoning.search && (
                <ChatgptActivity
                  seconds={reasoning.seconds}
                  sites={reasoning.search.sites}
                  sourceCount={reasoning.search.sourceCount}
                  sources={reasoning.search.sources}
                  websites={reasoning.search.websites}
                />
              )
            }
            seconds={reasoning.seconds}
          >
            {reasoning.steps ? (
              <div className="flex flex-col items-start gap-3">
                {reasoning.steps.map((step) =>
                  step.kind === "search" ? (
                    <ChatgptActivity
                      key={`search-${step.search.websites}`}
                      seconds={reasoning.seconds}
                      sites={step.search.sites}
                      sourceCount={step.search.sourceCount}
                      sources={step.search.sources}
                      websites={step.search.websites}
                    />
                  ) : (
                    <div
                      className={
                        step.muted
                          ? "text-chatgpt-muted text-[0.9375rem] leading-7"
                          : "text-chatgpt-fg text-[0.9375rem] leading-7"
                      }
                      key={step.text}
                    >
                      <ChatgptStoryText text={step.text} />
                    </div>
                  )
                )}
              </div>
            ) : (
              <div className="text-chatgpt-fg text-[0.9375rem] leading-7">
                <ChatgptStoryText text={reasoning.text} />
              </div>
            )}
          </ChatgptReasoning>
        )
      }
    >
      <ChatgptStoryText
        sources={reasoning?.steps
          ?.flatMap((step) =>
            step.kind === "search" ? step.search.sources : []
          )
          .concat(reasoning.search?.sources ?? [])}
        text={message.text}
      />
    </ChatgptMessage>
  );
};

export default function ChatgptDemo() {
  const playback = useChatgptPlayback(CHATGPT_STORY_THREAD);
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

  const handleSend = async (text: string) => {
    if (playback.playing) {
      return;
    }
    const reply =
      CHATGPT_STORY_REPLIES[
        replyIndexRef.current % CHATGPT_STORY_REPLIES.length
      ];
    replyIndexRef.current += 1;
    await playback.send(text, reply);
  };

  return (
    <Card className="border-chatgpt-border bg-chatgpt-bg font-chatgpt text-chatgpt-fg h-150 w-full min-w-0 gap-0 rounded-2xl border py-0 text-base antialiased ring-0">
      <CardHeader className="flex h-12 shrink-0 items-center justify-between gap-3 rounded-none ps-4 pe-2">
        <CardTitle className="text-chatgpt-muted flex min-w-0 items-center gap-2 text-base leading-6 font-normal">
          <ChatgptLogoIcon className="size-4.5 shrink-0" />
          <span className="truncate">ChatGPT</span>
        </CardTitle>
      </CardHeader>
      <ScrollArea className="min-h-0 flex-1" ref={scrollRef}>
        <CardContent className="mx-auto flex w-full max-w-3xl min-w-0 flex-col gap-6 px-5 pt-4 pb-8">
          {playback.messages.map((message) => (
            <ChatgptStoryBody
              complete={playback.completeIds.has(message.id)}
              key={message.id}
              message={message}
            />
          ))}
          {playback.thinking && <ChatgptThinking />}
        </CardContent>
      </ScrollArea>
      <CardFooter className="mx-auto w-full max-w-3xl min-w-0 shrink-0 rounded-none border-t-0 bg-transparent px-5 pt-0 pb-5">
        <ChatgptComposer
          busy={playback.playing || playback.thinking}
          onSend={handleSend}
          onStop={playback.stop}
        />
      </CardFooter>
    </Card>
  );
}
