import {
  webhookCreateInputSchema,
  webhookDeliveryInputSchema,
  webhookEndpointInputSchema,
  webhookListInputSchema,
} from "@notra/schemas/dashboard/outbound-webhooks";
import {
  createEndpoint,
  deleteEndpoint,
  listEndpoints,
} from "@notra/webhooks/programs/endpoints";
import {
  getDelivery,
  listAttempts,
  listDeliveries,
  deliveryStats,
  retryDelivery,
} from "@notra/webhooks/programs/history";
import { configuredCryptoLayer } from "@notra/webhooks/runtime/crypto";
import {
  DeliveryId,
  EndpointId,
  OrganizationId,
} from "@notra/webhooks/schemas/webhooks";
import { ORPCError } from "@orpc/server";
import { Effect, Schema } from "effect";

import { assertOrganizationAccess } from "@/lib/auth/organization";
import { authorizedProcedure } from "@/lib/orpc/base";
import { runOutboundWebhook } from "@/lib/webhooks/outbound-runtime";
import type { WebhookAccessInput } from "@/types/webhooks/outbound";

const authorize = Effect.fn("webhooks.authorize")(function* (
  input: WebhookAccessInput,
  mutate = false
) {
  const access = yield* Effect.tryPromise({
    try: () => assertOrganizationAccess(input),
    catch: (cause) =>
      cause instanceof ORPCError ? cause : new ORPCError("UNAUTHORIZED"),
  });
  if (
    mutate &&
    access.membership.role !== "owner" &&
    access.membership.role !== "admin"
  ) {
    return yield* Effect.fail(
      new ORPCError("FORBIDDEN", {
        message: "Only organization owners and admins can manage webhooks",
      })
    );
  }
  return {
    organizationId: yield* Schema.decodeUnknownEffect(OrganizationId)(
      access.organizationId
    ),
    canManage:
      access.membership.role === "owner" || access.membership.role === "admin",
  };
});

export const outboundWebhooksRouter = {
  overview: authorizedProcedure
    .input(webhookListInputSchema)
    .handler(({ context, input }) =>
      runOutboundWebhook(
        Effect.gen(function* () {
          const { organizationId, canManage } = yield* authorize({
            ...context,
            organizationId: input.organizationId,
          });
          const [endpoints, deliveries, stats] = yield* Effect.all(
            [
              listEndpoints(organizationId),
              listDeliveries(organizationId, input.offset, input.status),
              deliveryStats(organizationId),
            ],
            { concurrency: 3 }
          );
          return { endpoints, deliveries, stats, canManage };
        })
      )
    ),
  create: authorizedProcedure
    .input(webhookCreateInputSchema)
    .handler(({ context, input }) =>
      runOutboundWebhook(
        Effect.gen(function* () {
          const { organizationId } = yield* authorize(
            { ...context, organizationId: input.organizationId },
            true
          );
          return yield* createEndpoint({ ...input, organizationId }).pipe(
            Effect.provide(configuredCryptoLayer)
          );
        })
      )
    ),
  remove: authorizedProcedure
    .input(webhookEndpointInputSchema)
    .handler(({ context, input }) =>
      runOutboundWebhook(
        Effect.gen(function* () {
          const { organizationId } = yield* authorize(
            { ...context, organizationId: input.organizationId },
            true
          );
          const endpointId = yield* Schema.decodeUnknownEffect(EndpointId)(
            input.endpointId
          );
          return yield* deleteEndpoint(organizationId, endpointId);
        })
      )
    ),
  detail: authorizedProcedure
    .input(webhookDeliveryInputSchema)
    .handler(({ context, input }) =>
      runOutboundWebhook(
        Effect.gen(function* () {
          const { organizationId } = yield* authorize({
            ...context,
            organizationId: input.organizationId,
          });
          const deliveryId = yield* Schema.decodeUnknownEffect(DeliveryId)(
            input.deliveryId
          );
          const [delivery, attempts] = yield* Effect.all(
            [
              getDelivery(organizationId, deliveryId),
              listAttempts(organizationId, deliveryId),
            ],
            { concurrency: 2 }
          );
          return { delivery, attempts };
        })
      )
    ),
  retry: authorizedProcedure
    .input(webhookDeliveryInputSchema)
    .handler(({ context, input }) =>
      runOutboundWebhook(
        Effect.gen(function* () {
          const { organizationId } = yield* authorize(
            { ...context, organizationId: input.organizationId },
            true
          );
          const deliveryId = yield* Schema.decodeUnknownEffect(DeliveryId)(
            input.deliveryId
          );
          return yield* retryDelivery(organizationId, deliveryId);
        })
      )
    ),
};
