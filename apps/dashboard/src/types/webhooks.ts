import type { NextRequest } from "next/server";
import type { InputIntegrationType } from "@/utils/schemas/integrations";

export interface WebhookContext {
  provider: InputIntegrationType;
  organizationId: string;
  integrationId: string;
  repositoryId: string;
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
