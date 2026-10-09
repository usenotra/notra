import type { WebhookIntegrationAccess } from "../types/webhooks/webhooks";

export function authorizeWebhookIntegration<T extends WebhookIntegrationAccess>(
  integration: T | null | undefined,
  organizationId: string
): T | Response {
  if (!integration) {
    return Response.json({ error: "Integration not found" }, { status: 404 });
  }
  if (integration.organizationId !== organizationId) {
    return Response.json(
      { error: "Integration does not belong to this organization" },
      { status: 403 }
    );
  }
  if (!integration.enabled) {
    return Response.json({ error: "Integration is disabled" }, { status: 403 });
  }
  return integration;
}
