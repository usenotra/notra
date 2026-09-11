"use client";

import { ChatgptMessage } from "@notra/ui/components/brainless/chatgpt/chatgpt-message";
import { ClaudeChatMessage } from "@notra/ui/components/brainless/claude-chat/claude-chat-message";
import { ClaudeMessage } from "@notra/ui/components/brainless/claude/claude-message";
import { CodexMessage } from "@notra/ui/components/brainless/codex/codex-message";
import { GeminiMessage } from "@notra/ui/components/brainless/gemini/gemini-message";
import { OpencodeMessage } from "@notra/ui/components/brainless/opencode/opencode-message";
import { PerplexityMessage } from "@notra/ui/components/brainless/perplexity/perplexity-message";

import type { GeoSkinMessageProps } from "@/types/geo";

export function GeoSkinMessage({
  skin,
  from,
  search,
  actions,
  children,
}: GeoSkinMessageProps) {
  if (skin === "claude") {
    return (
      <ClaudeChatMessage actions={actions} from={from} search={search}>
        {children}
      </ClaudeChatMessage>
    );
  }
  if (skin === "gemini") {
    return (
      <GeminiMessage actions={actions} from={from} status={search}>
        {children}
      </GeminiMessage>
    );
  }
  if (skin === "perplexity") {
    return (
      <PerplexityMessage actions={actions} from={from} search={search}>
        {children}
      </PerplexityMessage>
    );
  }
  if (skin === "opencode") {
    return (
      <OpencodeMessage actions={actions} from={from} search={search}>
        {children}
      </OpencodeMessage>
    );
  }
  if (skin === "claude-code") {
    if (from === "user") {
      return <ClaudeMessage from={from}>{children}</ClaudeMessage>;
    }
    return (
      <div className="flex w-full flex-col items-start gap-3">
        {search}
        <ClaudeMessage from={from}>{children}</ClaudeMessage>
        {actions}
      </div>
    );
  }
  if (skin === "codex") {
    if (from === "user") {
      return <CodexMessage from={from}>{children}</CodexMessage>;
    }
    return (
      <div className="flex w-full flex-col items-start gap-3">
        {search}
        <CodexMessage from={from}>{children}</CodexMessage>
        {actions}
      </div>
    );
  }
  return (
    <ChatgptMessage actions={actions} from={from} reasoning={search}>
      {children}
    </ChatgptMessage>
  );
}
