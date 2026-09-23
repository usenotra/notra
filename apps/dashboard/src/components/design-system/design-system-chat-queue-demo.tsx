"use client";

import ChatInput from "@/components/chat-input";
import { ChatQueue } from "@/components/chat/chat-queue";
import {
  DESIGN_SYSTEM_QUEUED_MESSAGES,
  DESIGN_SYSTEM_STEERING_MESSAGES,
} from "@/constants/design-system-chat-queue";

function ignoreQueuedEdit() {}
function ignoreQueuedRemove() {}
function ignoreQueuedSteer() {}

function AiChatQueuePreview({
  messages,
}: {
  messages: typeof DESIGN_SYSTEM_QUEUED_MESSAGES;
}) {
  return (
    <div className="max-w-2xl">
      <ChatQueue
        messages={messages}
        onEdit={ignoreQueuedEdit}
        onRemove={ignoreQueuedRemove}
        onSteer={ignoreQueuedSteer}
      />
      <ChatInput
        connectedTop={messages.length > 0}
        isLoading
        onStop={ignoreQueuedRemove}
        placeholder="Ask anything..."
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
