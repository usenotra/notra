import { SITE_CONFIG_FILENAME } from "@notra/sites-core/constants/sites";
import {
  blogFrontmatterSchema,
  changelogFrontmatterSchema,
  type SiteConfig,
  siteConfigSchema,
} from "@notra/sites-core/schemas/site-config";
import { parse as parseYaml } from "yaml";

import { analyzeJsxSnippet } from "./jsx";
import { analyzeMdxFile, type MdxAnalysis } from "./mdx";
import type { SiteDiagnostic, SiteEntry } from "./types/diagnostics";

const TEXT_EXTENSIONS = /\.(?:mdx?|jsx?|json|txt|css|svg)$/i;
const ENTRY_FILE = /^(blog|changelog)\/(.+)\.(mdx?)$/;
const SLUG = /^[a-z0-9][a-z0-9-]*(?:\/[a-z0-9][a-z0-9-]*)*$/;
const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

export function isTextSourceFile(path: string): boolean {
  return TEXT_EXTENSIONS.test(path);
}

export interface SiteValidationInput {
  /** Site-relative path → text content (null for binary files). */
  files: ReadonlyMap<string, string | null>;
}

export interface SiteValidationResult {
  diagnostics: SiteDiagnostic[];
  config: SiteConfig | null;
  entries: SiteEntry[];
  /** Transformed MDX/JSX sources plus generated inline modules, keyed by site path. */
  outputs: Map<string, string>;
  ok: boolean;
}

function entryCandidate(path: string): {
  area: SiteEntry["area"];
  slug: string;
  format: SiteEntry["format"];
} | null {
  const match = ENTRY_FILE.exec(path);
  if (!match) {
    return null;
  }
  const [, area, rest, format] = match;
  if (!(area && rest && format)) {
    return null;
  }
  if (rest.split("/").some((segment) => segment.startsWith("_"))) {
    return null;
  }
  const slug = rest.endsWith("/index") ? rest.slice(0, -"/index".length) : rest;
  return {
    area: area as SiteEntry["area"],
    slug,
    format: format as SiteEntry["format"],
  };
}

function validateFrontmatter(
  path: string,
  area: SiteEntry["area"],
  source: string
): SiteDiagnostic[] {
  const match = FRONTMATTER.exec(source);
  if (!match) {
    return [
      {
        severity: "error",
        file: path,
        line: 1,
        code: "frontmatter_missing",
        message:
          "Missing frontmatter. Start the file with ---, a title and a date, then ---.",
      },
    ];
  }
  let data: unknown;
  try {
    data = parseYaml(match[1] ?? "") ?? {};
  } catch (error) {
    return [
      {
        severity: "error",
        file: path,
        line: 1,
        code: "frontmatter_yaml",
        message: `Frontmatter is not valid YAML: ${(error as Error).message.split("\n")[0]}`,
      },
    ];
  }
  const schema =
    area === "blog" ? blogFrontmatterSchema : changelogFrontmatterSchema;
  const parsed = schema.safeParse(data);
  if (parsed.success) {
    return [];
  }
  return parsed.error.issues.map((issue) => ({
    severity: "error" as const,
    file: path,
    line: 1,
    code: "frontmatter_invalid",
    message: `Frontmatter ${issue.path.join(".") || "value"}: ${issue.message}`,
  }));
}

/**
 * Validates a whole site without executing any of its code and produces the
 * transformed sources the Astro build consumes. Safe to run in the control
 * plane (dashboard editor, webhook pre-check) and inside the build sandbox.
 */
