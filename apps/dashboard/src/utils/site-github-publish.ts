import { SITE_CONFIG_FILENAME } from "@notra/sites-core/constants/sites";
import { slugify } from "@notra/utils/slugify";
import { fromMarkdown } from "mdast-util-from-markdown";

import {
  FRONTMATTER_BLOCK,
  FRONTMATTER_TITLE_KEY,
  FRONTMATTER_DATE_KEY,
  FRONTMATTER_AUTHOR_LINE,
  UNQUOTED_YAML_COMMENT,
  LEADING_BLANK_LINES,
  LEADING_ATX_HEADING,
  WHITESPACE_RUN,
  TRAILING_PUNCTUATION,
  SURROUNDING_SLASHES,
  SITE_IMAGE_URL,
  ELLIPSIS,
  SITE_ENTRY_DESCRIPTION_MAX_LENGTH,
  SITE_ENTRY_DIRECTORIES,
  SITE_ENTRY_FALLBACK_SLUG,
  SITE_IMAGE_DIRECTORY,
  SITE_PUBLIC_DIRECTORY,
} from "@/constants/site-github-publish";
import { siteConfigAuthorsSchema } from "@/schemas/site-github-publish";
import type { GitHubPublishContentType } from "@/types/integrations/github";
import type {
  ResolveSiteEntrySlugParams,
  BuildSiteEntryMarkdownParams,
  SiteConfigAuthorNames,
  SiteMarkdownNode,
} from "@/types/integrations/site-github-publish";

function joinRepositoryPath(...segments: string[]): string {
  return segments
    .map((segment) => segment.replace(SURROUNDING_SLASHES, ""))
    .filter(Boolean)
    .join("/");
}

export function normalizeSiteRootDirectory(rootDirectory: string): string {
  return rootDirectory.replace(SURROUNDING_SLASHES, "");
}

export function resolveSiteConfigPath(rootDirectory: string): string {
  return joinRepositoryPath(rootDirectory, SITE_CONFIG_FILENAME);
}

export function resolveSiteEntryDirectory(
  rootDirectory: string,
  contentType: GitHubPublishContentType
): string {
  return joinRepositoryPath(rootDirectory, SITE_ENTRY_DIRECTORIES[contentType]);
}

export function resolveSitePublicDirectory(rootDirectory: string): string {
  return joinRepositoryPath(rootDirectory, SITE_PUBLIC_DIRECTORY);
}

export function resolveSiteImagePathTemplate(
  rootDirectory: string,
  contentType: GitHubPublishContentType
): string {
  return joinRepositoryPath(
    resolveSitePublicDirectory(rootDirectory),
    SITE_IMAGE_DIRECTORY,
    SITE_ENTRY_DIRECTORIES[contentType],
    ":slug/image"
  );
}

export function resolveSiteEntrySlug(
  params: ResolveSiteEntrySlugParams
): string {
  return (
    slugify(params.slug ?? "") ||
    slugify(params.title) ||
    slugify(params.contentId) ||
    SITE_ENTRY_FALLBACK_SLUG
  );
}

export function resolveSiteAuthor(
  authors: SiteConfigAuthorNames,
  name: string | null | undefined
): string | null {
  const trimmed = name?.trim();
  if (!trimmed) {
    return null;
  }
  const wanted = trimmed.toLowerCase();
  const match = Object.entries(authors).find(
    ([, authorName]) => authorName.trim().toLowerCase() === wanted
  );
  return match ? match[0] : trimmed;
}

export function parseSiteConfigAuthors(raw: string): SiteConfigAuthorNames {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return {};
  }
  const parsed = siteConfigAuthorsSchema.safeParse(json);
  if (!(parsed.success && parsed.data.authors)) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(parsed.data.authors).map(([id, author]) => [id, author.name])
  );
}

function parseYamlScalar(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.startsWith('"')) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      return typeof parsed === "string" ? parsed : null;
    } catch {
      return null;
    }
  }
  if (trimmed.startsWith("'")) {
    return trimmed.endsWith("'") && trimmed.length > 1
      ? trimmed.slice(1, -1).replaceAll("''", "'")
      : null;
  }
  if (!trimmed || "[{|>&*!".includes(trimmed[0] ?? "")) {
    return null;
  }
  return trimmed.replace(UNQUOTED_YAML_COMMENT, "") || null;
}

