import type { WebhookContext, WebhookResult } from "./types";

export function handleLinearWebhook(context: WebhookContext): WebhookResult {
  const { request, rawBody: _rawBody } = context;

  const signature = request.headers.get("linear-signature");

  if (!signature) {
    return {
      success: false,
      message: "Missing Linear-Signature header",
    };
  }

  // TODO: Verify signature using webhook secret
  // TODO: Parse payload and determine event type
  // TODO: Handle specific events (issue created, updated, etc.)
  // TODO: Create webhook log entry

  return {
    success: true,
    message: "Received Linear webhook",
    data: {
      hasSignature: true,
    },
  };
}
