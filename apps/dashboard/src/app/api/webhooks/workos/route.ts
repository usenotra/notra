import { workosWebhookPayloadSchema } from "@notra/schemas/dashboard/workos-webhook";
import { getWorkOS } from "@workos-inc/authkit-nextjs";
import type { Event as WorkOSEvent } from "@workos-inc/node";
import { Effect } from "effect";
import type { NextRequest } from "next/server";

import {
  removeMembershipFromWebhook,
  upsertMembershipFromWebhook,
} from "@/lib/auth/webhook-sync";

function handleMembershipEvent(event: WorkOSEvent) {
  switch (event.event) {
    case "organization_membership.created":
    case "organization_membership.updated":
      return upsertMembershipFromWebhook(event.data);
    case "organization_membership.deleted":
      return removeMembershipFromWebhook(event.data);
    default:
      return Effect.void;
  }
}

export async function POST(request: NextRequest) {
  const secret = process.env.WORKOS_WEBHOOK_SECRET;

  if (!secret) {
    return Response.json({ error: "webhooks_not_configured" }, { status: 503 });
  }

  const sigHeader = request.headers.get("workos-signature");

  if (!sigHeader) {
    return Response.json({ error: "missing_signature" }, { status: 401 });
  }

  const rawBody = await request.text();
  let rawPayload: unknown;

  try {
    rawPayload = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "invalid_payload" }, { status: 400 });
  }

  const parsedPayload = workosWebhookPayloadSchema.safeParse(rawPayload);

  if (!parsedPayload.success) {
    return Response.json({ error: "invalid_payload" }, { status: 400 });
  }

  let event: WorkOSEvent;

  try {
    event = await getWorkOS().webhooks.constructEvent({
      payload: rawBody,
      sigHeader,
      secret,
    });
  } catch (error) {
    console.error("WorkOS webhook verification failed", error);
    return Response.json({ error: "invalid_signature" }, { status: 401 });
  }

  const synced = await Effect.runPromise(
    handleMembershipEvent(event).pipe(
      Effect.as(true),
      Effect.catch((error) =>
        Effect.logWarning("Webhook membership sync failed").pipe(
          Effect.annotateLogs({
            event: event.event,
            error: error.message,
            cause:
              error.cause instanceof Error
                ? error.cause.message
                : String(error.cause),
          }),
          Effect.as(false)
        )
      )
    )
  );

  if (!synced) {
    return Response.json({ error: "sync_failed" }, { status: 500 });
  }

  return Response.json({ received: true });
}
