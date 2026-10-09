"use client";

import { type RefObject, useEffect, useRef, useState } from "react";
import { MessageResponse } from "@notra/ui/components/ai-elements/message";
import { ChatgptActions } from "@notra/ui/components/ai-skins/chatgpt/chatgpt-actions";
import { ChatgptComposer } from "@notra/ui/components/ai-skins/chatgpt/chatgpt-composer";
import { ChatgptMessage } from "@notra/ui/components/ai-skins/chatgpt/chatgpt-message";
import { ClaudeCodeMessage } from "@notra/ui/components/ai-skins/claude-code/claude-code-message";
import { ClaudeCodePrompt } from "@notra/ui/components/ai-skins/claude-code/claude-code-prompt";
import { ClaudeChatActions } from "@notra/ui/components/ai-skins/claude-chat/claude-chat-actions";
import { ClaudeChatComposer } from "@notra/ui/components/ai-skins/claude-chat/claude-chat-composer";
import { ClaudeChatMessage } from "@notra/ui/components/ai-skins/claude-chat/claude-chat-message";
import { CodexComposer } from "@notra/ui/components/ai-skins/codex/codex-composer";
import { CodexMessage } from "@notra/ui/components/ai-skins/codex/codex-message";
import { GeminiActions } from "@notra/ui/components/ai-skins/gemini/gemini-actions";
import { GeminiComposer } from "@notra/ui/components/ai-skins/gemini/gemini-composer";
import { GeminiMessage } from "@notra/ui/components/ai-skins/gemini/gemini-message";
import { OpencodeComposer } from "@notra/ui/components/ai-skins/opencode/opencode-composer";
import { OpencodeMessage } from "@notra/ui/components/ai-skins/opencode/opencode-message";
import { OpencodeSources } from "@notra/ui/components/ai-skins/opencode/opencode-sources";
import { PerplexityActions } from "@notra/ui/components/ai-skins/perplexity/perplexity-actions";
import { PerplexityComposer } from "@notra/ui/components/ai-skins/perplexity/perplexity-composer";
import { PerplexityMessage } from "@notra/ui/components/ai-skins/perplexity/perplexity-message";
import { PerplexitySearch } from "@notra/ui/components/ai-skins/perplexity/perplexity-search";
import { DEFAULT_GEO_ANSWER_THREAD_LABELS } from "@notra/ui/constants/geo";
import { geoAnswerEmptyClassName, geoAnswerMarkdownFontClass } from "@notra/ui/lib/geo-answer-font";
import {
  chatgptModelForEngine,
  claudeModelForEngine,
  geminiModelForEngine,
  perplexityModelForEngine,
} from "@notra/ui/lib/geo-chat-model";
import { geoChatSkin } from "@notra/ui/lib/geo-chat-skin";
import { perplexitySourcesFromExcerpt } from "@notra/ui/lib/geo-perplexity-sources";
import { cn } from "@notra/ui/lib/utils";
import type {
  GeoChatSkin,
  GeoPromptAnswerThreadProps,
} from "@notra/ui/types/geo";

const ANSWER_MARKDOWN_CLASS =
  "[&_h1]:mt-0 [&_h1]:mb-2 [&_h1]:text-[1.15em] [&_h1]:font-semibold [&_h2]:mt-3 [&_h2]:mb-1.5 [&_h2]:text-[1.05em] [&_h2]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1 [&_h3]:text-[1em] [&_h3]:font-semibold [&_p]:my-2.5 [&_ul]:my-2.5 [&_ol]:my-2.5";

/** Space between the last line of the answer and the floating composer. */
const THREAD_COMPOSER_GAP_PX = 24;

/** Tracks an element's height, so content can leave room for an overlay. */
function useElementHeight(ref: RefObject<HTMLElement | null>): number {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }
    const update = () => setHeight(element.offsetHeight);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return height;
}

const SKIN_SURFACE: Record<GeoChatSkin, string> = {
  claude: "bg-[#faf9f5] dark:bg-[#1c1b18]",
  chatgpt: "bg-background",
  gemini: "bg-white dark:bg-[#1f1f1f]",
  perplexity: "bg-white dark:bg-[#111]",
  opencode: "bg-[var(--opencode-tui-background,#090909)]",
  "claude-code": "bg-[#0f0f0f]",
  codex: "bg-[#0f0f0f]",
};

function ignoreFollowUp(_text: string): void {
  // The composer is visual chrome; follow-ups are not sent.
}

function AnswerMarkdown({ text, skin }: { text: string; skin: GeoChatSkin }) {
  return (
    <MessageResponse
      className={cn(ANSWER_MARKDOWN_CLASS, geoAnswerMarkdownFontClass(skin))}
    >
      {text}
    </MessageResponse>
  );
}

