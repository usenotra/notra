import { createRoute } from "@hono/zod-openapi";
import {
  createSkillRequestSchema,
  createSkillResponseSchema,
  deleteSkillResponseSchema,
  listSkillsResponseSchema,
  listSystemSkillsResponseSchema,
  patchSkillRequestSchema,
  patchSkillResponseSchema,
  skillParamsSchema,
  skillResponseSchema,
  systemSkillResponseSchema,
  systemSkillVersionParamsSchema,
  upgradeSkillRequestSchema,
  upgradeSkillResponseSchema,
} from "@notra/schemas/api/skills";

import {
  ORGANIZATION_SCOPED_API_KEY_ERROR,
  SKILL_NOT_FOUND_ERROR,
  SKILL_NOT_SYSTEM_ERROR,
  SYSTEM_SKILL_DELETE_ERROR,
  SYSTEM_SKILL_NOT_FOUND_ERROR,
  SYSTEM_SKILL_VERSION_NOT_FOUND_ERROR,
} from "../constants/skills";
import {
  createSkill,
  deleteSkill,
  getSkill,
  getSystemSkill,
  getSystemSkillVersion,
  listSkills,
  listSystemSkills,
  patchSkill,
  upgradeSkill,
} from "../programs/skills";
import { getOrganizationId } from "../utils/auth";
import { createOpenApiApp } from "../utils/openapi-app";
import { errorResponse } from "../utils/openapi-responses";
import {
  runSkillProgram,
  serializeSkill,
  serializeSkillSummary,
  serializeSystemSkill,
  serializeSystemSkillDetail,
} from "../utils/skills";

export const skillsRoutes = createOpenApiApp();

