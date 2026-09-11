import { createRoute } from "@hono/zod-openapi";
import {
  createBrandAnalysisJob,
  createBrandAnalysisJobId,
  getBrandAnalysisJob,
  setBrandAnalysisJobStatus,
  updateBrandAnalysisJob,
} from "@notra/ai/jobs/brand-analysis";
import { brandSettings, contentTriggers } from "@notra/db/schema";
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
import { and, asc, desc, eq, inArray, ne } from "drizzle-orm";

import { getOrganizationId } from "../utils/auth";
import {
  isBrandAnalysisConfigured,
  triggerBrandAnalysisWorkflow,
} from "../utils/brand-analysis";
import {
  selectBrandIdentityColumns,
  serializeBrandIdentity,
} from "../utils/brand-identities";
import { createOpenApiApp } from "../utils/openapi-app";
import { errorResponse, rateLimitResponse } from "../utils/openapi-responses";
import { getOrganizationResponse } from "../utils/organizations";
import { isConstraintViolation, isPgUniqueViolation } from "../utils/pg-errors";
import { enforceRatelimit, RATE_LIMITS, ratelimit } from "../utils/ratelimit";
import { getRedis } from "../utils/redis";
import {
  deleteQstashSchedulesForTriggers,
  getTriggersForBrandIdentity,
} from "../utils/triggers";

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
    503: errorResponse("Authentication service unavailable"),
  },
});

