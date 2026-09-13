import { OrganizationId } from "@notra/webhooks/schemas/webhooks";
import { ORPCError } from "@orpc/server";
import { Effect, Schema } from "effect";

import { assertOrganizationAccess } from "@/lib/auth/organization";
import type { WebhookAccessInput } from "@/types/webhooks/outbound";

export const authorizeOutboundWebhooks = Effect.fn("webhooks.authorize")(
  function* (input: WebhookAccessInput, mutate = false) {
    const access = yield* Effect.tryPromise({
      try: () => assertOrganizationAccess(input),
      catch: (cause) =>
        cause instanceof ORPCError ? cause : new ORPCError("UNAUTHORIZED"),
    });
    const canManage =
      access.membership.role === "owner" || access.membership.role === "admin";
    if (mutate && !canManage) {
      return yield* Effect.fail(
        new ORPCError("FORBIDDEN", {
          message: "Only organization owners and admins can manage webhooks",
        })
      );
    }
    const organizationId = yield* Schema.decodeUnknownEffect(OrganizationId)(
      access.organizationId
    );
    return { organizationId, canManage };
  }
);
