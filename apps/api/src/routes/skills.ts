import { createRoute } from "@hono/zod-openapi";
import {
  createSkillRequestSchema,
  createSkillResponseSchema,
  deleteSkillResponseSchema,
  listSkillsResponseSchema,
  patchSkillRequestSchema,
  patchSkillResponseSchema,
  skillParamsSchema,
  skillResponseSchema,
} from "@notra/schemas/api/skills";

import {
  ORGANIZATION_SCOPED_API_KEY_ERROR,
  SKILL_NOT_FOUND_ERROR,
  SYSTEM_SKILL_DELETE_ERROR,
  SYSTEM_SKILL_RENAME_ERROR,
} from "../constants/skills";
import {
  createSkill,
  deleteSkill,
  getSkill,
  listSkills,
  patchSkill,
} from "../programs/skills";
import { getOrganizationId } from "../utils/auth";
import { createOpenApiApp } from "../utils/openapi-app";
import { errorResponse } from "../utils/openapi-responses";
import {
  runSkillProgram,
  serializeSkill,
  serializeSkillSummary,
} from "../utils/skills";

export const skillsRoutes = createOpenApiApp();

const listSkillsRoute = createRoute({
  method: "get",
  path: "/skills",
  tags: ["Skills"],
  operationId: "listSkills",
  summary: "List skills",
  description:
    "Returns the organization's skills sorted by name, including built-in system skills (isSystem: true). Skill content is omitted; use GET /v1/skills/{name} to read it.",
  responses: {
    200: {
      description: "Skills fetched successfully",
      content: { "application/json": { schema: listSkillsResponseSchema } },
    },
    401: errorResponse("Missing or invalid API key"),
    403: errorResponse("Forbidden"),
    503: errorResponse("Authentication service unavailable"),
  },
});

const getSkillRoute = createRoute({
  method: "get",
  path: "/skills/{name}",
  tags: ["Skills"],
  operationId: "getSkill",
  summary: "Get a single skill",
  request: { params: skillParamsSchema },
  responses: {
    200: {
      description: "Skill fetched successfully",
      content: { "application/json": { schema: skillResponseSchema } },
    },
    400: errorResponse("Invalid path params"),
    401: errorResponse("Missing or invalid API key"),
    403: errorResponse("Forbidden"),
    404: errorResponse(SKILL_NOT_FOUND_ERROR),
    503: errorResponse("Authentication service unavailable"),
  },
});

const createSkillRoute = createRoute({
  method: "post",
  path: "/skills",
  tags: ["Skills"],
  operationId: "createSkill",
  summary: "Create a skill",
  description:
    "Creates a custom skill. Names must be unique within the organization.",
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: createSkillRequestSchema } },
    },
  },
  responses: {
    201: {
      description: "Skill created successfully",
      content: { "application/json": { schema: createSkillResponseSchema } },
    },
    400: errorResponse("Invalid request body"),
    401: errorResponse("Missing or invalid API key"),
    403: errorResponse("Forbidden"),
    409: errorResponse("Skill name already exists"),
    503: errorResponse("Authentication service unavailable"),
  },
});

const patchSkillRoute = createRoute({
  method: "patch",
  path: "/skills/{name}",
  tags: ["Skills"],
  operationId: "patchSkill",
  summary: "Update a skill",
  description:
    "Updates the name, description, or content of a skill. System skills can be edited but not renamed.",
  request: {
    params: skillParamsSchema,
    body: {
      required: true,
      content: { "application/json": { schema: patchSkillRequestSchema } },
    },
  },
  responses: {
    200: {
      description: "Skill updated successfully",
      content: { "application/json": { schema: patchSkillResponseSchema } },
    },
    400: errorResponse("Invalid path params or request body"),
    401: errorResponse("Missing or invalid API key"),
    403: errorResponse("Forbidden, or attempt to rename a system skill"),
    404: errorResponse(SKILL_NOT_FOUND_ERROR),
    409: errorResponse("Skill name already exists"),
    503: errorResponse("Authentication service unavailable"),
  },
});

