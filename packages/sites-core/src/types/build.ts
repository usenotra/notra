import type {
  siteBuildRequestSchema,
  siteBuildResultSchema,
  siteDiagnosticSchema,
} from "@notra/sites-core/schemas/build";
import type { z } from "zod";

export type SiteDiagnostic = z.infer<typeof siteDiagnosticSchema>;
export type SiteBuildRequest = z.infer<typeof siteBuildRequestSchema>;
export type SiteBuildRequestInput = z.input<typeof siteBuildRequestSchema>;
export type SiteBuildResult = z.infer<typeof siteBuildResultSchema>;
