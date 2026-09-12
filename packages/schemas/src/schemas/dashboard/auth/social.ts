import "zod/compile";
import { returnToSchema } from "@notra/schemas/dashboard/auth/return-to";
// biome-ignore lint/performance/noNamespaceImport: Zod recommended way to import
import * as z from "zod";

const socialAuthProviderSchema = z.enum(["google", "github"]);

export const startSocialSignInInputSchema = z.object({
  provider: socialAuthProviderSchema,
  returnTo: returnToSchema,
});
