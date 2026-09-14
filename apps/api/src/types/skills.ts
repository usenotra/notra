import type { createDb } from "@notra/db/drizzle";
import type {
  createSkillRequestSchema,
  patchSkillRequestSchema,
  upgradeSkillRequestSchema,
} from "@notra/schemas/api/skills";
import type { z } from "zod";

import type {
  SkillDuplicateError,
  SkillNotFoundError,
  SkillNotSystemError,
  SkillUpgradeInputError,
  SystemSkillDeleteError,
  SystemSkillVersionNotFoundError,
} from "../errors/skills";

export type SkillDomainError =
  | SkillDuplicateError
  | SkillNotFoundError
  | SkillNotSystemError
  | SkillUpgradeInputError
  | SystemSkillDeleteError
  | SystemSkillVersionNotFoundError;

/** The global system-skill registry is org-independent. */
export interface SystemSkillProgramInput {
  db: ReturnType<typeof createDb>;
}

export interface NamedSystemSkillProgramInput extends SystemSkillProgramInput {
  name: string;
}

export interface SystemSkillVersionProgramInput extends NamedSystemSkillProgramInput {
  version: number;
}

export interface SkillProgramInput extends SystemSkillProgramInput {
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

export interface UpgradeSkillProgramInput extends NamedSkillProgramInput {
  body: z.infer<typeof upgradeSkillRequestSchema>;
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
