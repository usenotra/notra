import type { InputIntegrationType } from "@notra/schemas/dashboard/integrations";

import { handleGitHubWebhook } from "../lib/webhooks/github";
import { handleLinearWebhook } from "../lib/webhooks/linear";
import type { WebhookHandler } from "../types/webhooks/webhooks";

export const WEBHOOK_HANDLERS: Partial<
  Record<InputIntegrationType, WebhookHandler>
> = {
  github: handleGitHubWebhook,
  linear: handleLinearWebhook,
};
