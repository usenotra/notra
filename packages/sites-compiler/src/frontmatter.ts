import {
  blogFrontmatterSchema,
  changelogFrontmatterSchema,
} from "@notra/sites-core/schemas/site-config";
import type { SiteDiagnostic } from "@notra/sites-core/types/build";
import { parse as parseYaml } from "yaml";

import { FRONTMATTER_BLOCK } from "./constants/frontmatter";
import type { SiteEntry } from "./types/entries";
import type { ParsedFrontmatter } from "./types/frontmatter";
import { errorSummary } from "./utils/errors";

function frontmatterError(
  path: string,
  code: string,
  message: string
): SiteDiagnostic {
  return { severity: "error", file: path, line: 1, code, message };
}

export function parseEntryFrontmatter(
  path: string,
  area: SiteEntry["area"],
  source: string
): ParsedFrontmatter {
  const yaml = FRONTMATTER_BLOCK.exec(source)?.[1];
  if (yaml === undefined) {
    return {
      data: null,
      diagnostics: [
        frontmatterError(
          path,
          "frontmatter_missing",
          "Missing frontmatter. Start the file with ---, a title and a date, then ---."
        ),
      ],
    };
  }
  let raw: unknown;
  try {
    raw = parseYaml(yaml) ?? {};
  } catch (error) {
    return {
      data: null,
      diagnostics: [
        frontmatterError(
          path,
          "frontmatter_yaml",
          `Frontmatter is not valid YAML: ${errorSummary(error)}`
        ),
      ],
    };
  }
  const schema =
    area === "blog" ? blogFrontmatterSchema : changelogFrontmatterSchema;
  const parsed = schema.safeParse(raw);
  if (parsed.success) {
    return { data: parsed.data, diagnostics: [] };
  }
  return {
    data: null,
    diagnostics: parsed.error.issues.map((issue) =>
      frontmatterError(
        path,
        "frontmatter_invalid",
        `Frontmatter ${issue.path.join(".") || "value"}: ${issue.message}`
      )
    ),
  };
}
