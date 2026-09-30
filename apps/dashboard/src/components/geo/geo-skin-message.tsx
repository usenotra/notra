"use client";

import { ChatgptMessage } from "@notra/ui/components/ai-skins/chatgpt/chatgpt-message";
import { ClaudeChatMessage } from "@notra/ui/components/ai-skins/claude-chat/claude-chat-message";
import { ClaudeCodeMessage } from "@notra/ui/components/ai-skins/claude-code/claude-code-message";
import { CodexMessage } from "@notra/ui/components/ai-skins/codex/codex-message";
import { GeminiMessage } from "@notra/ui/components/ai-skins/gemini/gemini-message";
import { OpencodeMessage } from "@notra/ui/components/ai-skins/opencode/opencode-message";
import { PerplexityMessage } from "@notra/ui/components/ai-skins/perplexity/perplexity-message";

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
      return <ClaudeCodeMessage from={from}>{children}</ClaudeCodeMessage>;
    }
    return (
      <div className="flex w-full flex-col items-start gap-3">
        {search}
        <ClaudeCodeMessage from={from}>{children}</ClaudeCodeMessage>
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
