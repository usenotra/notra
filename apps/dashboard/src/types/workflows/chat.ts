import type { ChatWorkflowPayload } from "@notra/ai/types/chat";

export type StandaloneChatWorkflowResult =
  | { status: "completed" }
  | { status: "aborted" }
  | { status: "failed" }
  | { status: "invalid_payload" }
  | { status: "duplicate_request" }
  | { status: "empty_history" }
  | { status: "missing_message_id" }
  | { status: "superseded" }
  | { status: "realtime_unavailable" }
  | { status: "usage_limit_reached" };

export interface ResolveChatStreamInput {
  streamId?: string;
  organizationId: string;
  chatId: string;
}

export type ResolveChatStreamResult =
  | { status: "ready"; streamId: string }
  | { status: "superseded" }
  | { status: "empty_history" }
  | { status: "missing_message_id" };

export interface ChatBillingRecheckInput {
  requestId: string;
  organizationId: string;
  chatId: string;
}

export interface ChatBillingRecheckResult {
  allowed: boolean;
  unavailable: boolean;
  chargeAiCredits: boolean;
}

export interface RejectChatGenerationInput {
  requestId: string;
  organizationId: string;
  chatId: string;
  streamId: string;
  unavailable: boolean;
}

export interface StreamChatResponseInput extends ChatWorkflowPayload {
  streamId: string;
  chargeAiCredits: boolean;
}
