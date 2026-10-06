import type {
  blogFrontmatterSchema,
  changelogFrontmatterSchema,
} from "@notra/sites-core/schemas/site-config";
import type { SiteDiagnostic } from "@notra/sites-core/types/build";
import type { z } from "zod";

export type EntryFrontmatter =
  | z.infer<typeof blogFrontmatterSchema>
  | z.infer<typeof changelogFrontmatterSchema>;

export interface ParsedFrontmatter {
  data: EntryFrontmatter | null;
  diagnostics: SiteDiagnostic[];
}
