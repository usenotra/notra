import {
  SITE_CHROME_FILES,
  SITE_SLOT_NAMES,
  SITE_SLOTS_DIR,
} from "@notra/sites-core/constants/site-layout";
import { SITE_CONFIG_FILENAME } from "@notra/sites-core/constants/sites";
import { siteConfigSchema } from "@notra/sites-core/schemas/site-config";
import {
  siteBlogSchema,
  siteChangelogSchema,
} from "@notra/sites-core/schemas/site-layout";
import type { SiteDiagnostic } from "@notra/sites-core/types/build";
import type { SiteConfig } from "@notra/sites-core/types/site-config";
import { isCustomScriptPath } from "@notra/sites-core/utils/custom-scripts";
import { Parser } from "acorn";

import {
  ENTRY_FILE,
  ENTRY_SLUG,
  MDX_FILE,
  SCRIPT_FILE,
  TEXT_SOURCE_FILE,
} from "./constants/validate";
import { parseEntryFrontmatter } from "./frontmatter";
import { analyzeJsxSnippet } from "./jsx";
import { analyzeMdxFile } from "./mdx";
import type { SiteEntry } from "./types/entries";
import type { MdxAnalysis } from "./types/mdx";
import type {
  EntryCandidate,
  ParsedSiteConfig,
  SiteValidationInput,
  SiteValidationResult,
  SubstitutedSources,
} from "./types/validate";
import {
  featuredSlugWarnings,
  unknownConfigKeyWarnings,
} from "./utils/config-checks";
import { hasErrors } from "./utils/diagnostics";
import { acornSyntaxError } from "./utils/errors";
import { importCycleDiagnostics } from "./utils/import-cycles";
import { blockedMarkdownHtml } from "./utils/markdown-html";
import { offsetToLineColumn } from "./utils/paths";
import { substituteSettingText, substituteVariables } from "./utils/variables";

export function isTextSourceFile(path: string): boolean {
  return TEXT_SOURCE_FILE.test(path);
}

function entryCandidate(path: string): EntryCandidate | null {
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

function takesVariables(path: string): boolean {
  return (
    entryCandidate(path) !== null ||
    (SITE_CHROME_FILES as readonly string[]).includes(path) ||
    (path.startsWith(`${SITE_SLOTS_DIR}/`) && MDX_FILE.test(path))
  );
}

function validateSlotFile(path: string): SiteDiagnostic[] {
  if (!path.startsWith(`${SITE_SLOTS_DIR}/`)) {
    return [];
  }
  const name = path.slice(SITE_SLOTS_DIR.length + 1);
  const slotName = name.replace(/\.mdx$/, "");
  if (
    name.endsWith(".mdx") &&
    (SITE_SLOT_NAMES as readonly string[]).includes(slotName)
  ) {
    return [];
  }
  return [
    {
      severity: "error",
      file: path,
      code: "slot_unknown",
      message: `Unknown slot "${name}". Files in ${SITE_SLOTS_DIR}/ must be one of: ${SITE_SLOT_NAMES.map((slot) => `${slot}.mdx`).join(", ")}`,
    },
  ];
}

function substituteSettingVariables(config: SiteConfig): {
  config: SiteConfig;
  diagnostics: SiteDiagnostic[];
} {
  const diagnostics: SiteDiagnostic[] = [];
  const fill = (text: string | undefined, setting: string) => {
    if (text === undefined || !text.includes("{{")) {
      return text;
    }
    const result = substituteSettingText(text, config.variables);
    for (const name of result.unknown) {
      diagnostics.push({
        severity: "warning",
        file: SITE_CONFIG_FILENAME,
        code: "variable_unknown",
        message: `${setting}: unknown variable {{ ${name} }}. Add "${name}" to variables. It is shown as written.`,
      });
    }
    return result.text;
  };
  return {
    config: {
      ...config,
      description: fill(config.description, "description"),
      banner: config.banner
        ? {
            ...config.banner,
            content:
              fill(config.banner.content, "banner.content") ??
              config.banner.content,
          }
        : undefined,
      blog: config.blog
        ? {
            ...config.blog,
            title: fill(config.blog.title, "blog.title"),
            description: fill(config.blog.description, "blog.description"),
          }
        : undefined,
      changelog: config.changelog
        ? {
            ...config.changelog,
            title: fill(config.changelog.title, "changelog.title"),
            description: fill(
              config.changelog.description,
              "changelog.description"
            ),
          }
        : undefined,
    },
    diagnostics,
  };
}

function configError(code: string, message: string): SiteDiagnostic {
  return { severity: "error", file: SITE_CONFIG_FILENAME, code, message };
}

function parseSiteConfig(raw: string | null | undefined): ParsedSiteConfig {
  if (raw === undefined || raw === null) {
    return {
      config: null,
      diagnostics: [
        configError(
          "config_missing",
          `Add a ${SITE_CONFIG_FILENAME} at the site root, e.g. { "name": "Acme" }`
        ),
      ],
    };
  }
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (error) {
    return {
      config: null,
      diagnostics: [
        configError(
          "config_json",
          `${SITE_CONFIG_FILENAME} is not valid JSON: ${(error as Error).message}`
        ),
      ],
    };
  }
  const diagnostics = unknownConfigKeyWarnings(json);
  const parsed = siteConfigSchema.safeParse(json);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      diagnostics.push(
        configError(
          "config_invalid",
          `${issue.path.join(".") || "config"}: ${issue.message}`
        )
      );
    }
    return { config: null, diagnostics };
  }
  const settings = substituteSettingVariables(parsed.data);
  diagnostics.push(...settings.diagnostics);
  return {
    config: {
      ...settings.config,
      blog: settings.config.blog ?? siteBlogSchema.parse({}),
      changelog: settings.config.changelog ?? siteChangelogSchema.parse({}),
    },
    diagnostics,
  };
}

