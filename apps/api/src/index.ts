import "./tcc";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { flushLogs } from "@notra/ai/evlog";
import { createDb } from "@notra/db/drizzle";
import { shutdownPostHogServer } from "@notra/posthog/server";
import { publicStatusResponseSchema } from "@notra/schemas/api/status";
import {
  API_OPENAPI_TAGS,
  getRequiredApiScope,
  isApiMutationMethod,
  isUnscopedApiPath,
  LEGACY_API_READ_SCOPE,
  LEGACY_API_WRITE_SCOPE,
} from "@notra/utils/api-scopes";
import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { trimTrailingSlash } from "hono/trailing-slash";

import { apiAnalyticsMiddleware } from "./middleware/analytics";
import { authMiddleware } from "./middleware/auth";
import {
  geoContextMiddleware,
  geoProjectContextMiddleware,
} from "./middleware/geo-context";
import { geoEntitlementMiddleware } from "./middleware/geo-entitlement";
import { apiObservabilityMiddleware } from "./middleware/observability";
import { subscriptionMiddleware } from "./middleware/subscription";
import { agentChatsRoutes } from "./routes/agent-chats";
import { brandIdentitiesRoutes } from "./routes/brand-identities";
import { chatsRoutes } from "./routes/chats";
import { eventTriggersRoutes } from "./routes/event-triggers";
import { feedbackRoutes } from "./routes/feedback";
import { geoAgentReadinessRoutes } from "./routes/geo-agent-readiness";
import { geoBriefsRoutes } from "./routes/geo-briefs";
import { geoCompetitorsRoutes } from "./routes/geo-competitors";
import { geoProjectsRoutes } from "./routes/geo-projects";
import { geoPromptsRoutes } from "./routes/geo-prompts";
import { geoScansRoutes } from "./routes/geo-scans";
import { geoSequencesRoutes } from "./routes/geo-sequences";
import { geoSettingsRoutes } from "./routes/geo-settings";
import { geoTrafficRoutes } from "./routes/geo-traffic";
import { geoVisibilityRoutes } from "./routes/geo-visibility";
import { integrationsRoutes } from "./routes/integrations";
import { legacyRedirectRoutes } from "./routes/legacy-redirects";
import { postsRoutes } from "./routes/posts";
import { schedulesRoutes } from "./routes/schedules";
import { skillsRoutes } from "./routes/skills";
import type { ApiEnv } from "./types/env";
import type { ApiServerControl } from "./types/shutdown";
import {
  API_URL,
  AUTH_GUIDE_URL,
  buildAuthorizationServerMetadata,
  buildProtectedResourceMetadata,
  RESOURCE_METADATA_URL,
  SITE_URL,
} from "./utils/agent-discovery";
import { trackApiException } from "./utils/analytics";
import { assertRequiredEnv } from "./utils/env";
import { isPublicFeedbackIngestRequest } from "./utils/feedback";
import { logError } from "./utils/logging";
import { createApiShutdown } from "./utils/shutdown";

const FRAMER_PLUGIN_ID = "8d4wmwtko6960jsu3ojmalvqm";

const FRAMER_PLUGIN_ORIGIN_PATTERN = new RegExp(
  `^https://${FRAMER_PLUGIN_ID}(-[a-zA-Z0-9]+)?\\.plugins\\.framercdn\\.com$`
);

const LOCAL_DEV_ORIGIN_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

const IS_PRODUCTION = process.env.NODE_ENV === "production";

const publicStatusRoute = createRoute({
  method: "get",
  path: "/v1/status",
  tags: ["Discovery"],
  operationId: "getPublicApiStatus",
  summary: "Check public API reachability",
  security: [],
  responses: {
    200: {
      description:
        "Public reachability and authentication discovery metadata for agents.",
      content: {
        "application/json": {
          schema: publicStatusResponseSchema,
        },
      },
    },
  },
});

function getAllowedOrigin(origin: string | undefined): string | null {
  if (!origin) {
    return null;
  }

  const allowedPatterns = [
    FRAMER_PLUGIN_ORIGIN_PATTERN,
    ...(IS_PRODUCTION ? [] : [LOCAL_DEV_ORIGIN_PATTERN]),
  ];

  return allowedPatterns.some((pattern) => pattern.test(origin))
    ? origin
    : null;
}

