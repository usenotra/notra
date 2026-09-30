import type { QueuedMessage } from "@/components/chat/chat-queue";

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
