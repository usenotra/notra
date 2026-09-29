"use client";

import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  PauseIcon,
  PlayIcon,
  RepeatIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@notra/ui/components/ai-elements/message";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@notra/ui/components/ui/message-scroller";
import { Progress } from "@notra/ui/components/ui/progress";
import { getToolName, isToolUIPart, type UIMessage } from "ai";
import { domAnimation, LazyMotion } from "motion/react";

import { ChatActivityGroup } from "@/components/ai/chat-activity-group";
import { ChatSubagentBlock } from "@/components/ai/chat-subagent-block";
import { ChatToolBlock } from "@/components/ai/chat-tool-block";
import { Button } from "@/components/button";
import { UserMessageTextBubble } from "@/components/chat/user-message-actions";
import { CodeResearchSandboxPanel } from "@/components/design-system/code-research-sandbox-panel";
import { DesignSystemFrame } from "@/components/design-system/design-system-frame";
import { useCodeResearchPlayback } from "@/components/design-system/use-code-research-playback";
import { CODE_RESEARCH_PLAYBACK_SPEEDS } from "@/constants/design-system-code-research";
import type {
  CodeResearchAgent,
  CodeResearchChatMessage,
  CodeResearchTimelineItem,
} from "@/types/design-system/code-research";
import { isChatSubagentName } from "@/utils/chat-subagents";
import { getAssistantActivityStep } from "@/utils/group-assistant-message-parts";

type ChatPart = UIMessage["parts"][number];

function noop() {
  // The replayed chat is read-only.
}

function renderAssistantPart(
  part: ChatPart,
  message: CodeResearchChatMessage,
  index: number
) {
  if (part.type === "text") {
    return (
      <MessageResponse
        isAnimating={message.isStreaming}
        key={`${message.id}-text-${String(index)}`}
      >
        {part.text}
      </MessageResponse>
    );
  }
  if (isToolUIPart(part) && part.type === "dynamic-tool") {
    return (
      <ChatToolBlock
        input={part.input}
        isActive={message.isStreaming}
        key={part.toolCallId}
        output={
          part.state === "output-error"
            ? { error: part.errorText }
            : part.output
        }
        state={part.state}
        toolCallId={part.toolCallId}
        toolName={part.toolName}
      />
    );
  }
  return null;
}

type AssistantSegment =
  | { kind: "text"; part: ChatPart; index: number }
  | { kind: "tools"; parts: ChatPart[]; startIndex: number };

function segmentAssistantParts(parts: ChatPart[]): AssistantSegment[] {
  const segments: AssistantSegment[] = [];
  for (const [index, part] of parts.entries()) {
    const last = segments.at(-1);
    if (isToolUIPart(part)) {
      if (last?.kind === "tools") {
        last.parts.push(part);
      } else {
        segments.push({ kind: "tools", parts: [part], startIndex: index });
      }
      continue;
    }
    segments.push({ kind: "text", part, index });
  }
  return segments;
}

type AssistantBlock =
  | { kind: "tools"; parts: ChatPart[]; startIndex: number }
  | {
      kind: "subagent";
      part: ChatPart;
      inner: ChatPart[];
      startIndex: number;
    };

function toolAgentOf(
  part: ChatPart,
  toolAgents: Record<string, CodeResearchAgent>
): CodeResearchAgent {
  return (
    (isToolUIPart(part) ? toolAgents[part.toolCallId] : undefined) ?? "notra"
  );
}

// Root-level subagent calls become cards; the calls their child session made
// are nested inside the card instead of mixed into the parent's activity.
function buildAssistantBlocks(
  parts: ChatPart[],
  startIndex: number,
  toolAgents: Record<string, CodeResearchAgent>
): AssistantBlock[] {
  const blocks: AssistantBlock[] = [];
  for (const [offset, part] of parts.entries()) {
    const agent = toolAgentOf(part, toolAgents);
    const last = blocks.at(-1);
    if (agent !== "notra") {
      if (
        last?.kind === "subagent" &&
        isToolUIPart(last.part) &&
        getToolName(last.part) === agent
      ) {
        last.inner.push(part);
      }
      continue;
    }
    if (isToolUIPart(part) && isChatSubagentName(getToolName(part))) {
      blocks.push({
        kind: "subagent",
        part,
        inner: [],
        startIndex: startIndex + offset,
      });
      continue;
    }
    if (last?.kind === "tools") {
      last.parts.push(part);
    } else {
      blocks.push({
        kind: "tools",
        parts: [part],
        startIndex: startIndex + offset,
      });
    }
  }
  return blocks;
}