assertRequiredEnv();

export const app = new OpenAPIHono<ApiEnv>({ strict: true });

const securityHeadersMiddleware = async (
  c: Context,
  next: () => Promise<void>
) => {
  const origin = c.req.header("origin");
  const allowedOrigin = getAllowedOrigin(origin);

  c.header("Vary", "Origin, Authorization");
  c.header("Cache-Control", "private, no-store");
  c.header("X-Content-Type-Options", "nosniff");
  c.header(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  );
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");

  if (allowedOrigin) {
    c.header("Access-Control-Allow-Origin", allowedOrigin);
    c.header(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    );
    c.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  }

  if (c.req.method === "OPTIONS") {
    return c.body(null, allowedOrigin ? 204 : 403);
  }

  await next();
};

app.use("*", apiObservabilityMiddleware);
app.use("/v1/*", securityHeadersMiddleware);
app.use("/v2/*", securityHeadersMiddleware);

app.use(trimTrailingSlash({ alwaysRedirect: true }));

const databaseMiddleware = async (c: Context, next: () => Promise<void>) => {
  c.set("db", createDb(c.env.DATABASE_URL));
  await next();
};

app.use("/v1/*", databaseMiddleware);
app.use("/v2/*", databaseMiddleware);

app.openapi(publicStatusRoute, (c) => {
  return c.json({
    status: "ok",
    service: "Notra API",
    version: "1.0.0",
    public: true,
    authentication: {
      type: "bearer",
      resource_metadata: RESOURCE_METADATA_URL,
      guide: AUTH_GUIDE_URL,
    },
  });
});

const oauthScopeMiddleware = async (c: Context, next: () => Promise<void>) => {
  const pathname = new URL(c.req.url).pathname;
  const requiredScope = getRequiredApiScope(pathname, c.req.method);
  if (!requiredScope && !isUnscopedApiPath(pathname)) {
    // A route that was not registered must never silently become accessible
    // to any valid key. Returning 404 keeps unknown endpoints conventional
    // while making a newly added-but-unregistered operation unreachable.
    return c.json({ error: "Not found" }, 404);
  }
  // `expandLegacyApiScopes` is the registry's rule: `api.write` implies every
  // scope, `api.read` only the read scopes. So a read may fall back to either
  // legacy scope, while a write accepts `api.write` alone — offering
  // `api.read` on a write would hand read-only keys mutation access.
  const legacyPermissions = isApiMutationMethod(c.req.method)
    ? [LEGACY_API_WRITE_SCOPE]
    : [LEGACY_API_READ_SCOPE, LEGACY_API_WRITE_SCOPE];

  return await authMiddleware({
    legacyPermissions,
    permissions: requiredScope,
  })(c, next);
};

const unlessPublicFeedbackIngest =
  (middleware: (c: Context, next: () => Promise<void>) => Promise<unknown>) =>
  (c: Context, next: () => Promise<void>) =>
    isPublicFeedbackIngestRequest(new URL(c.req.url).pathname, c.req.method)
      ? next()
      : middleware(c, next);

app.use("/v1/*", apiAnalyticsMiddleware);
app.use("/v2/*", apiAnalyticsMiddleware);

app.use("/v1/*", unlessPublicFeedbackIngest(oauthScopeMiddleware));
app.use("/v2/*", oauthScopeMiddleware);

app.use("/v1/*", unlessPublicFeedbackIngest(subscriptionMiddleware()));
app.use("/v2/*", subscriptionMiddleware());

// GEO is a paid add-on, so every GEO endpoint — reads included — additionally
// requires the `ai_answers` plan entitlement. `subscriptionMiddleware` above
// still applies unchanged.
app.use("/v1/projects/*", geoEntitlementMiddleware());
app.use("/v1/geo/ingest/*", geoEntitlementMiddleware());
app.use("/v1/projects/*", geoContextMiddleware());
app.use("/v1/projects/:projectId/*", geoProjectContextMiddleware());
app.use("/v1/geo/ingest/*", geoContextMiddleware());

