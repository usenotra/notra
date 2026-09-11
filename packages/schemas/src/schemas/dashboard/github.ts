import "zod/compile";
import { organizationIdInputSchema } from "@notra/schemas/dashboard/auth/organization";
import { githubPersonalAccessTokenSchema } from "@notra/schemas/dashboard/integrations";
// biome-ignore lint/performance/noNamespaceImport: Zod recommended way of importing
import * as z from "zod";

export const probeRepositoryInputSchema = z.object({
  owner: z.string().trim().min(1, "owner is required"),
  repo: z.string().trim().min(1, "repo is required"),
  token: githubPersonalAccessTokenSchema.optional(),
});

export const saveGitHubAppRepositoriesInputSchema =
  organizationIdInputSchema.extend({
    repositoryIds: z.array(z.string().min(1)).default([]),
    preserveExisting: z.boolean().default(false),
  });

export const disconnectGitHubAppInputSchema = organizationIdInputSchema.extend({
  accountId: z.string().min(1).optional(),
});

export const prepareInstallUrlInputSchema = organizationIdInputSchema.extend({
  callbackPath: z.string().trim().min(1, "Callback path is required"),
});

export type PrepareInstallUrlInput = z.infer<
  typeof prepareInstallUrlInputSchema
>;