function SubagentCard({
  block,
  message,
}: {
  block: Extract<AssistantBlock, { kind: "subagent" }>;
  message: CodeResearchChatMessage;
}) {
  const { part } = block;
  if (!(isToolUIPart(part) && part.type === "dynamic-tool")) {
    return null;
  }
  return (
    <ChatSubagentBlock
      agentName={part.toolName}
      errorText={part.state === "output-error" ? part.errorText : undefined}
      isActive={message.isStreaming}
      output={part.state === "output-available" ? part.output : undefined}
      state={part.state}
      stepCount={block.inner.length}
      toolCallId={part.toolCallId}
    >
      {block.inner.length > 0
        ? block.inner.map((inner, offset) =>
            renderAssistantPart(inner, message, block.startIndex + offset + 1)
          )
        : null}
    </ChatSubagentBlock>
  );
}

// Same building blocks as the chat page, but groups stay open so every
// sandbox call is visible while the replay runs.
function AssistantParts({
  message,
  toolAgents,
}: {
  message: CodeResearchChatMessage;
  toolAgents: Record<string, CodeResearchAgent>;
}) {
  const segments = segmentAssistantParts(message.parts);
  return segments.map((segment, segmentIndex) => {
    if (segment.kind === "text") {
      return renderAssistantPart(segment.part, message, segment.index);
    }
    const isLastSegment = segmentIndex === segments.length - 1;
    return buildAssistantBlocks(
      segment.parts,
      segment.startIndex,
      toolAgents
    ).map((block, blockIndex, blocks) => {
      const key = `${message.id}-block-${String(block.startIndex)}`;
      if (block.kind === "subagent") {
        return <SubagentCard block={block} key={key} message={message} />;
      }
      const isStreaming =
        message.isStreaming &&
        isLastSegment &&
        blockIndex === blocks.length - 1;
      return (
        <ChatActivityGroup
          forceOpen
          groupId={key}
          hasDetails
          isLoading={isStreaming}
          isStreaming={isStreaming}
          key={key}
          step={getAssistantActivityStep(block.parts)}
        >
          {block.parts.map((part, offset) =>
            renderAssistantPart(part, message, block.startIndex + offset)
          )}
        </ChatActivityGroup>
      );
    });
  });
}

function TimelineRow({
  item,
  toolAgents,
}: {
  item: CodeResearchTimelineItem;
  toolAgents: Record<string, CodeResearchAgent>;
}) {
  if (item.kind === "divider") {
    return (
      <MessageScrollerItem
        className="mx-auto w-full max-w-2xl [contain-intrinsic-size:none] [content-visibility:visible]"
        messageId={item.id}
      >
        <div className="text-muted-foreground flex items-center gap-3 text-xs">
          <span className="bg-border h-px flex-1" />
          {item.label}
          <span className="bg-border h-px flex-1" />
        </div>
      </MessageScrollerItem>
    );
  }

  const { message } = item;
  return (
    <MessageScrollerItem
      className="mx-auto w-full max-w-2xl [contain-intrinsic-size:none] [content-visibility:visible]"
      messageId={message.id}
    >
      <Message from={message.role}>
        {message.role === "user" ? (
          <div className="ml-auto flex w-full max-w-full items-start justify-end">
            <UserMessageTextBubble
              initialText={message.text}
              isEditing={false}
              onCancel={noop}
              onSubmit={noop}
            >
              <MessageResponse>{message.text}</MessageResponse>
            </UserMessageTextBubble>
          </div>
        ) : (
          <MessageContent>
            <AssistantParts message={message} toolAgents={toolAgents} />
          </MessageContent>
        )}
      </Message>
    </MessageScrollerItem>
  );
}

