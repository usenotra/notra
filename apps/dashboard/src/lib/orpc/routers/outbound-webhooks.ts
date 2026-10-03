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
  deliveryActivity,
  getDelivery,
  listAttempts,
  listDeliveries,
  deliveryStats,
  retryDelivery,
} from "@notra/webhooks/programs/history";
import { configuredCryptoLayer } from "@notra/webhooks/runtime/crypto";
import { DeliveryId, EndpointId } from "@notra/webhooks/schemas/webhooks";
import { Effect, Schema } from "effect";

import { authorizedProcedure } from "@/lib/orpc/base";
import { authorizeOutboundWebhooks } from "@/lib/webhooks/outbound-access";
import { runOutboundWebhook } from "@/lib/webhooks/outbound-runtime";

export const outboundWebhooksRouter = {
  overview: authorizedProcedure
    .input(webhookListInputSchema)
    .handler(({ context, input }) =>
      runOutboundWebhook(
        Effect.gen(function* () {
          const { organizationId, canManage } =
            yield* authorizeOutboundWebhooks({
              ...context,
              organizationId: input.organizationId,
            });
          const [endpoints, deliveries, stats, activity] = yield* Effect.all(
            [
              listEndpoints(organizationId),
              listDeliveries(organizationId, input.offset, input.status),
              deliveryStats(organizationId),
              // The chart is optional: a failed trace must not hide the rest of the pane.
              deliveryActivity(organizationId).pipe(
                Effect.catch((error) =>
                  Effect.logWarning("Webhook delivery activity failed").pipe(
                    Effect.annotateLogs({
                      organizationId,
                      error: String(error),
                    }),
                    Effect.as(null)
                  )
                )
              ),
            ],
            { concurrency: 4 }
          );
          return { endpoints, deliveries, stats, activity, canManage };
        })
      )
    ),
  create: authorizedProcedure
    .input(webhookCreateInputSchema)
    .handler(({ context, input }) =>
      runOutboundWebhook(
        Effect.gen(function* () {
          const { organizationId } = yield* authorizeOutboundWebhooks(
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
          const { organizationId } = yield* authorizeOutboundWebhooks(
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
          const { organizationId } = yield* authorizeOutboundWebhooks({
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
          const { organizationId } = yield* authorizeOutboundWebhooks(
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