const deleteSkillRoute = createRoute({
  method: "delete",
  path: "/skills/{name}",
  tags: ["Skills"],
  operationId: "deleteSkill",
  summary: "Delete a skill",
  description: "Deletes a custom skill. System skills cannot be deleted.",
  request: { params: skillParamsSchema },
  responses: {
    200: {
      description: "Skill deleted successfully",
      content: { "application/json": { schema: deleteSkillResponseSchema } },
    },
    400: errorResponse("Invalid path params"),
    401: errorResponse("Missing or invalid API key"),
    403: errorResponse("Forbidden, or attempt to delete a system skill"),
    404: errorResponse(SKILL_NOT_FOUND_ERROR),
    503: errorResponse("Authentication service unavailable"),
  },
});

skillsRoutes.openapi(listSkillsRoute, async (c) => {
  const organizationId = getOrganizationId(c);
  if (!organizationId) {
    return c.json({ error: ORGANIZATION_SCOPED_API_KEY_ERROR }, 403);
  }

  const rows = await runSkillProgram(
    listSkills({ db: c.get("db"), organizationId })
  );
  if (rows._tag === "Failure") {
    throw rows.failure;
  }

  return c.json({ skills: rows.success.map(serializeSkillSummary) }, 200);
});

skillsRoutes.openapi(getSkillRoute, async (c) => {
  const organizationId = getOrganizationId(c);
  if (!organizationId) {
    return c.json({ error: ORGANIZATION_SCOPED_API_KEY_ERROR }, 403);
  }

  const { name } = c.req.valid("param");
  const result = await runSkillProgram(
    getSkill({ db: c.get("db"), organizationId, name })
  );
  if (result._tag === "Failure") {
    return c.json({ error: SKILL_NOT_FOUND_ERROR }, 404);
  }

  return c.json({ skill: serializeSkill(result.success) }, 200);
});

skillsRoutes.openapi(createSkillRoute, async (c) => {
  const organizationId = getOrganizationId(c);
  if (!organizationId) {
    return c.json({ error: ORGANIZATION_SCOPED_API_KEY_ERROR }, 403);
  }

  const body = c.req.valid("json");
  const result = await runSkillProgram(
    createSkill({ db: c.get("db"), organizationId, body })
  );
  if (result._tag === "Failure") {
    return c.json(
      { error: `A skill named "${result.failure.name}" already exists` },
      409
    );
  }
  return c.json({ skill: serializeSkill(result.success) }, 201);
});

skillsRoutes.openapi(patchSkillRoute, async (c) => {
  const organizationId = getOrganizationId(c);
  if (!organizationId) {
    return c.json({ error: ORGANIZATION_SCOPED_API_KEY_ERROR }, 403);
  }

  const { name } = c.req.valid("param");
  const body = c.req.valid("json");
  const result = await runSkillProgram(
    patchSkill({ db: c.get("db"), organizationId, name, body })
  );
  if (result._tag === "Failure") {
    if (result.failure._tag === "SkillNotFoundError") {
      return c.json({ error: SKILL_NOT_FOUND_ERROR }, 404);
    }
    if (result.failure._tag === "SystemSkillRenameError") {
      return c.json({ error: SYSTEM_SKILL_RENAME_ERROR }, 403);
    }
    return c.json(
      { error: `A skill named "${result.failure.name}" already exists` },
      409
    );
  }
  return c.json({ skill: serializeSkill(result.success) }, 200);
});

skillsRoutes.openapi(deleteSkillRoute, async (c) => {
  const organizationId = getOrganizationId(c);
  if (!organizationId) {
    return c.json({ error: ORGANIZATION_SCOPED_API_KEY_ERROR }, 403);
  }

  const { name } = c.req.valid("param");
  const result = await runSkillProgram(
    deleteSkill({ db: c.get("db"), organizationId, name })
  );
  if (result._tag === "Failure") {
    return result.failure._tag === "SkillNotFoundError"
      ? c.json({ error: SKILL_NOT_FOUND_ERROR }, 404)
      : c.json({ error: SYSTEM_SKILL_DELETE_ERROR }, 403);
  }
  return c.json({ success: true as const }, 200);
});