function applyVariables(
  files: ReadonlyMap<string, string | null>,
  variables: Readonly<Record<string, string>>
): SubstitutedSources {
  const sources = new Map(files);
  const diagnostics: SiteDiagnostic[] = [];
  for (const [path, content] of files) {
    if (content === null || !takesVariables(path) || !content.includes("{{")) {
      continue;
    }
    const substitution = substituteVariables(content, variables);
    sources.set(path, substitution.text);
    for (const unknown of substitution.unknown) {
      diagnostics.push({
        severity: "warning",
        file: path,
        ...offsetToLineColumn(content, unknown.offset),
        code: "variable_unknown",
        message: `Unknown variable {{ ${unknown.name} }}. Add "${unknown.name}" to variables in ${SITE_CONFIG_FILENAME}. It is shown as written.`,
      });
    }
  }
  return { sources, diagnostics };
}

function validateCustomScript(path: string, source: string): SiteDiagnostic[] {
  try {
    Parser.parse(source, { ecmaVersion: "latest", sourceType: "script" });
    return [];
  } catch (error) {
    const syntax = acornSyntaxError(error);
    return [
      {
        severity: "error",
        file: path,
        ...offsetToLineColumn(source, syntax.offset),
        code: "script_syntax",
        message: `Syntax error: ${syntax.message}. Custom scripts are plain browser JavaScript, not modules.`,
      },
    ];
  }
}

export function validateSite(input: SiteValidationInput): SiteValidationResult {
  const outputs = new Map<string, string>();
  const paths = new Set(
    [...input.files.keys()].filter((path) => !isCustomScriptPath(path))
  );

  const { config, diagnostics } = parseSiteConfig(
    input.files.get(SITE_CONFIG_FILENAME)
  );

  const { sources, diagnostics: variableDiagnostics } = config
    ? applyVariables(input.files, config.variables)
    : { sources: new Map(input.files), diagnostics: [] };
  diagnostics.push(...variableDiagnostics);
  for (const path of input.files.keys()) {
    diagnostics.push(...validateSlotFile(path));
  }

  const componentExports = new Map<string, readonly string[]>();
  for (const [path, content] of input.files) {
    if (!SCRIPT_FILE.test(path) || content === null) {
      continue;
    }
    if (isCustomScriptPath(path)) {
      diagnostics.push(...validateCustomScript(path, content));
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
    MDX_FILE.test(path)
  );
  const analyses = new Map<string, MdxAnalysis>();
  const analyze = (path: string, isEntry: boolean) => {
    analyses.set(
      path,
      analyzeMdxFile(path, sources.get(path) ?? "", {
        files: paths,
        componentExports,
        isEntry,
      })
    );
  };
  for (const path of mdxPaths) {
    analyze(path, entryCandidate(path) !== null);
  }

  const importedPaths = new Set(
    [...analyses.values()].flatMap((analysis) => analysis.imports)
  );
  for (const path of mdxPaths) {
    if (importedPaths.has(path) && entryCandidate(path) !== null) {
      analyze(path, false);
    }
  }

  diagnostics.push(
    ...importCycleDiagnostics(
      mdxPaths,
      (path) => analyses.get(path)?.imports ?? []
    )
  );

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
    if (!ENTRY_SLUG.test(candidate.slug)) {
      diagnostics.push({
        severity: "error",
        file: path,
        code: "slug_invalid",
        message: `The URL "${candidate.slug}" comes from the file name. Use lowercase letters, digits and dashes.`,
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
    diagnostics.push(
      ...parseEntryFrontmatter(path, candidate.area, content).diagnostics
    );
    if (candidate.format === "md") {
      diagnostics.push(...blockedMarkdownHtml(path, content));
      const substituted = sources.get(path);
      if (typeof substituted === "string" && substituted !== content) {
        outputs.set(path, substituted);
      }
    }
    entries.push({
      area: candidate.area,
      slug: candidate.slug,
      path,
      format: candidate.format,
    });
  }

  if (config) {
    if (entries.length === 0 && unreadEntries === 0) {
      diagnostics.push({
        severity: "warning",
        file: null,
        code: "no_entries",
        message: "No posts yet. Add .mdx files to blog/ or changelog/.",
      });
    }
    diagnostics.push(...featuredSlugWarnings(config, entries));
  }
  entries.sort((a, b) => a.path.localeCompare(b.path));
  return {
    diagnostics,
    config,
    entries,
    outputs,
    ok: !hasErrors(diagnostics),
  };
}
