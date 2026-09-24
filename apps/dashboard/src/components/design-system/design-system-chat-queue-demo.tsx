"use client";

import { getToolName, isToolUIPart } from "ai";

import { ChatAssistantParts } from "@/components/ai/chat-assistant-parts";
import { ChatToolBlock } from "@/components/ai/chat-tool-block";
import ChatInput from "@/components/chat-input";
import { ChatInputAdvanced } from "@/components/chat/chat-input";
import {
  DESIGN_SYSTEM_QUEUED_MESSAGES,
  DESIGN_SYSTEM_RUNNING_DRAFT_PARTS,
  DESIGN_SYSTEM_STEERING_MESSAGES,
} from "@/constants/design-system-chat-queue";

function ignoreQueuedEdit() {}
function ignoreQueuedRemove() {}
function ignoreQueuedSteer() {}

function RunningDraftPreview() {
  return (
    <div className="max-w-2xl space-y-4">
      <ChatAssistantParts
        isLoading
        isStandaloneTool={(part) =>
          isToolUIPart(part) && part.type === "tool-createBlogPost"
        }
        messageId="running-draft"
        parts={DESIGN_SYSTEM_RUNNING_DRAFT_PARTS}
        renderStandalone={() => null}
        renderTool={(part) =>
          isToolUIPart(part) ? (
            <ChatToolBlock
              input={part.input}
              output={
                part.state === "output-available" ? part.output : undefined
              }
              state={part.state}
              toolCallId={part.toolCallId}
              toolName={getToolName(part)}
            />
          ) : null
        }
      />
      <ChatInputAdvanced isLoading onStop={ignoreQueuedRemove} />
    </div>
  );
}

function AiChatQueuePreview({
  messages,
}: {
  messages: typeof DESIGN_SYSTEM_QUEUED_MESSAGES;
}) {
  return (
    <div className="max-w-2xl">
      <ChatInputAdvanced
        isLoading
        onEditQueued={ignoreQueuedEdit}
        onRemoveQueued={ignoreQueuedRemove}
        onSteerQueued={ignoreQueuedSteer}
        onStop={ignoreQueuedRemove}
        queuedMessages={messages}
      />
    </div>
  );
}

function ContentAgentQueuePreview({
  messages,
}: {
  messages: typeof DESIGN_SYSTEM_QUEUED_MESSAGES;
}) {
  return (
    <div className="max-w-2xl">
      <ChatInput
        isLoading
        onEditQueued={ignoreQueuedEdit}
        onRemoveQueued={ignoreQueuedRemove}
        onSteerQueued={ignoreQueuedSteer}
        onStop={ignoreQueuedRemove}
        placeholder="Ask the content agent..."
        queuedMessages={messages}
      />
    </div>
  );
}

export function DesignSystemChatQueueDemo() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-2" data-preview="ai-running-draft">
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          AI chat · running after draft
        </p>
        <RunningDraftPreview />
      </div>
      <div className="space-y-2" data-preview="ai-queued">
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          AI chat · queued
        </p>
        <AiChatQueuePreview messages={DESIGN_SYSTEM_QUEUED_MESSAGES} />
      </div>
      <div className="space-y-2" data-preview="ai-steering">
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          AI chat · steering
        </p>
        <AiChatQueuePreview messages={DESIGN_SYSTEM_STEERING_MESSAGES} />
      </div>
      <div className="space-y-2" data-preview="content-queued">
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Content agent · queued
        </p>
        <ContentAgentQueuePreview messages={DESIGN_SYSTEM_QUEUED_MESSAGES} />
      </div>
      <div className="space-y-2" data-preview="content-steering">
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Content agent · steering
        </p>
        <ContentAgentQueuePreview messages={DESIGN_SYSTEM_STEERING_MESSAGES} />
      </div>
    </div>
  );
}
