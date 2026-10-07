import { logError } from "@notra/ai/utils/server-log";
import { webhookParamsWithRepoSchema } from "@notra/schemas/dashboard/webhooks";

import { WEBHOOK_HANDLERS } from "@/constants/webhook-handlers";
import type { WebhookRouteContext } from "@/types/webhooks/webhooks";

export async function POST(request: Request, { params }: WebhookRouteContext) {
  const rawParams = await params;

  const validation = webhookParamsWithRepoSchema.safeParse(rawParams);
  if (!validation.success) {
    return Response.json(
      {
        error: "Invalid webhook parameters",
        details: validation.error.issues,
      },
      { status: 400 }
    );
  }

  const { provider } = validation.data;
  const handler = WEBHOOK_HANDLERS[provider];
  if (!handler) {
    return Response.json(
      { error: `Provider ${provider} is not yet supported` },
      { status: 501 }
    );
  }

  try {
    return await handler({ ...validation.data, request });
  } catch (error) {
    logError("Webhook processing error", error);
    return Response.json(
      { error: "Internal server error processing webhook" },
      { status: 500 }
    );
  }
}