const listSkillsRoute = createRoute({
  method: "get",
  path: "/skills",
  tags: ["Skills"],
  operationId: "listSkills",
  summary: "List skills",
  description:
    "Returns the organization's skills sorted by name, including built-in system skills (isSystem: true). Skill content is omitted; use GET /v1/skills/{name} to read it. System skills carry an `upstream` object with the version they are based on, whether they were edited, and whether a newer Notra version exists; it is null for custom skills.",
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
  description:
    "Returns one skill with its full content. For system skills, `upstream` reports the base version, whether the copy was edited, and whether an update is available.",
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
    "Updates the name, description, or content of a skill. System skills can be edited and renamed; a renamed copy keeps following the system skill named in `upstream.systemName`, and an edited one is reported as modified in `upstream`.",
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
    403: errorResponse("Forbidden"),
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

const upgradeSkillRoute = createRoute({
  method: "post",
  path: "/skills/{name}/upgrade",
  tags: ["Skills"],
  operationId: "upgradeSkill",
  summary: "Upgrade a system skill",
  description:
    'Rebases the organization\'s copy of a system skill onto the latest published version. "discard" replaces your text with the latest version (this is also "reset to default"), "keep" leaves your text untouched and only clears the update flag, and "merge" stores the content you resolved. Only system skills can be upgraded.',
  request: {
    params: skillParamsSchema,
    body: {
      required: true,
      content: { "application/json": { schema: upgradeSkillRequestSchema } },
    },
  },
  responses: {
    200: {
      description: "Skill upgraded successfully",
      content: { "application/json": { schema: upgradeSkillResponseSchema } },
    },
    400: errorResponse(
      'Invalid path params or request body, including a "merge" without content'
    ),
    401: errorResponse("Missing or invalid API key"),
    403: errorResponse("Forbidden"),
    404: errorResponse(SKILL_NOT_FOUND_ERROR),
    409: errorResponse(SKILL_NOT_SYSTEM_ERROR),
    503: errorResponse("Authentication service unavailable"),
  },
});

const listSystemSkillsRoute = createRoute({
  method: "get",
  path: "/system-skills",
  tags: ["Skills"],
  operationId: "listSystemSkills",
  summary: "List system skills",
  description:
    "Returns the latest published version of every Notra system skill. This registry is global, not organization-specific. Content is omitted; use GET /v1/system-skills/{name} to read it.",
  responses: {
    200: {
      description: "System skills fetched successfully",
      content: {
        "application/json": { schema: listSystemSkillsResponseSchema },
      },
    },
    401: errorResponse("Missing or invalid API key"),
    403: errorResponse("Forbidden"),
    503: errorResponse("Authentication service unavailable"),
  },
});

const getSystemSkillRoute = createRoute({
  method: "get",
  path: "/system-skills/{name}",
  tags: ["Skills"],
  operationId: "getSystemSkill",
  summary: "Get the latest version of a system skill",
  description:
    "Returns the newest published version of a system skill, with its full content. Compare it against your organization's copy from GET /v1/skills/{name}.",
  request: { params: skillParamsSchema },
  responses: {
    200: {
      description: "System skill fetched successfully",
      content: { "application/json": { schema: systemSkillResponseSchema } },
    },
    400: errorResponse("Invalid path params"),
    401: errorResponse("Missing or invalid API key"),
    403: errorResponse("Forbidden"),
    404: errorResponse(SYSTEM_SKILL_NOT_FOUND_ERROR),
    503: errorResponse("Authentication service unavailable"),
  },
});

const getSystemSkillVersionRoute = createRoute({
  method: "get",
  path: "/system-skills/{name}/versions/{version}",
  tags: ["Skills"],
  operationId: "getSystemSkillVersion",
  summary: "Get a specific system skill version",
  description:
    "Returns one published version of a system skill. Fetch the version your copy is based on (`upstream.baseVersion`) to run a three-way merge.",
  request: { params: systemSkillVersionParamsSchema },
  responses: {
    200: {
      description: "System skill version fetched successfully",
      content: { "application/json": { schema: systemSkillResponseSchema } },
    },
    400: errorResponse("Invalid path params"),
    401: errorResponse("Missing or invalid API key"),
    403: errorResponse("Forbidden"),
    404: errorResponse(SYSTEM_SKILL_VERSION_NOT_FOUND_ERROR),
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
    if (result.failure._tag === "SkillDuplicateError") {
      return c.json(
        { error: `A skill named "${result.failure.name}" already exists` },
        409
      );
    }
    throw result.failure;
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

skillsRoutes.openapi(upgradeSkillRoute, async (c) => {
  const organizationId = getOrganizationId(c);
  if (!organizationId) {
    return c.json({ error: ORGANIZATION_SCOPED_API_KEY_ERROR }, 403);
  }

  const { name } = c.req.valid("param");
  const body = c.req.valid("json");
  const result = await runSkillProgram(
    upgradeSkill({ db: c.get("db"), organizationId, name, body })
  );
  if (result._tag === "Failure") {
    if (result.failure._tag === "SkillNotFoundError") {
      return c.json({ error: SKILL_NOT_FOUND_ERROR }, 404);
    }
    if (result.failure._tag === "SystemSkillVersionNotFoundError") {
      return c.json({ error: SYSTEM_SKILL_NOT_FOUND_ERROR }, 404);
    }
    if (result.failure._tag === "SkillUpgradeInputError") {
      return c.json({ error: result.failure.reason }, 400);
    }
    return c.json({ error: SKILL_NOT_SYSTEM_ERROR }, 409);
  }

  return c.json(result.success, 200);
});

skillsRoutes.openapi(listSystemSkillsRoute, async (c) => {
  const result = await runSkillProgram(listSystemSkills({ db: c.get("db") }));
  if (result._tag === "Failure") {
    throw result.failure;
  }

  return c.json(
    { systemSkills: result.success.map(serializeSystemSkill) },
    200
  );
});

skillsRoutes.openapi(getSystemSkillRoute, async (c) => {
  const { name } = c.req.valid("param");
  const result = await runSkillProgram(
    getSystemSkill({ db: c.get("db"), name })
  );
  if (result._tag === "Failure") {
    return c.json({ error: SYSTEM_SKILL_NOT_FOUND_ERROR }, 404);
  }

  return c.json(
    { systemSkill: serializeSystemSkillDetail(result.success) },
    200
  );
});

skillsRoutes.openapi(getSystemSkillVersionRoute, async (c) => {
  const { name, version } = c.req.valid("param");
  const result = await runSkillProgram(
    getSystemSkillVersion({ db: c.get("db"), name, version })
  );
  if (result._tag === "Failure") {
    return c.json({ error: SYSTEM_SKILL_VERSION_NOT_FOUND_ERROR }, 404);
  }

  return c.json(
    { systemSkill: serializeSystemSkillDetail(result.success) },
    200
  );
});
