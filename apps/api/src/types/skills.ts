import type { createDb } from "@notra/db/drizzle";
import type {
  createSkillRequestSchema,
  patchSkillRequestSchema,
} from "@notra/schemas/api/skills";
import type { z } from "zod";

import type {
  SkillDuplicateError,
  SkillNotFoundError,
  SystemSkillDeleteError,
  SystemSkillRenameError,
} from "../errors/skills";

export type SkillDomainError =
  | SkillDuplicateError
  | SkillNotFoundError
  | SystemSkillDeleteError
  | SystemSkillRenameError;

export interface SkillProgramInput {
  db: ReturnType<typeof createDb>;
  organizationId: string;
}

export interface NamedSkillProgramInput extends SkillProgramInput {
  name: string;
}

export interface CreateSkillProgramInput extends SkillProgramInput {
  body: z.infer<typeof createSkillRequestSchema>;
}

export interface PatchSkillProgramInput extends NamedSkillProgramInput {
  body: z.infer<typeof patchSkillRequestSchema>;
}

export interface SkillTimestamps {
  createdAt: Date;
  updatedAt: Date;
}

export interface SkillUpdatedAt {
  updatedAt: Date;
}

export type SerializedSkill<T extends SkillTimestamps> = Omit<
  T,
  "createdAt" | "updatedAt"
> & {
  createdAt: string;
  updatedAt: string;
};

export type SerializedSkillSummary<T extends SkillUpdatedAt> = Omit<
  T,
  "updatedAt"
> & {
  updatedAt: string;
};
