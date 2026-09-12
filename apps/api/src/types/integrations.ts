import type { createDb } from "@notra/db/drizzle";
import type {
  createGitHubIntegrationRequestSchema,
  getIntegrationsResponseSchema,
} from "@notra/schemas/api/content";
import type { z } from "zod";

import type {
  GitHubAccessError,
  IntegrationCreateError,
  IntegrationCreateFailedError,
  IntegrationDuplicateError,
  IntegrationNotFoundError,
  IntegrationUnavailableError,
} from "../errors/integrations";
type DbClient = ReturnType<typeof createDb>;

export type IntegrationDomainError =
  | IntegrationNotFoundError
  | IntegrationDuplicateError
  | GitHubAccessError
  | IntegrationUnavailableError
  | IntegrationCreateFailedError
  | IntegrationCreateError;

interface IntegrationProgramInput {
  db: DbClient;
  organizationId: string;
}

export interface ListIntegrationsProgramInput extends IntegrationProgramInput {}

export interface ListIntegrationsProgramSuccess {
  github: z.infer<typeof getIntegrationsResponseSchema>["github"];
  linear: z.infer<typeof getIntegrationsResponseSchema>["linear"];
}

export interface AssertNoGitHubIntegrationDuplicateInput extends IntegrationProgramInput {
  owner: string;
  repo: string;
}

export interface CreateGitHubIntegrationProgramInput extends IntegrationProgramInput {
  body: z.infer<typeof createGitHubIntegrationRequestSchema>;
  runtimeEnv: {
    INTEGRATION_ENCRYPTION_KEY?: string;
  };
}

export interface CreateGitHubIntegrationProgramSuccess {
  id: string;
  displayName: string;
  owner: string | null;
  repo: string | null;
  defaultBranch: string | null;
}

export interface DeleteIntegrationProgramInput extends IntegrationProgramInput {
  integrationId: string;
  runtimeEnv: {
    QSTASH_TOKEN?: string;
    WORKFLOW_BASE_URL?: string;
  };
}

export interface DeleteIntegrationProgramSuccess {
  id: string;
  disabledSchedules: { id: string; name: string | null }[];
  disabledEvents: { id: string; name: string | null }[];
}
