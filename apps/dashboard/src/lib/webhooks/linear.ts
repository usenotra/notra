import { checkLogRetention } from "@/lib/billing/check-log-retention";
import { appendWebhookLog } from "@/lib/webhooks/logging";
import type { WebhookContext, WebhookResult } from "@/types/webhooks";

export async function handleLinearWebhook(
  context: WebhookContext
): Promise<WebhookResult> {
  const { request, rawBody: _rawBody, organizationId, integrationId } = context;

  const signature = request.headers.get("linear-signature");

  if (!signature) {
    await appendWebhookLog({
      organizationId,
      integrationId,
      integrationType: "linear",
      title: "Missing Linear signature",
      status: "failed",
      statusCode: 400,
      referenceId: null,
      errorMessage: "Missing Linear-Signature header",
    });

    return {
      success: false,
      message: "Missing Linear-Signature header",
    };
  }

  const logRetentionDays = await checkLogRetention(organizationId);

  await appendWebhookLog({
    organizationId,
    integrationId,
    integrationType: "linear",
    title: "Linear webhook received",
    status: "success",
    statusCode: 200,
    referenceId: null,
    payload: { hasSignature: true },
    retentionDays: logRetentionDays,
  });

  return {
    success: true,
    message: "Received Linear webhook",
    data: {
      hasSignature: true,
    },
  };
}
