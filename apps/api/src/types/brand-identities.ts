import type { BrandAnalysisJob } from "@notra/ai/jobs/brand-analysis";
import type { brandSettings } from "@notra/db/schema";
import type {
  createBrandIdentityRequestSchema,
  patchBrandIdentityRequestSchema,
} from "@notra/schemas/api/content";
import type { Redis } from "@upstash/redis";
import type { z } from "zod";

import type {
  BrandAnalysisJobNotFoundError,
  BrandAnalysisQueueFailedError,
  BrandIdentityCreateFailedError,
  BrandIdentityDefaultDeleteError,
  BrandIdentityNameDuplicateError,
  BrandIdentityNotFoundError,
} from "../errors/brand-identities";
import type { DbClient } from "./db";

export type BrandIdentityRow = Pick<
  typeof brandSettings.$inferSelect,
  | "id"
  | "name"
  | "isDefault"
  | "websiteUrl"
  | "companyName"
  | "companyDescription"
  | "toneProfile"
  | "customTone"
  | "customInstructions"
  | "audience"
  | "language"
  | "createdAt"
  | "updatedAt"
>;

export type BrandIdentityDomainError =
  | BrandIdentityNotFoundError
  | BrandIdentityNameDuplicateError
  | BrandIdentityCreateFailedError
  | BrandIdentityDefaultDeleteError
  | BrandAnalysisJobNotFoundError
  | BrandAnalysisQueueFailedError;

interface BrandIdentityProgramInput {
  db: DbClient;
  organizationId: string;
}

export interface ListBrandIdentitiesProgramInput extends BrandIdentityProgramInput {}

export interface ListBrandIdentitiesProgramSuccess {
  brandIdentities: BrandIdentityRow[];
}

export interface CreateBrandIdentityProgramInput extends BrandIdentityProgramInput {
  body: z.infer<typeof createBrandIdentityRequestSchema>;
  redis: Redis;
  runtimeEnv: {
    WORKFLOW_BASE_URL?: string;
  };
}

export interface CreateBrandIdentityProgramSuccess {
  job: BrandAnalysisJob;
}

export interface GetBrandAnalysisJobProgramInput extends BrandIdentityProgramInput {
  jobId: string;
  redis: Redis;
}

export interface GetBrandAnalysisJobProgramSuccess {
  job: BrandAnalysisJob;
}

export interface GetBrandIdentityProgramInput extends BrandIdentityProgramInput {
  brandIdentityId: string;
}

export interface GetBrandIdentityProgramSuccess {
  brandIdentity: BrandIdentityRow | null;
}

export interface PatchBrandIdentityProgramInput extends BrandIdentityProgramInput {
  brandIdentityId: string;
  body: z.infer<typeof patchBrandIdentityRequestSchema>;
}

export interface PatchBrandIdentityProgramSuccess {
  brandIdentity: BrandIdentityRow;
}

export interface DeleteBrandIdentityProgramInput extends BrandIdentityProgramInput {
  brandIdentityId: string;
  runtimeEnv: {
    QSTASH_TOKEN?: string;
    WORKFLOW_BASE_URL?: string;
  };
}

export interface DeleteBrandIdentityProgramSuccess {
  id: string;
  disabledSchedules: { id: string; name: string | null }[];
  disabledEvents: { id: string; name: string | null }[];
}
