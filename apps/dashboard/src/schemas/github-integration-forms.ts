import {
  addGitHubIntegrationFormSchema,
  githubPersonalAccessTokenSchema,
} from "@notra/schemas/dashboard/integrations";
import * as z from "zod";

import type { IntegrationsSharedTranslator } from "@/types/integrations";
import type { GitHubFormsTranslator } from "@/types/integrations/github";

const GITHUB_TOKEN_MAX_LENGTH = 255;
const REPOSITORY_FULL_NAME_REGEX = /^[^/]+\/[^/]+$/;

export function createGitHubPersonalAccessTokenSchema(
  t: GitHubFormsTranslator
) {
  return z
    .string()
    .trim()
    .min(1, t("tokenRequired"))
    .max(GITHUB_TOKEN_MAX_LENGTH, t("tokenTooLong"))
    .refine(
      (value) => githubPersonalAccessTokenSchema.safeParse(value).success,
      t("tokenInvalid")
    );
}

export function createAddGitHubIntegrationFormSchema(t: GitHubFormsTranslator) {
  return z.object({
    repoUrl: z
      .string()
      .min(1, t("repoUrlRequired"))
      .refine(
        (value) =>
          addGitHubIntegrationFormSchema.shape.repoUrl.safeParse(value).success,
        t("repoUrlInvalid")
      ),
    branch: z.string().optional().nullable(),
    token: z.preprocess((value) => {
      if (typeof value !== "string") {
        return value;
      }

      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    }, createGitHubPersonalAccessTokenSchema(t).optional().nullable()),
  });
}

export function createEditGitHubIntegrationFormSchema(
  t: GitHubFormsTranslator,
  tShared: IntegrationsSharedTranslator
) {
  return z.object({
    displayName: z.string().min(1, tShared("displayNameIsRequired")),
    enabled: z.boolean(),
    owner: z.string().trim().min(1, t("ownerRequired")),
    repo: z.string().trim().min(1, t("repoNameRequired")),
    branch: z.string().optional().nullable(),
  });
}

export function createAddRepositoryFormSchema(t: GitHubFormsTranslator) {
  return z.object({
    repository: z
      .string()
      .min(1, t("repositoryRequired"))
      .regex(REPOSITORY_FULL_NAME_REGEX, t("repositoryFormatInvalid")),
  });
}

export function createEditGitHubTokenFormSchema(t: GitHubFormsTranslator) {
  return z.object({
    token: createGitHubPersonalAccessTokenSchema(t),
  });
}