export function readSiteEntryAuthor(markdown: string): string | null {
  const block = FRONTMATTER_BLOCK.exec(markdown)?.[1];
  const line = block ? FRONTMATTER_AUTHOR_LINE.exec(block)?.[1] : undefined;
  return line === undefined ? null : parseYamlScalar(line);
}

function normalizeHeadingText(value: string): string {
  return value.replace(WHITESPACE_RUN, " ").trim().toLowerCase();
}

function stripLeadingTitleHeading(body: string, title: string): string {
  const withoutBlankLines = body.replace(LEADING_BLANK_LINES, "");
  const heading = LEADING_ATX_HEADING.exec(withoutBlankLines);
  if (
    !(
      heading?.[1] &&
      normalizeHeadingText(heading[1]) === normalizeHeadingText(title)
    )
  ) {
    return body;
  }
  return withoutBlankLines
    .slice(heading[0].length)
    .replace(LEADING_BLANK_LINES, "");
}

function collectText(node: SiteMarkdownNode): string {
  if (node.type === "text" || node.type === "inlineCode") {
    return node.value ?? "";
  }
  if (node.type === "break") {
    return " ";
  }
  if (node.type === "image" || node.type === "html") {
    return "";
  }
  return (node.children ?? []).map(collectText).join("");
}

function truncateOnWordBoundary(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  const room = text.slice(0, maxLength - ELLIPSIS.length + 1);
  const lastSpace = room.lastIndexOf(" ");
  const cut = lastSpace > 0 ? room.slice(0, lastSpace) : room.slice(0, -1);
  return `${cut.replace(TRAILING_PUNCTUATION, "")}${ELLIPSIS}`;
}

export function extractMarkdownExcerpt(
  markdown: string,
  maxLength: number = SITE_ENTRY_DESCRIPTION_MAX_LENGTH
): string {
  const tree = fromMarkdown(markdown) as SiteMarkdownNode;
  for (const node of tree.children ?? []) {
    if (node.type !== "paragraph") {
      continue;
    }
    const text = collectText(node).replace(WHITESPACE_RUN, " ").trim();
    if (text) {
      return truncateOnWordBoundary(text, maxLength);
    }
  }
  return "";
}

function findFirstImageUrl(node: SiteMarkdownNode): string | null {
  if (node.type === "image") {
    return node.url ?? null;
  }
  for (const child of node.children ?? []) {
    const url = findFirstImageUrl(child);
    if (url !== null) {
      return url;
    }
  }
  return null;
}

function findSiteEntryImage(markdown: string): string | null {
  const url = findFirstImageUrl(fromMarkdown(markdown) as SiteMarkdownNode);
  return url && SITE_IMAGE_URL.test(url) ? url : null;
}

function formatSiteEntryDate(date: Date): string {
  return date.toISOString().slice(0, "YYYY-MM-DD".length);
}

function yamlString(value: string): string {
  return JSON.stringify(value);
}

export function buildSiteEntryMarkdown(
  params: BuildSiteEntryMarkdownParams
): string {
  const date = formatSiteEntryDate(params.date);
  const existing = FRONTMATTER_BLOCK.exec(params.markdown);
  if (existing) {
    const block = existing[1] ?? "";
    const missing = [
      FRONTMATTER_TITLE_KEY.test(block)
        ? null
        : `title: ${yamlString(params.title)}`,
      FRONTMATTER_DATE_KEY.test(block) ? null : `date: ${date}`,
    ].filter((line): line is string => line !== null);
    if (missing.length === 0) {
      return params.markdown;
    }
    const rest = params.markdown.slice(existing[0].length);
    return `---\n${[...missing, block].filter(Boolean).join("\n")}\n---\n${rest}`;
  }

  const body = stripLeadingTitleHeading(params.markdown, params.title);
  const description = extractMarkdownExcerpt(body);
  const image = findSiteEntryImage(body);
  const author =
    params.contentType === "blog_post" ? params.author?.trim() : undefined;
  const lines = [
    `title: ${yamlString(params.title)}`,
    description ? `description: ${yamlString(description)}` : null,
    `date: ${date}`,
    author ? `author: ${yamlString(author)}` : null,
    image ? `image: ${yamlString(image)}` : null,
  ].filter((line): line is string => line !== null);
  return `---\n${lines.join("\n")}\n---\n\n${body}`;
}
