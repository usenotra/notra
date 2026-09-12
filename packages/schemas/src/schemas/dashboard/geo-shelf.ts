import "zod/compile";
import { geoOrganizationInputSchema } from "@notra/geo-core/schemas/geo";
import { z } from "zod";

import {
  GEO_SHELF_FETCH_STATUSES,
  GEO_SHELF_NOTES_MAX_LENGTH,
  GEO_SHELF_OPPORTUNITY_STATUSES,
  GEO_SHELF_ORIGINS,
  GEO_SHELF_OWNERSHIPS,
  GEO_SHELF_PLACEMENT_EVIDENCES,
  GEO_SHELF_PLACEMENT_STATUSES,
  GEO_SHELF_PRIORITIES,
  GEO_SHELF_SOURCE_KINDS,
  GEO_SHELF_TITLE_MAX_LENGTH,
  GEO_SHELF_URL_INVALID_MESSAGE,
  GEO_SHELF_URL_MAX_LENGTH,
  GEO_SHELF_URL_PROTOCOL_PATTERN,
} from "../../constants/dashboard/geo-shelf";
import { isAllowedShelfUrl } from "../../utils/dashboard/shelf-url";

export const geoShelfUrlSchema = z
  .url({
    protocol: GEO_SHELF_URL_PROTOCOL_PATTERN,
    hostname: z.regexes.domain,
    error: GEO_SHELF_URL_INVALID_MESSAGE,
  })
  .max(GEO_SHELF_URL_MAX_LENGTH)
  .refine(isAllowedShelfUrl, { error: GEO_SHELF_URL_INVALID_MESSAGE });

export const geoShelfSourceKindSchema = z.enum(GEO_SHELF_SOURCE_KINDS);
export const geoShelfOwnershipSchema = z.enum(GEO_SHELF_OWNERSHIPS);
export const geoShelfOriginSchema = z.enum(GEO_SHELF_ORIGINS);
export const geoShelfFetchStatusSchema = z.enum(GEO_SHELF_FETCH_STATUSES);
export const geoShelfPlacementStatusSchema = z.enum(
  GEO_SHELF_PLACEMENT_STATUSES
);
export const geoShelfPlacementEvidenceSchema = z.enum(
  GEO_SHELF_PLACEMENT_EVIDENCES
);
export const geoShelfOpportunityStatusSchema = z.enum(
  GEO_SHELF_OPPORTUNITY_STATUSES
);
export const geoShelfPrioritySchema = z.enum(GEO_SHELF_PRIORITIES);

export const geoShelfMemberSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  name: z.string(),
  email: z.string(),
  image: z.string().nullable(),
  role: z.string(),
});

export const geoShelfPlacementSchema = z.object({
  competitorId: z.string().min(1).nullable(),
  brandName: z.string().min(1),
  brandDomain: z.string().nullable(),
  status: geoShelfPlacementStatusSchema,
  position: z.number().int().positive().nullable(),
  hasLink: z.boolean(),
  evidence: geoShelfPlacementEvidenceSchema,
  excerpt: z.string().nullable(),
  checkedAt: z.iso.datetime(),
});

export const geoShelfCitationSummarySchema = z.object({
  windowCount: z.number().int().nonnegative(),
  totalCount: z.number().int().nonnegative(),
  promptCount: z.number().int().nonnegative(),
  engines: z.array(z.string().min(1)),
  firstCitedAt: z.iso.datetime().nullable(),
  lastCitedAt: z.iso.datetime().nullable(),
});

export const geoShelfOpportunityWriteSchema = z.object({
  status: geoShelfOpportunityStatusSchema,
  priority: geoShelfPrioritySchema.nullable(),
  assigneeMemberId: z.string().min(1).nullable(),
  pocMemberId: z.string().min(1).nullable(),
  notes: z.string().max(GEO_SHELF_NOTES_MAX_LENGTH).nullable(),
  dueAt: z.iso.datetime().nullable(),
});

export const geoShelfOpportunitySchema = geoShelfOpportunityWriteSchema.extend({
  id: z.string().min(1),
  createdByUserId: z.string().min(1).nullable(),
  resolvedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const geoShelfSourceSchema = z.object({
  id: z.string().min(1),
  url: z.url().max(GEO_SHELF_URL_MAX_LENGTH),
  domain: z.string().min(1),
  title: z.string().max(GEO_SHELF_TITLE_MAX_LENGTH).nullable(),
  kind: geoShelfSourceKindSchema,
  ownership: geoShelfOwnershipSchema,
  origin: geoShelfOriginSchema,
  fetchStatus: geoShelfFetchStatusSchema,
  lastFetchedAt: z.iso.datetime().nullable(),
  citations: geoShelfCitationSummarySchema,
  placements: z.array(geoShelfPlacementSchema),
  opportunity: geoShelfOpportunitySchema.nullable(),
  createdByUserId: z.string().min(1).nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const geoShelfListResponseSchema = z.object({
  sources: z.array(geoShelfSourceSchema),
  hasScanData: z.boolean(),
  ownBrandName: z.string(),
  isSampleData: z.boolean(),
});

export const geoShelfMembersResponseSchema = z.object({
  members: z.array(geoShelfMemberSchema),
  currentMemberId: z.string().min(1).nullable(),
});

export const geoShelfListInputSchema = geoOrganizationInputSchema;

export const geoShelfPlacementWriteSchema = z.object({
  competitorId: z.string().min(1).nullable(),
  status: geoShelfPlacementStatusSchema,
});

export const geoShelfCreateInputSchema = geoOrganizationInputSchema.extend({
  url: geoShelfUrlSchema,
  title: z.string().trim().max(GEO_SHELF_TITLE_MAX_LENGTH).nullable(),
  kind: geoShelfSourceKindSchema,
  placements: z.array(geoShelfPlacementWriteSchema),
  opportunity: geoShelfOpportunityWriteSchema.nullable(),
});

export const geoShelfUpdateInputSchema = geoOrganizationInputSchema.extend({
  sourceId: z.string().min(1),
  title: z
    .string()
    .trim()
    .max(GEO_SHELF_TITLE_MAX_LENGTH)
    .nullable()
    .optional(),
  kind: geoShelfSourceKindSchema.optional(),
  placements: z.array(geoShelfPlacementWriteSchema).optional(),
  opportunity: geoShelfOpportunityWriteSchema.partial().nullable().optional(),
});

export const geoShelfMutationResponseSchema = z.object({
  source: geoShelfSourceSchema,
});

export const geoShelfPreviewInputSchema = geoOrganizationInputSchema.extend({
  url: geoShelfUrlSchema,
});

export const geoShelfPreviewResponseSchema = z.object({
  url: z.url(),
  finalUrl: z.url().nullable(),
  domain: z.string().min(1),
  title: z.string().max(GEO_SHELF_TITLE_MAX_LENGTH).nullable(),
  description: z.string().nullable(),
  available: z.boolean(),
});