brandIdentitiesRoutes.openapi(getBrandIdentitiesRoute, async (c) => {
  const orgId = getOrganizationId(c);
  if (!orgId) {
    return c.json(
      { error: "Forbidden: API key must be scoped to an organization" },
      403
    );
  }

  const db = c.get("db");
  const organization = await getOrganizationResponse(db, orgId);

  if (!organization) {
    return c.json({ error: "Organization not found" }, 404);
  }

  const brandIdentities = await db.query.brandSettings.findMany({
    where: eq(brandSettings.organizationId, orgId),
    orderBy: [desc(brandSettings.isDefault), asc(brandSettings.createdAt)],
    columns: {
      id: true,
      name: true,
      isDefault: true,
      websiteUrl: true,
      companyName: true,
      companyDescription: true,
      toneProfile: true,
      customTone: true,
      customInstructions: true,
      audience: true,
      language: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return c.json(
    {
      brandIdentities: brandIdentities.map(serializeBrandIdentity),
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
  const db = c.get("db");
  const organization = await getOrganizationResponse(db, orgId);

  if (!organization) {
    return c.json({ error: "Organization not found" }, 404);
  }

  if (!redis || !isBrandAnalysisConfigured(runtimeEnv)) {
    return c.json({ error: "Brand analysis is unavailable" }, 503);
  }

  const name = body.name?.trim() || "Untitled Brand Voice";
  const websiteUrl = body.websiteUrl;
  const newBrandIdentityId = crypto.randomUUID();
  const now = new Date().toISOString();
  const jobId = createBrandAnalysisJobId();

  const existingBrandIdentityWithName = await db.query.brandSettings.findFirst({
    where: and(
      eq(brandSettings.organizationId, orgId),
      eq(brandSettings.name, name)
    ),
    columns: { id: true },
  });

  if (existingBrandIdentityWithName) {
    return c.json(
      { error: "A brand identity with this name already exists" },
      409
    );
  }

  // Charged immediately before the brand analysis workflow is queued: the 404,
  // 503 and 409 above must not spend the caller's budget.
  const rateLimited = await enforceRatelimit(c, ratelimit.brandGeneration);
  if (rateLimited) {
    return rateLimited;
  }

  try {
    const hasAnyBrandIdentity = await db.query.brandSettings.findFirst({
      where: eq(brandSettings.organizationId, orgId),
      columns: { id: true },
    });

    const [brandIdentity] = await (async () => {
      try {
        return await db
          .insert(brandSettings)
          .values({
            id: newBrandIdentityId,
            organizationId: orgId,
            name,
            isDefault: !hasAnyBrandIdentity,
            websiteUrl,
          })
          .returning(selectBrandIdentityColumns());
      } catch (error) {
        if (!isConstraintViolation(error, "brandSettings_org_default_uidx")) {
          throw error;
        }

        return db
          .insert(brandSettings)
          .values({
            id: newBrandIdentityId,
            organizationId: orgId,
            name,
            isDefault: false,
            websiteUrl,
          })
          .returning(selectBrandIdentityColumns());
      }
    })();

    if (!brandIdentity) {
      throw new Error("Failed to create brand identity");
    }

    try {
      const job = await createBrandAnalysisJob(redis, {
        id: jobId,
        organizationId: orgId,
        brandIdentityId: brandIdentity.id,
        status: "queued",
        step: null,
        currentStep: 0,
        totalSteps: 3,
        workflowRunId: null,
        error: null,
        createdAt: now,
        updatedAt: now,
        completedAt: null,
      });

      const workflowRunId = await triggerBrandAnalysisWorkflow(runtimeEnv, {
        organizationId: orgId,
        url: websiteUrl,
        voiceId: brandIdentity.id,
        jobId,
      });

      const updatedJob = await updateBrandAnalysisJob(redis, jobId, {
        workflowRunId,
      });

      return c.json({ job: updatedJob ?? job, organization }, 202);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to trigger workflow";

      await setBrandAnalysisJobStatus(redis, jobId, "failed", {
        step: null,
        currentStep: 0,
        totalSteps: 3,
        error: message,
      });

      await db
        .delete(brandSettings)
        .where(
          and(
            eq(brandSettings.id, brandIdentity.id),
            eq(brandSettings.organizationId, orgId)
          )
        );

      return c.json(
        {
          error: "Failed to queue brand identity analysis",
        },
        503
      );
    }
  } catch (error) {
    if (isPgUniqueViolation(error)) {
      if (isConstraintViolation(error, "brandSettings_org_name_uidx")) {
        return c.json(
          { error: "A brand identity with this name already exists" },
          409
        );
      }

      return c.json({ error: "Failed to create brand identity" }, 409);
    }

    throw error;
  }
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
  const db = c.get("db");
  const organization = await getOrganizationResponse(db, orgId);

  if (!organization) {
    return c.json({ error: "Organization not found" }, 404);
  }

  if (!redis) {
    return c.json({ error: "Brand analysis is unavailable" }, 503);
  }

  const job = await getBrandAnalysisJob(redis, jobId);

  if (!job || job.organizationId !== orgId) {
    return c.json({ error: "Brand identity analysis job not found" }, 404);
  }

  return c.json({ job, organization }, 200);
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
  const db = c.get("db");
  const organization = await getOrganizationResponse(db, orgId);

  if (!organization) {
    return c.json({ error: "Organization not found" }, 404);
  }

  const brandIdentity = await db.query.brandSettings.findFirst({
    where: and(
      eq(brandSettings.id, brandIdentityId),
      eq(brandSettings.organizationId, orgId)
    ),
    columns: {
      id: true,
      name: true,
      isDefault: true,
      websiteUrl: true,
      companyName: true,
      companyDescription: true,
      toneProfile: true,
      customTone: true,
      customInstructions: true,
      audience: true,
      language: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return c.json(
    {
      brandIdentity: brandIdentity
        ? serializeBrandIdentity(brandIdentity)
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
  const db = c.get("db");
  const organization = await getOrganizationResponse(db, orgId);

  if (!organization) {
    return c.json({ error: "Organization not found" }, 404);
  }

  const existingBrandIdentity = await db.query.brandSettings.findFirst({
    where: and(
      eq(brandSettings.id, brandIdentityId),
      eq(brandSettings.organizationId, orgId)
    ),
    columns: { id: true },
  });

  if (!existingBrandIdentity) {
    return c.json({ error: "Brand identity not found" }, 404);
  }

  const updateData: Partial<typeof brandSettings.$inferInsert> = {
    updatedAt: new Date(),
  };
  const shouldSetDefault = body.isDefault === true;

  if (body.name !== undefined) {
    updateData.name = body.name;
  }

  if (body.websiteUrl !== undefined) {
    updateData.websiteUrl = body.websiteUrl;
  }

  if (body.companyName !== undefined) {
    updateData.companyName = body.companyName;
  }

  if (body.companyDescription !== undefined) {
    updateData.companyDescription = body.companyDescription;
  }

  if (body.toneProfile !== undefined) {
    updateData.toneProfile = body.toneProfile;
    if (body.customTone === undefined) {
      updateData.customTone = null;
    }
  }

  if (body.customTone !== undefined) {
    updateData.customTone = body.customTone?.trim() ? body.customTone : null;
  }

  if (body.customInstructions !== undefined) {
    updateData.customInstructions = body.customInstructions;
  }

  if (body.audience !== undefined) {
    updateData.audience = body.audience;
  }

  if (body.language !== undefined) {
    updateData.language = body.language;
  }

  try {
    const [brandIdentity] = shouldSetDefault
      ? await db.transaction(async (tx) => {
          const { updatedAt, ...targetUpdateData } = updateData;

          if (Object.keys(targetUpdateData).length > 0) {
            await tx
              .update(brandSettings)
              .set(targetUpdateData)
              .where(
                and(
                  eq(brandSettings.id, brandIdentityId),
                  eq(brandSettings.organizationId, orgId)
                )
              );
          }

          await tx
            .update(brandSettings)
            .set({ isDefault: false })
            .where(
              and(
                eq(brandSettings.organizationId, orgId),
                eq(brandSettings.isDefault, true),
                ne(brandSettings.id, brandIdentityId)
              )
            );

          return tx
            .update(brandSettings)
            .set({ isDefault: true, updatedAt })
            .where(
              and(
                eq(brandSettings.id, brandIdentityId),
                eq(brandSettings.organizationId, orgId)
              )
            )
            .returning(selectBrandIdentityColumns());
        })
      : await db
          .update(brandSettings)
          .set(updateData)
          .where(
            and(
              eq(brandSettings.id, brandIdentityId),
              eq(brandSettings.organizationId, orgId)
            )
          )
          .returning(selectBrandIdentityColumns());

    if (!brandIdentity) {
      return c.json({ error: "Brand identity not found" }, 404);
    }

    return c.json(
      { brandIdentity: serializeBrandIdentity(brandIdentity), organization },
      200
    );
  } catch (error) {
    if (isPgUniqueViolation(error)) {
      return c.json(
        { error: "A brand identity with this name already exists" },
        409
      );
    }

    throw error;
  }
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
  const db = c.get("db");
  const organization = await getOrganizationResponse(db, orgId);

  if (!organization) {
    return c.json({ error: "Organization not found" }, 404);
  }

  const brandIdentity = await db.query.brandSettings.findFirst({
    where: and(
      eq(brandSettings.id, brandIdentityId),
      eq(brandSettings.organizationId, orgId)
    ),
    columns: {
      id: true,
      isDefault: true,
    },
  });

  if (!brandIdentity) {
    return c.json({ error: "Brand identity not found" }, 404);
  }

  if (brandIdentity.isDefault) {
    return c.json({ error: "Cannot delete the default brand identity" }, 400);
  }

  const affectedTriggers = await getTriggersForBrandIdentity(
    db,
    orgId,
    brandIdentityId
  );

  await db.transaction(async (tx) => {
    if (affectedTriggers.length > 0) {
      await tx
        .update(contentTriggers)
        .set({
          enabled: false,
          qstashScheduleId: null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(contentTriggers.organizationId, orgId),
            inArray(
              contentTriggers.id,
              affectedTriggers.map((trigger) => trigger.id)
            )
          )
        );
    }

    await tx
      .delete(brandSettings)
      .where(
        and(
          eq(brandSettings.id, brandIdentityId),
          eq(brandSettings.organizationId, orgId)
        )
      );
  });

  await deleteQstashSchedulesForTriggers(runtimeEnv, affectedTriggers);

  return c.json(
    {
      id: brandIdentityId,
      organization,
      disabledSchedules: affectedTriggers
        .filter((trigger) => trigger.sourceType === "cron")
        .map((trigger) => ({ id: trigger.id, name: trigger.name })),
      disabledEvents: affectedTriggers
        .filter((trigger) => trigger.sourceType !== "cron")
        .map((trigger) => ({ id: trigger.id, name: trigger.name })),
    },
    200
  );
});
