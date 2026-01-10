import type { NextRequest } from "next/server";

export interface WebhookContext {
  provider: string;
  organizationId: string;
  integrationId: string;
  request: NextRequest;
  rawBody: string;
}

export interface WebhookResult {
  success: boolean;
  message?: string;
  data?: unknown;
}

export type WebhookHandler = (
  context: WebhookContext
) => WebhookResult | Promise<WebhookResult>;
