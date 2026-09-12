import { createRoute } from "@hono/zod-openapi";
import {
  createBrandIdentityRequestSchema,
  createBrandIdentityResponseSchema,
  deleteBrandIdentityResponseSchema,
  getBrandAnalysisJobParamsSchema,
  getBrandAnalysisJobResponseSchema,
  getBrandIdentitiesResponseSchema,
  getBrandIdentityParamsSchema,
  getBrandIdentityResponseSchema,
  patchBrandIdentityRequestSchema,
  patchBrandIdentityResponseSchema,
} from "@notra/schemas/api/content";

import {
  createBrandIdentity,
  deleteBrandIdentity,
  findBrandIdentityNameDuplicate,
  getBrandAnalysisJobStatus,
  getBrandIdentity,
  listBrandIdentities,
  patchBrandIdentity,
} from "../programs/brand-identities";
import type { DbClient } from "../types/db";
import { getOrganizationId } from "../utils/auth";
import { isBrandAnalysisConfigured } from "../utils/brand-analysis";
import {
  respondToBrandIdentityFailure,
  runBrandIdentityProgram,
  serializeBrandIdentity,
} from "../utils/brand-identities";
import { createOpenApiApp } from "../utils/openapi-app";
import { errorResponse, rateLimitResponse } from "../utils/openapi-responses";
import { getOrganizationResponse } from "../utils/organizations";
import { enforceRatelimit, RATE_LIMITS, ratelimit } from "../utils/ratelimit";
import { getRedis } from "../utils/redis";

export const brandIdentitiesRoutes = createOpenApiApp();

const getBrandIdentitiesRoute = createRoute({
  method: "get",
  path: "/brand-identities",
  tags: ["Content"],
  operationId: "listBrandIdentities",
  summary: "List available brand identities",
  description:
    "Returns every brand identity in the organization, default identity first.",
  responses: {
    200: {
      description: "Brand identities fetched successfully",
      content: {
        "application/json": {
          schema: getBrandIdentitiesResponseSchema,
        },
      },
    },
    401: errorResponse("Missing or invalid API key"),
    403: errorResponse("Forbidden"),
    404: errorResponse("Organization not found"),
    503: errorResponse("Authentication service unavailable"),
  },
});

const createBrandIdentityRoute = createRoute({
  method: "post",
  path: "/brand-identities/generate",
  tags: ["Content"],
  operationId: "createBrandIdentity",
  summary: "Queue async brand identity generation",
  description:
    "Creates the brand identity immediately, then queues a website analysis that fills in company details, tone, and audience. The first brand identity in an organization becomes the default. Poll GET /v1/brand-identities/generate/{jobId} until job.status is completed or failed.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: createBrandIdentityRequestSchema,
        },
      },
      required: true,
    },
  },
  responses: {
    202: {
      description: "Brand identity generation queued successfully",
      content: {
        "application/json": {
          schema: createBrandIdentityResponseSchema,
        },
      },
    },
    400: errorResponse("Invalid request body"),
    401: errorResponse("Missing or invalid API key"),
    403: errorResponse("Forbidden"),
    404: errorResponse("Organization not found"),
    409: errorResponse("Brand identity name already exists"),
    429: rateLimitResponse(
      RATE_LIMITS.brandGeneration.requests,
      RATE_LIMITS.brandGeneration.window,
      "API key"
    ),
    503: errorResponse("Authentication service or brand analysis unavailable"),
  },
});

const getBrandAnalysisJobRoute = createRoute({
  method: "get",
  path: "/brand-identities/generate/{jobId}",
  tags: ["Content"],
  operationId: "getBrandIdentityGeneration",
  summary: "Get async brand identity generation status",
  description:
    "Returns the analysis job. job.status moves from queued to running and ends as completed or failed; job.step shows the current stage while running. Fetch the finished identity with GET /v1/brand-identities/{brandIdentityId}.",
  request: {
    params: getBrandAnalysisJobParamsSchema,
  },
  responses: {
    200: {
      description: "Brand identity generation status fetched successfully",
      content: {
        "application/json": {
          schema: getBrandAnalysisJobResponseSchema,
        },
      },
    },
    400: errorResponse("Invalid path params"),
    401: errorResponse("Missing or invalid API key"),
    403: errorResponse("Forbidden"),
    404: errorResponse("Brand identity analysis job not found"),
    503: errorResponse("Brand analysis is unavailable"),
  },
});

const getBrandIdentityRoute = createRoute({
  method: "get",
  path: "/brand-identities/{brandIdentityId}",
  tags: ["Content"],
  operationId: "getBrandIdentity",
  summary: "Get a single brand identity",
  description:
    "Returns the brand identity. When no brand identity with this ID exists in your organization, the response is still 200 with brandIdentity set to null.",
  request: {
    params: getBrandIdentityParamsSchema,
  },
  responses: {
    200: {
      description: "Brand identity fetched successfully",
      content: {
        "application/json": {
          schema: getBrandIdentityResponseSchema,
        },
      },
    },
    400: errorResponse("Invalid path params"),
    401: errorResponse("Missing or invalid API key"),
    403: errorResponse("Forbidden"),
    404: errorResponse("Organization not found"),
    503: errorResponse("Authentication service unavailable"),
  },
});

