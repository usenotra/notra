import type { NextRequest } from "next/server";
import type { InputIntegrationType } from "@/utils/schemas/integrations";
import type { LogRetentionDays } from "@/lib/webhooks/logging";

export interface WebhookContext {
	provider: InputIntegrationType;
	organizationId: string;
	integrationId: string;
	repositoryId: string;
	request: NextRequest;
	rawBody: string;
	logRetentionDays: LogRetentionDays;
}

export interface WebhookResult {
	success: boolean;
	message?: string;
	data?: unknown;
}

export type WebhookHandler = (
	context: WebhookContext,
) => WebhookResult | Promise<WebhookResult>;
