import { createRoute } from "@hono/zod-openapi";
import {
  createWebhookRequestSchema,
  webhookEndpointParamsSchema,
  webhookDeliveryParamsSchema,
  webhookDeliveryQuerySchema,
  webhookIdentifierSchema,
  webhookListResponseSchema,
  webhookCreateResponseSchema,
  webhookDeliveriesResponseSchema,
  webhookDetailResponseSchema,
} from "@notra/schemas/api/webhooks";
import { PAGE_SIZE } from "@notra/webhooks/constants/delivery";
import {
  createEndpoint,
  deleteEndpoint,
  listEndpoints,
} from "@notra/webhooks/programs/endpoints";
import {
  getDelivery,
  listAttempts,
  listDeliveries,
  retryDelivery,
} from "@notra/webhooks/programs/history";
import { configuredCryptoLayer } from "@notra/webhooks/runtime/crypto";
import { DeliveryId, EndpointId } from "@notra/webhooks/schemas/webhooks";
import { ConfigProvider, Effect, Schema } from "effect";

import { WEBHOOK_ERROR_RESPONSES } from "../constants/webhooks";
import { webhookRuntime } from "../runtime/webhooks";
import { createOpenApiApp } from "../utils/openapi-app";
import { decodeOrganizationId, runWebhookApi } from "../utils/webhooks";

export const webhooksRoutes = createOpenApiApp();

webhooksRoutes.openapi(
  createRoute({
    method: "get",
    path: "/webhooks",
    tags: ["Webhooks"],
    operationId: "listWebhookEndpoints",
    summary: "List outbound webhook subscriptions",
    responses: {
      200: {
        description: "Endpoints, without signing secrets",
        content: { "application/json": { schema: webhookListResponseSchema } },
      },
      ...WEBHOOK_ERROR_RESPONSES,
    },
  }),
  (c) =>
    runWebhookApi(
      webhookRuntime,
      c,
      Effect.gen(function* () {
        const organizationId = yield* decodeOrganizationId(c);
        const endpoints = yield* listEndpoints(organizationId);
        return c.json(
          {
            endpoints: endpoints.map((endpoint) => ({
              ...endpoint,
              events: [...endpoint.events],
            })),
          },
          200
        );
      })
    )
);

webhooksRoutes.openapi(
  createRoute({
    method: "post",
    path: "/webhooks",
    tags: ["Webhooks"],
    operationId: "createWebhookEndpoint",
    summary: "Subscribe an HTTPS endpoint to Notra events",
    request: {
      body: {
        required: true,
        content: { "application/json": { schema: createWebhookRequestSchema } },
      },
    },
    responses: {
      201: {
        description: "Endpoint and one-time signing secret",
        content: {
          "application/json": { schema: webhookCreateResponseSchema },
        },
      },
      ...WEBHOOK_ERROR_RESPONSES,
    },
  }),
  (c) =>
    runWebhookApi(
      webhookRuntime,
      c,
      Effect.gen(function* () {
        const organizationId = yield* decodeOrganizationId(c);
        const result = yield* createEndpoint({
          ...c.req.valid("json"),
          organizationId,
        }).pipe(
          Effect.provide(configuredCryptoLayer),
          Effect.provide(
            ConfigProvider.layer(ConfigProvider.fromUnknown(c.env))
          )
        );
        return c.json(
          {
            endpoint: {
              ...result.endpoint,
              events: [...result.endpoint.events],
            },
            secret: result.secret,
          },
          201
        );
      })
    )
);

webhooksRoutes.openapi(
  createRoute({
    method: "delete",
    path: "/webhooks/{endpointId}",
    tags: ["Webhooks"],
    operationId: "deleteWebhookEndpoint",
    summary: "Remove a webhook subscription and cancel unsent deliveries",
    request: { params: webhookEndpointParamsSchema },
    responses: {
      200: {
        description: "Deleted endpoint ID",
        content: { "application/json": { schema: webhookIdentifierSchema } },
      },
      ...WEBHOOK_ERROR_RESPONSES,
    },
  }),
  (c) =>
    runWebhookApi(
      webhookRuntime,
      c,
      Effect.gen(function* () {
        const organizationId = yield* decodeOrganizationId(c);
        const endpointId = yield* Schema.decodeUnknownEffect(EndpointId)(
          c.req.valid("param").endpointId
        );
        return c.json(yield* deleteEndpoint(organizationId, endpointId), 200);
      })
    )
);

webhooksRoutes.openapi(
  createRoute({
    method: "get",
    path: "/webhooks/deliveries",
    tags: ["Webhooks"],
    operationId: "listWebhookDeliveries",
    summary: "List webhook deliveries",
    request: { query: webhookDeliveryQuerySchema },
    responses: {
      200: {
        description: "Delivery history",
        content: {
          "application/json": { schema: webhookDeliveriesResponseSchema },
        },
      },
      ...WEBHOOK_ERROR_RESPONSES,
    },
  }),
  (c) =>
    runWebhookApi(
      webhookRuntime,
      c,
      Effect.gen(function* () {
        const organizationId = yield* decodeOrganizationId(c);
        const query = c.req.valid("query");
        const deliveries = yield* listDeliveries(
          organizationId,
          query.offset,
          query.status
        );
        return c.json(
          {
            deliveries: deliveries.slice(0, PAGE_SIZE),
            hasMore: deliveries.length > PAGE_SIZE,
          },
          200
        );
      })
    )
);

webhooksRoutes.openapi(
  createRoute({
    method: "get",
    path: "/webhooks/deliveries/{deliveryId}",
    tags: ["Webhooks"],
    operationId: "getWebhookDelivery",
    summary: "Get payload and attempt history for a delivery",
    request: { params: webhookDeliveryParamsSchema },
    responses: {
      200: {
        description: "Delivery detail",
        content: {
          "application/json": { schema: webhookDetailResponseSchema },
        },
      },
      ...WEBHOOK_ERROR_RESPONSES,
    },
  }),
  (c) =>
    runWebhookApi(
      webhookRuntime,
      c,
      Effect.gen(function* () {
        const organizationId = yield* decodeOrganizationId(c);
        const deliveryId = yield* Schema.decodeUnknownEffect(DeliveryId)(
          c.req.valid("param").deliveryId
        );
        const [delivery, attempts] = yield* Effect.all(
          [
            getDelivery(organizationId, deliveryId),
            listAttempts(organizationId, deliveryId),
          ],
          { concurrency: 2 }
        );
        return c.json({ delivery, attempts: [...attempts] }, 200);
      })
    )
);

webhooksRoutes.openapi(
  createRoute({
    method: "post",
    path: "/webhooks/deliveries/{deliveryId}/retry",
    tags: ["Webhooks"],
    operationId: "retryWebhookDelivery",
    summary: "Retry a failed delivery, retaining its history",
    request: { params: webhookDeliveryParamsSchema },
    responses: {
      200: {
        description: "Queued delivery ID",
        content: { "application/json": { schema: webhookIdentifierSchema } },
      },
      ...WEBHOOK_ERROR_RESPONSES,
    },
  }),
  (c) =>
    runWebhookApi(
      webhookRuntime,
      c,
      Effect.gen(function* () {
        const organizationId = yield* decodeOrganizationId(c);
        const deliveryId = yield* Schema.decodeUnknownEffect(DeliveryId)(
          c.req.valid("param").deliveryId
        );
        return c.json(yield* retryDelivery(organizationId, deliveryId), 200);
      })
    )
);
