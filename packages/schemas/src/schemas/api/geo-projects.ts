import "zod/compile";
import { z } from "@hono/zod-openapi";

import { organizationResponseSchema } from "./content";
import { createGeoShortTextSchema } from "./geo-fields";
import { resourceIdSchema } from "./ids";

const projectSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    brandSettingsId: z.string(),
    createdAt: z.string(),
  })
  .openapi("GeoProject");

export const listProjectsResponseSchema = z
  .object({
    projects: z.array(projectSchema),
    organization: organizationResponseSchema,
  })
  .openapi("ListGeoProjectsResponse");

export const projectResponseSchema = z
  .object({
    project: projectSchema,
    organization: organizationResponseSchema,
  })
  .openapi("GeoProjectResponse");

export const createProjectRequestSchema = z
  .object({
    name: createGeoShortTextSchema(),
    brandSettingsId: resourceIdSchema("brandSettingsId").optional().openapi({
      description:
        "Brand identity to link. Defaults to the organization's default identity.",
    }),
  })
  .openapi("CreateGeoProjectRequest");

export const patchProjectRequestSchema = z
  .object({
    name: createGeoShortTextSchema().optional(),
    brandSettingsId: resourceIdSchema("brandSettingsId").optional(),
  })
  .refine(
    (value) => value.name !== undefined || value.brandSettingsId !== undefined,
    { message: "Provide at least one field to update" }
  )
  .openapi("PatchGeoProjectRequest");

export const deleteProjectResponseSchema = z
  .object({
    id: z.string(),
    organization: organizationResponseSchema,
  })
  .openapi("DeleteGeoProjectResponse");
