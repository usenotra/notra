import type { QueuedMessage } from "@/components/chat/chat-queue";
import type { AssistantMessagePart } from "@/types/chat-activity";

export const DESIGN_SYSTEM_QUEUED_MESSAGES: QueuedMessage[] = [
  { id: "queued-1", text: "Add a comparison table for the pricing page" },
  { id: "queued-2", text: "Keep the intro under 80 words" },
];

export const DESIGN_SYSTEM_STEERING_MESSAGES: QueuedMessage[] = [
  { id: "queued-1", text: "Add a comparison table for the pricing page" },
  {
    id: "queued-2",
    text: "Keep the intro under 80 words",
    steering: true,
  },
];

export const DESIGN_SYSTEM_RUNNING_DRAFT_PARTS: AssistantMessagePart[] = [
  {
    type: "reasoning",
    text: "Match their writing style and draft the Muse connector post.",
    state: "done",
  },
  {
    type: "tool-createBlogPost",
    toolCallId: "create-blog-running-1",
    state: "output-available",
    input: { title: "How to build a Muse connector" },
    output: { postId: "post_demo", status: "created" },
  },
];