const patchBrandIdentityRoute = createRoute({
  method: "patch",
  path: "/brand-identities/{brandIdentityId}",
  tags: ["Content"],
  operationId: "updateBrandIdentity",
  summary: "Update a single brand identity",
  description:
    "Updates brand identity fields. Pass isDefault: true to make the target brand identity the organization's default.",
  request: {
    params: getBrandIdentityParamsSchema,
    body: {
      content: {
        "application/json": {
          schema: patchBrandIdentityRequestSchema,
          examples: {
            setDefault: {
              summary: "Set as default",
              value: {
                isDefault: true,
              },
            },
            updateAndSetDefault: {
              summary: "Rename and set as default",
              value: {
                name: "Notra Marketing",
                isDefault: true,
              },
            },
            switchToPresetTone: {
              summary: "Switch custom tone to preset",
              value: {
                toneProfile: "Professional",
              },
            },
            setCustomTone: {
              summary: "Set custom tone",
              value: {
                customTone: "Warm, sharp, and opinionated",
              },
            },
          },
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      description: "Brand identity updated successfully",
      content: {
        "application/json": {
          schema: patchBrandIdentityResponseSchema,
        },
      },
    },
    400: errorResponse("Invalid path params or request body"),
    401: errorResponse("Missing or invalid API key"),
    403: errorResponse("Forbidden"),
    404: errorResponse("Brand identity not found"),
    409: errorResponse("Brand identity name already exists"),
    503: errorResponse("Authentication service unavailable"),
  },
});

const deleteBrandIdentityRoute = createRoute({
  method: "delete",
  path: "/brand-identities/{brandIdentityId}",
  tags: ["Content"],
  operationId: "deleteBrandIdentity",
  summary: "Delete a single brand identity",
  description:
    "Deletes a non-default brand identity and disables any automation triggers that reference it.",
  request: {
    params: getBrandIdentityParamsSchema,
  },
  responses: {
    200: {
      description: "Brand identity deleted successfully",
      content: {
        "application/json": {
          schema: deleteBrandIdentityResponseSchema,
        },
      },
    },
    400: errorResponse("Cannot delete the default brand identity"),
    401: errorResponse("Missing or invalid API key"),
    403: errorResponse("Forbidden"),
    404: errorResponse("Brand identity not found"),
    409: errorResponse(
      "Brand identity is in use by a project or content brief"
    ),
    503: errorResponse("Authentication service unavailable"),
  },
});

async function requireOrganization(
  c: {
    get: (key: "db") => DbClient;
  },
  orgId: string
) {
  const organization = await getOrganizationResponse(c.get("db"), orgId);
  return organization ?? null;
}

brandIdentitiesRoutes.openapi(getBrandIdentitiesRoute, async (c) => {
  const orgId = getOrganizationId(c);
  if (!orgId) {
    return c.json(
      { error: "Forbidden: API key must be scoped to an organization" },
      403
    );
  }

  const organization = await requireOrganization(c, orgId);
  if (!organization) {
    return c.json({ error: "Organization not found" }, 404);
  }

  const result = await runBrandIdentityProgram(
    listBrandIdentities({ db: c.get("db"), organizationId: orgId })
  );

  if (result._tag === "Failure") {
    throw result.failure;
  }

  return c.json(
    {
      brandIdentities: result.success.brandIdentities.map(
        serializeBrandIdentity
      ),
      organization,
    },
    200
  );
});

brandIdentitiesRoutes.openapi(createBrandIdentityRoute, async (c) => {
  const orgId = getOrganizationId(c);
  if (!orgId) {
    return c.json(
      { error: "Forbidden: API key must be scoped to an organization" },
      403
    );
  }

  const body = c.req.valid("json");
  const runtimeEnv = c.env ?? {};
  const redis = getRedis(runtimeEnv);
  const organization = await requireOrganization(c, orgId);

  if (!organization) {
    return c.json({ error: "Organization not found" }, 404);
  }

  if (!redis || !isBrandAnalysisConfigured(runtimeEnv)) {
    return c.json({ error: "Brand analysis is unavailable" }, 503);
  }

  const name = body.name?.trim() || "Untitled Brand Voice";

  const duplicateCheck = await runBrandIdentityProgram(
    findBrandIdentityNameDuplicate({
      db: c.get("db"),
      organizationId: orgId,
      name,
    })
  );

  if (duplicateCheck._tag === "Failure") {
    const response = respondToBrandIdentityFailure(c, duplicateCheck.failure);
    if (response) {
      return response;
    }
    throw duplicateCheck.failure;
  }

  // Charged immediately before the brand analysis workflow is queued: the 404,
  // 503 and 409 above must not spend the caller's budget.
  const rateLimited = await enforceRatelimit(c, ratelimit.brandGeneration);
  if (rateLimited) {
    return rateLimited;
  }

  const result = await runBrandIdentityProgram(
    createBrandIdentity({
      db: c.get("db"),
      organizationId: orgId,
      body,
      redis,
      runtimeEnv,
    })
  );

  if (result._tag === "Failure") {
    const response = respondToBrandIdentityFailure(c, result.failure);
    if (response) {
      return response;
    }
    throw result.failure;
  }

  return c.json({ job: result.success.job, organization }, 202);
});

brandIdentitiesRoutes.openapi(getBrandAnalysisJobRoute, async (c) => {
  const orgId = getOrganizationId(c);
  if (!orgId) {
    return c.json(
      { error: "Forbidden: API key must be scoped to an organization" },
      403
    );
  }

  const { jobId } = c.req.valid("param");
  const runtimeEnv = c.env ?? {};
  const redis = getRedis(runtimeEnv);
  const organization = await requireOrganization(c, orgId);

  if (!organization) {
    return c.json({ error: "Organization not found" }, 404);
  }

  if (!redis) {
    return c.json({ error: "Brand analysis is unavailable" }, 503);
  }

  const result = await runBrandIdentityProgram(
    getBrandAnalysisJobStatus({
      db: c.get("db"),
      organizationId: orgId,
      jobId,
      redis,
    })
  );

  if (result._tag === "Failure") {
    if (result.failure._tag === "BrandAnalysisJobNotFoundError") {
      return c.json({ error: "Brand identity analysis job not found" }, 404);
    }
    throw result.failure;
  }

  return c.json({ job: result.success.job, organization }, 200);
});

brandIdentitiesRoutes.openapi(getBrandIdentityRoute, async (c) => {
  const orgId = getOrganizationId(c);
  if (!orgId) {
    return c.json(
      { error: "Forbidden: API key must be scoped to an organization" },
      403
    );
  }

  const { brandIdentityId } = c.req.valid("param");
  const organization = await requireOrganization(c, orgId);

  if (!organization) {
    return c.json({ error: "Organization not found" }, 404);
  }

  const result = await runBrandIdentityProgram(
    getBrandIdentity({
      db: c.get("db"),
      organizationId: orgId,
      brandIdentityId,
    })
  );

  if (result._tag === "Failure") {
    throw result.failure;
  }

  return c.json(
    {
      brandIdentity: result.success.brandIdentity
        ? serializeBrandIdentity(result.success.brandIdentity)
        : null,
      organization,
    },
    200
  );
});

brandIdentitiesRoutes.openapi(patchBrandIdentityRoute, async (c) => {
  const orgId = getOrganizationId(c);
  if (!orgId) {
    return c.json(
      { error: "Forbidden: API key must be scoped to an organization" },
      403
    );
  }

  const { brandIdentityId } = c.req.valid("param");
  const body = c.req.valid("json");
  const organization = await requireOrganization(c, orgId);

  if (!organization) {
    return c.json({ error: "Organization not found" }, 404);
  }

  const result = await runBrandIdentityProgram(
    patchBrandIdentity({
      db: c.get("db"),
      organizationId: orgId,
      brandIdentityId,
      body,
    })
  );

  if (result._tag === "Failure") {
    const response = respondToBrandIdentityFailure(c, result.failure);
    if (response) {
      return response;
    }
    throw result.failure;
  }

  return c.json(
    {
      brandIdentity: serializeBrandIdentity(result.success.brandIdentity),
      organization,
    },
    200
  );
});

brandIdentitiesRoutes.openapi(deleteBrandIdentityRoute, async (c) => {
  const orgId = getOrganizationId(c);
  if (!orgId) {
    return c.json(
      { error: "Forbidden: API key must be scoped to an organization" },
      403
    );
  }

  const { brandIdentityId } = c.req.valid("param");
  const runtimeEnv = c.env ?? {};
  const organization = await requireOrganization(c, orgId);

  if (!organization) {
    return c.json({ error: "Organization not found" }, 404);
  }

  const result = await runBrandIdentityProgram(
    deleteBrandIdentity({
      db: c.get("db"),
      organizationId: orgId,
      brandIdentityId,
      runtimeEnv,
    })
  );

  if (result._tag === "Failure") {
    if (result.failure._tag === "BrandIdentityNotFoundError") {
      return c.json({ error: "Brand identity not found" }, 404);
    }
    if (result.failure._tag === "BrandIdentityDefaultDeleteError") {
      return c.json({ error: "Cannot delete the default brand identity" }, 400);
    }
    if (result.failure._tag === "BrandIdentityInUseError") {
      return c.json(
        {
          error:
            "Brand identity is in use by a project or content brief and cannot be deleted",
        },
        409
      );
    }
    throw result.failure;
  }

  return c.json(
    {
      ...result.success,
      organization,
    },
    200
  );
});