app.get("/", (c) => {
  return c.text("ok");
});

app.get("/ping", (c) => {
  return c.text("pong");
});

app.get("/.well-known/oauth-protected-resource", (c) => {
  return c.json(buildProtectedResourceMetadata(new URL(c.req.url).origin));
});

app.get("/.well-known/oauth-authorization-server", (c) => {
  return c.json(buildAuthorizationServerMetadata());
});

app.get("/.well-known/api-catalog", (c) => {
  c.header(
    "Content-Type",
    'application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"; charset=utf-8'
  );

  return c.body(
    JSON.stringify({
      linkset: [
        {
          anchor: API_URL,
          item: [
            {
              href: `${API_URL}/openapi.json`,
              rel: "service-desc",
              type: "application/openapi+json",
              title: "Notra Public API OpenAPI schema",
            },
            {
              href: AUTH_GUIDE_URL,
              rel: "authorization-server-metadata",
              type: "text/markdown",
              title: "Notra agent authentication guide",
            },
          ],
        },
      ],
    })
  );
});

app.route("/v1", legacyRedirectRoutes);
app.route("/v1", postsRoutes);
app.route("/v1", brandIdentitiesRoutes);
app.route("/v1", integrationsRoutes);
app.route("/v1", schedulesRoutes);
app.route("/v1", eventTriggersRoutes);
app.route("/v1", chatsRoutes);
app.route("/v1", skillsRoutes);
app.route("/v1", feedbackRoutes);
app.route("/v1", geoProjectsRoutes);
app.route("/v1", geoSettingsRoutes);
app.route("/v1", geoPromptsRoutes);
app.route("/v1", geoSequencesRoutes);
app.route("/v1", geoCompetitorsRoutes);
app.route("/v1", geoScansRoutes);
app.route("/v1", geoVisibilityRoutes);
app.route("/v1", geoBriefsRoutes);
app.route("/v1", geoAgentReadinessRoutes);
app.route("/v1", geoTrafficRoutes);
app.route("/v2", agentChatsRoutes);

app.openAPIRegistry.registerComponent("securitySchemes", "BearerAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "API Key",
  description:
    "Send your API key in the Authorization header as Bearer API_KEY.",
});

app.doc31("/openapi.json", (_c) => ({
  openapi: "3.1.1",
  info: {
    title: "Notra API",
    version: "1.0.0",
    description:
      "OpenAPI schema for Notra content endpoints. Use GET /v1/status for public reachability. Error responses include recovery guidance.",
  },
  servers: [
    {
      url: "https://api.usenotra.com",
      description: "Production",
    },
  ],
  security: [{ BearerAuth: [] }],
  tags: [...API_OPENAPI_TAGS],
}));

app.onError((error, c) => {
  if (error instanceof HTTPException) {
    return error.getResponse();
  }

  const { pathname } = new URL(c.req.url);
  logError(`Unhandled error: ${c.req.method} ${pathname}`, error);
  trackApiException(c, error, 500);
  return c.json({ error: "Internal server error" }, 500);
});

const apiShutdown = createApiShutdown(() =>
  Promise.allSettled([shutdownPostHogServer(), flushLogs()])
);

for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.once(signal, () => {
    void apiShutdown.shutdown().finally(() => process.exit(0));
  });
}

export default {
  port: process.env.PORT ?? 3000,
  // Bun closes a connection after 10s without bytes on the socket, and an
  // in-flight handler that has not written a response yet counts as idle. That
  // default silently killed the synchronous GEO sequence run — the socket shut
  // after ~10s with zero bytes sent. 255s is Bun's maximum; the synchronous
  // internal call gives up at 240s (see SYNCHRONOUS_INTERNAL_CALL_TIMEOUT_MS)
  // so the client always gets a real answer first. Not 0/disabled: a wedged
  // upstream should not hold sockets forever.
  idleTimeout: 255,
  fetch: (request: Request, server: ApiServerControl) => {
    apiShutdown.attachServer(server);
    return apiShutdown.handleRequest(() => app.fetch(request, process.env));
  },
};