function AssistantBody({
  excerpt,
  emptyText,
  skin,
}: {
  excerpt: string;
  emptyText: string;
  skin: GeoChatSkin;
}) {
  if (excerpt.length > 0) {
    return <AnswerMarkdown skin={skin} text={excerpt} />;
  }

  return (
    <p className={cn("text-muted-foreground", geoAnswerEmptyClassName(skin))}>
      {emptyText}
    </p>
  );
}

function ClaudeAnswerThread({
  prompt,
  excerpt,
  emptyText,
  timestamp,
}: {
  prompt: string;
  excerpt: string;
  emptyText: string;
  timestamp: string;
}) {
  return (
    <>
      <ClaudeChatMessage from="user">{prompt}</ClaudeChatMessage>
      <ClaudeChatMessage
        actions={
          excerpt.length > 0 ? (
            <ClaudeChatActions text={excerpt} timestamp={timestamp} />
          ) : undefined
        }
        from="assistant"
      >
        <AssistantBody excerpt={excerpt} emptyText={emptyText} skin="claude" />
      </ClaudeChatMessage>
    </>
  );
}

function ChatgptAnswerThread({
  prompt,
  excerpt,
  emptyText,
}: {
  prompt: string;
  excerpt: string;
  emptyText: string;
}) {
  return (
    <>
      <ChatgptMessage from="user">{prompt}</ChatgptMessage>
      <ChatgptMessage
        actions={
          excerpt.length > 0 ? <ChatgptActions text={excerpt} /> : undefined
        }
        from="assistant"
      >
        <AssistantBody excerpt={excerpt} emptyText={emptyText} skin="chatgpt" />
      </ChatgptMessage>
    </>
  );
}

function GeminiAnswerThread({
  prompt,
  excerpt,
  emptyText,
}: {
  prompt: string;
  excerpt: string;
  emptyText: string;
}) {
  return (
    <>
      <GeminiMessage from="user">{prompt}</GeminiMessage>
      <GeminiMessage
        actions={
          excerpt.length > 0 ? <GeminiActions text={excerpt} /> : undefined
        }
        from="assistant"
      >
        <AssistantBody excerpt={excerpt} emptyText={emptyText} skin="gemini" />
      </GeminiMessage>
    </>
  );
}

function PerplexityAnswerThread({
  prompt,
  excerpt,
  emptyText,
}: {
  prompt: string;
  excerpt: string;
  emptyText: string;
}) {
  const sources = perplexitySourcesFromExcerpt(excerpt);

  return (
    <>
      <PerplexityMessage from="user">{prompt}</PerplexityMessage>
      <PerplexityMessage
        actions={
          excerpt.length > 0 ? (
            <PerplexityActions sources={sources} text={excerpt} />
          ) : undefined
        }
        from="assistant"
        search={
          <PerplexitySearch
            queries={[prompt]}
            sources={sources}
            title="Web search"
          />
        }
      >
        <AssistantBody
          excerpt={excerpt}
          emptyText={emptyText}
          skin="perplexity"
        />
      </PerplexityMessage>
    </>
  );
}

function OpencodeAnswerThread({
  prompt,
  excerpt,
  emptyText,
}: {
  prompt: string;
  excerpt: string;
  emptyText: string;
}) {
  const sources = perplexitySourcesFromExcerpt(excerpt);

  return (
    <>
      <OpencodeMessage from="user">{prompt}</OpencodeMessage>
      <OpencodeMessage
        search={
          sources.length > 0 ? (
            <OpencodeSources queries={[prompt]} sources={sources} />
          ) : undefined
        }
        from="assistant"
      >
        <AssistantBody
          excerpt={excerpt}
          emptyText={emptyText}
          skin="opencode"
        />
      </OpencodeMessage>
    </>
  );
}

function ClaudeCodeAnswerThread({
  prompt,
  excerpt,
  emptyText,
}: {
  prompt: string;
  excerpt: string;
  emptyText: string;
}) {
  const sources = perplexitySourcesFromExcerpt(excerpt);

  return (
    <>
      <ClaudeCodeMessage from="user">{prompt}</ClaudeCodeMessage>
      <div className="flex w-full flex-col items-start gap-3">
        {sources.length > 0 ? (
          <OpencodeSources darkSurface queries={[prompt]} sources={sources} />
        ) : null}
        <ClaudeCodeMessage from="assistant">
          <AssistantBody
            excerpt={excerpt}
            emptyText={emptyText}
            skin="claude-code"
          />
        </ClaudeCodeMessage>
      </div>
    </>
  );
}

function CodexAnswerThread({
  prompt,
  excerpt,
  emptyText,
}: {
  prompt: string;
  excerpt: string;
  emptyText: string;
}) {
  const sources = perplexitySourcesFromExcerpt(excerpt);

  return (
    <>
      <CodexMessage from="user">{prompt}</CodexMessage>
      <div className="flex w-full flex-col items-start gap-3">
        {sources.length > 0 ? (
          <OpencodeSources darkSurface queries={[prompt]} sources={sources} />
        ) : null}
        <CodexMessage from="assistant">
          <AssistantBody excerpt={excerpt} emptyText={emptyText} skin="codex" />
        </CodexMessage>
      </div>
    </>
  );
}