export function validateSite(input: SiteValidationInput): SiteValidationResult {
  const diagnostics: SiteDiagnostic[] = [];
  const outputs = new Map<string, string>();
  const paths = new Set(input.files.keys());

  let config: SiteConfig | null = null;
  const rawConfig = input.files.get(SITE_CONFIG_FILENAME);
  if (rawConfig === undefined || rawConfig === null) {
    diagnostics.push({
      severity: "error",
      file: SITE_CONFIG_FILENAME,
      code: "config_missing",
      message: `Add a ${SITE_CONFIG_FILENAME} at the site root, e.g. { "name": "Acme" }`,
    });
  } else {
    try {
      const parsed = siteConfigSchema.safeParse(JSON.parse(rawConfig));
      if (parsed.success) {
        config = parsed.data;
      } else {
        for (const issue of parsed.error.issues) {
          diagnostics.push({
            severity: "error",
            file: SITE_CONFIG_FILENAME,
            code: "config_invalid",
            message: `${issue.path.join(".") || "config"}: ${issue.message}`,
          });
        }
      }
    } catch (error) {
      diagnostics.push({
        severity: "error",
        file: SITE_CONFIG_FILENAME,
        code: "config_json",
        message: `${SITE_CONFIG_FILENAME} is not valid JSON: ${(error as Error).message}`,
      });
    }
  }

  const componentExports = new Map<string, readonly string[]>();
  for (const [path, content] of input.files) {
    if (!/\.jsx?$/i.test(path) || content === null) {
      continue;
    }
    const analysis = analyzeJsxSnippet(path, content);
    diagnostics.push(...analysis.diagnostics);
    componentExports.set(path, analysis.exportedNames);
    if (analysis.output !== null) {
      outputs.set(path, analysis.output);
    }
  }

  const mdxPaths = [...input.files.keys()].filter((path) =>
    /\.mdx$/i.test(path)
  );
  const analyses = new Map<string, MdxAnalysis>();
  const analyze = (path: string, isEntry: boolean) => {
    const content = input.files.get(path) ?? "";
    const analysis = analyzeMdxFile(path, content, {
      files: paths,
      componentExports,
      isEntry,
    });
    analyses.set(path, analysis);
    return analysis;
  };

  for (const path of mdxPaths) {
    analyze(path, entryCandidate(path) !== null);
  }

  // A file another file imports is a snippet, even when it sits in blog/.
  const importedPaths = new Set<string>();
  for (const analysis of analyses.values()) {
    for (const imported of analysis.imports) {
      importedPaths.add(imported);
    }
  }
  for (const path of mdxPaths) {
    if (importedPaths.has(path) && entryCandidate(path) !== null) {
      analyze(path, false);
    }
  }

  // Import cycles make the MDX compiler recurse forever; catch them up front.
  const visiting = new Set<string>();
  const done = new Set<string>();
  const reportedCycles = new Set<string>();
  const walk = (path: string, trail: string[]) => {
    if (done.has(path)) {
      return;
    }
    if (visiting.has(path)) {
      const cycle = [...trail.slice(trail.indexOf(path)), path].join(" → ");
      if (!reportedCycles.has(cycle)) {
        reportedCycles.add(cycle);
        diagnostics.push({
          severity: "error",
          file: path,
          code: "import_cycle",
          message: `Import cycle: ${cycle}`,
        });
      }
      return;
    }
    visiting.add(path);
    for (const next of analyses.get(path)?.imports ?? []) {
      walk(next, [...trail, path]);
    }
    visiting.delete(path);
    done.add(path);
  };
  for (const path of mdxPaths) {
    walk(path, []);
  }

  for (const [path, analysis] of analyses) {
    diagnostics.push(...analysis.diagnostics);
    if (analysis.output !== null) {
      outputs.set(path, analysis.output);
    }
    if (analysis.inlineModule) {
      outputs.set(analysis.inlineModule.path, analysis.inlineModule.source);
    }
  }

  const entries: SiteEntry[] = [];
  const seenSlugs = new Map<string, string>();
  // The dashboard validates drafts without downloading unchanged posts (content null).
  let unreadEntries = 0;
  for (const [path, content] of input.files) {
    const candidate = entryCandidate(path);
    if (!candidate || importedPaths.has(path)) {
      continue;
    }
    if (content === null) {
      unreadEntries += 1;
      continue;
    }
    if (!SLUG.test(candidate.slug)) {
      diagnostics.push({
        severity: "error",
        file: path,
        code: "slug_invalid",
        message: `The URL "${candidate.slug}" comes from the file name; use lowercase letters, digits and dashes`,
      });
      continue;
    }
    const key = `${candidate.area}:${candidate.slug}`;
    const existing = seenSlugs.get(key);
    if (existing) {
      diagnostics.push({
        severity: "error",
        file: path,
        code: "slug_duplicate",
        message: `Same URL as ${existing}`,
      });
      continue;
    }
    seenSlugs.set(key, path);
    diagnostics.push(...validateFrontmatter(path, candidate.area, content));
    entries.push({
      area: candidate.area,
      slug: candidate.slug,
      path,
      format: candidate.format,
    });
  }

  if (config && entries.length === 0 && unreadEntries === 0) {
    diagnostics.push({
      severity: "warning",
      file: null,
      code: "no_entries",
      message: "No posts yet. Add .mdx files to blog/ or changelog/.",
    });
  }

  entries.sort((a, b) => a.path.localeCompare(b.path));
  return {
    diagnostics,
    config,
    entries,
    outputs,
    ok: !diagnostics.some((diagnostic) => diagnostic.severity === "error"),
  };
}