export function CodeResearchPlayground() {
  const playback = useCodeResearchPlayback();
  const { state } = playback;
  const progress = playback.totalSteps
    ? Math.round((playback.cursor / playback.totalSteps) * 100)
    : 0;

  return (
    <DesignSystemFrame
      description={
        <>
          Spielt den Agent-Chat mit Code-Recherche Schritt für Schritt ab: mit
          unseren echten Chat-Komponenten und den Tool-Inputs, Outputs und
          Zeiten aus dem Live-Test gegen echte Upstash Boxen. Rechts siehst du,
          wann die Box entsteht, was open_repository intern macht und wann sie
          wiederverwendet wird. Nichts hier ruft das Backend auf.
        </>
      }
      title="Code research playground"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            aria-label="Szenario"
            className="flex flex-wrap items-center gap-1.5"
            role="group"
          >
            {playback.scenarios.map((scenario) => (
              <Button
                aria-pressed={scenario.id === playback.scenario.id}
                key={scenario.id}
                onClick={() => playback.selectScenario(scenario.id)}
                size="sm"
                variant={
                  scenario.id === playback.scenario.id ? "default" : "outline"
                }
              >
                {scenario.label}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              aria-label="Neu starten"
              onClick={playback.restart}
              size="icon-sm"
              variant="ghost"
            >
              <HugeiconsIcon aria-hidden icon={RepeatIcon} />
            </Button>
            <Button
              aria-label="Schritt zurück"
              disabled={playback.cursor <= playback.startAt}
              onClick={playback.stepBack}
              size="icon-sm"
              variant="outline"
            >
              <HugeiconsIcon aria-hidden icon={ArrowLeft01Icon} />
            </Button>
            <Button onClick={playback.togglePlay} size="sm">
              <HugeiconsIcon
                aria-hidden
                data-icon="inline-start"
                icon={playback.isPlaying ? PauseIcon : PlayIcon}
              />
              {playback.isPlaying ? "Pause" : "Abspielen"}
            </Button>
            <Button
              aria-label="Schritt weiter"
              disabled={playback.isAtEnd}
              onClick={playback.stepForward}
              size="icon-sm"
              variant="outline"
            >
              <HugeiconsIcon aria-hidden icon={ArrowRight01Icon} />
            </Button>
            <div
              aria-label="Geschwindigkeit"
              className="ml-2 flex items-center gap-0.5"
              role="group"
            >
              {CODE_RESEARCH_PLAYBACK_SPEEDS.map((speed) => (
                <Button
                  aria-pressed={playback.speed === speed}
                  key={speed}
                  onClick={() => playback.setSpeed(speed)}
                  size="xs"
                  variant={playback.speed === speed ? "secondary" : "ghost"}
                >
                  {`${String(speed).replace(".", ",")}×`}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <p className="text-muted-foreground min-w-0 flex-1 text-sm">
            {playback.scenario.description}
          </p>
          <span className="text-muted-foreground shrink-0 font-mono text-xs tabular-nums">
            {`Schritt ${String(playback.cursor)} / ${String(playback.totalSteps)}`}
          </span>
        </div>
        <Progress aria-label="Fortschritt" value={progress} />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="border-border/80 bg-background relative flex h-[46rem] flex-col overflow-hidden rounded-xl border">
            <LazyMotion features={domAnimation}>
              <MessageScrollerProvider autoScroll>
                <MessageScroller className="min-h-0 flex-1">
                  <MessageScrollerViewport>
                    <MessageScrollerContent className="gap-8 px-4 py-8">
                      {state.timeline.length === 0 ? (
                        <p className="text-muted-foreground mx-auto max-w-sm pt-24 text-center text-sm text-balance">
                          Noch keine Nachrichten. Starte die Wiedergabe, um den
                          Chat ablaufen zu lassen.
                        </p>
                      ) : (
                        state.timeline.map((item) => (
                          <TimelineRow
                            item={item}
                            toolAgents={state.toolAgents}
                            key={
                              item.kind === "divider"
                                ? item.id
                                : item.message.id
                            }
                          />
                        ))
                      )}
                    </MessageScrollerContent>
                  </MessageScrollerViewport>
                  <MessageScrollerButton />
                </MessageScroller>
              </MessageScrollerProvider>
            </LazyMotion>
          </div>
          <CodeResearchSandboxPanel state={state} />
        </div>
      </div>
    </DesignSystemFrame>
  );
}