function SkinComposer({ engine, skin }: { engine: string; skin: GeoChatSkin }) {
  if (skin === "claude") {
    return (
      <ClaudeChatComposer
        defaultModel={claudeModelForEngine(engine)}
        disclaimer="Claude can make mistakes. Please double-check responses."
        onSend={ignoreFollowUp}
        placeholder="Reply to Claude"
      />
    );
  }
  if (skin === "gemini") {
    return (
      <GeminiComposer
        defaultModel={geminiModelForEngine(engine)}
        disclaimer="Gemini can make mistakes, including about people."
        onSend={ignoreFollowUp}
        placeholder="Ask Gemini"
        privacyLabel="Privacy and Gemini"
      />
    );
  }
  if (skin === "perplexity") {
    return (
      <PerplexityComposer
        defaultModel={perplexityModelForEngine(engine)}
        onSend={ignoreFollowUp}
        placeholder="Ask a follow-up"
      />
    );
  }
  if (skin === "opencode") {
    return <OpencodeComposer placeholder='Ask anything... "Draft a launch post"' />;
  }
  if (skin === "claude-code") {
    return <ClaudeCodePrompt placeholder="Ask Claude Code" />;
  }
  if (skin === "codex") {
    const model = engine.startsWith("codex/")
      ? engine.slice("codex/".length)
      : engine;
    return (
      <CodexComposer model={model} placeholder="Ask Codex to do anything" />
    );
  }
  return (
    <ChatgptComposer
      defaultModel={chatgptModelForEngine(engine)}
      onSend={ignoreFollowUp}
      placeholder="Ask anything"
    />
  );
}

function ThreadMessages({
  prompt,
  excerpt,
  emptyText,
  skin,
  timestamp,
}: {
  prompt: string;
  excerpt: string;
  emptyText: string;
  skin: GeoChatSkin;
  timestamp: string;
}) {
  if (skin === "claude") {
    return (
      <ClaudeAnswerThread
        excerpt={excerpt}
        emptyText={emptyText}
        prompt={prompt}
        timestamp={timestamp}
      />
    );
  }
  if (skin === "gemini") {
    return (
      <GeminiAnswerThread
        excerpt={excerpt}
        emptyText={emptyText}
        prompt={prompt}
      />
    );
  }
  if (skin === "perplexity") {
    return (
      <PerplexityAnswerThread
        excerpt={excerpt}
        emptyText={emptyText}
        prompt={prompt}
      />
    );
  }
  if (skin === "opencode") {
    return (
      <OpencodeAnswerThread
        excerpt={excerpt}
        emptyText={emptyText}
        prompt={prompt}
      />
    );
  }
  if (skin === "claude-code") {
    return (
      <ClaudeCodeAnswerThread
        excerpt={excerpt}
        emptyText={emptyText}
        prompt={prompt}
      />
    );
  }
  if (skin === "codex") {
    return (
      <CodexAnswerThread
        excerpt={excerpt}
        emptyText={emptyText}
        prompt={prompt}
      />
    );
  }
  return (
    <ChatgptAnswerThread
      excerpt={excerpt}
      emptyText={emptyText}
      prompt={prompt}
    />
  );
}

export function GeoPromptAnswerThread({
  prompt,
  result,
  timestamp,
  labels,
}: GeoPromptAnswerThreadProps) {
  const skin = geoChatSkin(result.engine);
  const excerpt = result.excerpt.trim();
  const resolvedLabels = { ...DEFAULT_GEO_ANSWER_THREAD_LABELS, ...labels };
  const composerRef = useRef<HTMLDivElement>(null);
  const composerHeight = useElementHeight(composerRef);
  const emptyText = result.mentioned
    ? resolvedLabels.mentionedWithoutExcerpt
    : resolvedLabels.notMentioned;

  return (
    <div
      className={cn(
        "relative flex h-full min-h-0 flex-1 flex-col overflow-hidden",
        SKIN_SURFACE[skin]
      )}
    >
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div
          className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-6 pt-8"
          style={{ paddingBottom: composerHeight + THREAD_COMPOSER_GAP_PX }}
        >
          <ThreadMessages
            excerpt={excerpt}
            emptyText={emptyText}
            prompt={prompt}
            skin={skin}
            timestamp={timestamp}
          />
        </div>
      </div>
      {/* The composer floats over the answer like the real apps: the text
          scrolls behind it, and only the pill itself takes clicks. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0">
        <div className="mx-auto w-full max-w-3xl px-6 pb-4" ref={composerRef}>
          <div className="pointer-events-auto">
            <SkinComposer
              engine={result.engine}
              key={result.engine}
              skin={skin}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
