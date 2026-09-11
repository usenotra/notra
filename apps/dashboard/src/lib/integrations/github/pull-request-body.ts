import {
  GITHUB_PULL_REQUEST_BODY_MAX_LENGTH,
  GITHUB_PULL_REQUEST_BODY_SECTION_END,
  GITHUB_PULL_REQUEST_BODY_SECTION_START,
} from "@/constants/github";

import type {
  GitHubPublishContentType,
  OpenInNotraBadgeUrls,
} from "../../../types/integrations/github";

const OPEN_IN_NOTRA_BADGE_PATHS = {
  dark: "/badges/open-in-notra-dark.svg",
  light: "/badges/open-in-notra-light.svg",
} as const;

const PULL_REQUEST_BODY_TRUNCATION_NOTICE =
  "_Truncated to fit GitHub's pull request description limit. The full draft is in the committed file._";

const LEADING_HEADING_REGEX = /^#\s+\S/;

export type { OpenInNotraBadgeUrls };

export interface BuildContentPullRequestBodyParams {
  contentType: GitHubPublishContentType;
  /** Deep link to the content in the Notra dashboard. */
  contentUrl?: string;
  /** Absolute URLs of the "Open in Notra" badge images per color scheme. */
  badgeUrls?: OpenInNotraBadgeUrls;
  /** Draft markdown committed to the pull request. */
  markdown?: string;
  /** Content title, used as an H1 when the markdown body has none. */
  title?: string;
}

function trimTrailingSlash(url: string) {
  return url.replace(/\/+$/, "");
}

/**
 * Resolves the public base URL of the Notra dashboard from the environment.
 * Returns `null` when no URL is configured so callers can omit deep links.
 */
export function resolveNotraBaseUrl(
  env: NodeJS.ProcessEnv = process.env
): string | null {
  const raw =
    env.APP_URL ?? env.NEXT_PUBLIC_SITE_URL ?? env.NEXT_PUBLIC_APP_URL ?? "";
  const trimmed = trimTrailingSlash(raw.trim());
  return trimmed.length > 0 ? trimmed : null;
}

export function buildOpenInNotraBadgeUrls(
  baseUrl: string
): OpenInNotraBadgeUrls {
  const base = trimTrailingSlash(baseUrl);
  return {
    dark: `${base}${OPEN_IN_NOTRA_BADGE_PATHS.dark}`,
    light: `${base}${OPEN_IN_NOTRA_BADGE_PATHS.light}`,
  };
}

/**
 * GitHub renders `<picture>` with `prefers-color-scheme` sources in Markdown,
 * so the badge follows the viewer's theme. The plain `<img>` is the fallback
 * for clients without `<picture>` support (e.g. notification emails).
 */
function renderOpenInNotraButton(
  contentUrl: string,
  badgeUrls: OpenInNotraBadgeUrls
) {
  return [
    `<a href="${contentUrl}"><picture>`,
    `<source media="(prefers-color-scheme: dark)" srcset="${badgeUrls.dark}">`,
    `<source media="(prefers-color-scheme: light)" srcset="${badgeUrls.light}">`,
    `<img src="${badgeUrls.light}" alt="Open in Notra" height="44">`,
    "</picture></a>",
  ].join("");
}

function draftSummary(contentType: GitHubPublishContentType) {
  const label = contentType === "changelog" ? "changelog" : "blog post";
  return `Draft ${label} generated and published with Notra.`;
}

function renderOpenInNotraLink(params: BuildContentPullRequestBodyParams) {
  if (!params.contentUrl) {
    return "";
  }

  return params.badgeUrls
    ? renderOpenInNotraButton(params.contentUrl, params.badgeUrls)
    : `[Open in Notra](${params.contentUrl})`;
}

function joinParagraphs(parts: string[]) {
  return parts.filter((part) => part.length > 0).join("\n\n");
}

/**
 * Older pull requests only had this summary (and later the Open in Notra
 * button). Keep generating it so republishing can still find and replace
 * unmarked legacy bodies.
 */
function buildManagedIntro(params: BuildContentPullRequestBodyParams) {
  return joinParagraphs([
    draftSummary(params.contentType),
    renderOpenInNotraLink(params),
  ]);
}

function neutralizeManagedSectionMarkers(markdown: string) {
  return markdown
    .replaceAll(
      GITHUB_PULL_REQUEST_BODY_SECTION_START,
      "<!-- notra-content:start -->"
    )
    .replaceAll(
      GITHUB_PULL_REQUEST_BODY_SECTION_END,
      "<!-- notra-content:end -->"
    );
}

function formatContentForPullRequest(
  params: BuildContentPullRequestBodyParams
) {
  const body = neutralizeManagedSectionMarkers(params.markdown?.trim() ?? "");
  if (!body) {
    return "";
  }

  const title = params.title?.replace(/\s+/g, " ").trim() ?? "";
  const firstLine = body.split(/\r?\n/, 1)[0] ?? "";
  if (!title || LEADING_HEADING_REGEX.test(firstLine)) {
    return body;
  }

  return `# ${title}\n\n${body}`;
}

function wrapManagedSection(managedContent: string) {
  return [
    GITHUB_PULL_REQUEST_BODY_SECTION_START,
    managedContent,
    GITHUB_PULL_REQUEST_BODY_SECTION_END,
  ].join("\n");
}

function buildManagedContent(params: BuildContentPullRequestBodyParams) {
  const article = formatContentForPullRequest(params);
  if (!article) {
    return buildManagedIntro(params);
  }

  return joinParagraphs([renderOpenInNotraLink(params), article]);
}

function clampManagedSection(wrapped: string, maxLength: number) {
  if (wrapped.length <= maxLength) {
    return wrapped;
  }

  const endMarker = `\n${GITHUB_PULL_REQUEST_BODY_SECTION_END}`;
  const notice = `\n\n${PULL_REQUEST_BODY_TRUNCATION_NOTICE}`;
  const maxPrefixLength = maxLength - notice.length - endMarker.length;

  if (maxPrefixLength <= GITHUB_PULL_REQUEST_BODY_SECTION_START.length) {
    return wrapManagedSection("");
  }

  return `${wrapped.slice(0, maxPrefixLength).trimEnd()}${notice}${endMarker}`;
}

function assemblePullRequestBody(
  prefix: string,
  managed: string,
  suffix: string
) {
  const maxLength = GITHUB_PULL_REQUEST_BODY_MAX_LENGTH;
  let keptPrefix = prefix;
  let keptSuffix = suffix;
  const overflow =
    keptPrefix.length +
    wrapManagedSection("").length +
    keptSuffix.length -
    maxLength;

  if (overflow > 0) {
    if (keptPrefix.length >= overflow) {
      keptPrefix = keptPrefix.slice(0, keptPrefix.length - overflow);
    } else {
      const suffixOverflow = overflow - keptPrefix.length;
      keptPrefix = "";
      keptSuffix = keptSuffix.slice(
        0,
        Math.max(0, keptSuffix.length - suffixOverflow)
      );
    }
  }

  return `${keptPrefix}${clampManagedSection(
    managed,
    maxLength - keptPrefix.length - keptSuffix.length
  )}${keptSuffix}`;
}

function markedSectionRange(body: string) {
  const start = body.indexOf(GITHUB_PULL_REQUEST_BODY_SECTION_START);
  if (start < 0) {
    return null;
  }

  const markerEnd = body.indexOf(
    GITHUB_PULL_REQUEST_BODY_SECTION_END,
    start + GITHUB_PULL_REQUEST_BODY_SECTION_START.length
  );
  if (markerEnd < start) {
    return null;
  }

  return {
    start,
    end: markerEnd + GITHUB_PULL_REQUEST_BODY_SECTION_END.length,
  };
}

function isParagraphBounded(body: string, start: number, end: number) {
  return (
    (start === 0 || body[start - 1] === "\n") &&
    (end === body.length || body[end] === "\n")
  );
}

function legacyManagedBodies(params: BuildContentPullRequestBodyParams) {
  const summary = draftSummary(params.contentType);
  const intro = buildManagedIntro(params);
  const bodies = [intro];

  if (params.contentUrl && params.badgeUrls) {
    bodies.push(buildManagedIntro({ ...params, badgeUrls: undefined }));
  }
  if (intro !== summary) {
    bodies.push(summary);
  }

  return bodies;
}

function findReplacementRange(
  body: string,
  params: BuildContentPullRequestBodyParams
) {
  const marked = markedSectionRange(body);
  if (marked) {
    return marked;
  }

  for (const candidate of legacyManagedBodies(params)) {
    const start = body.indexOf(candidate);
    if (start < 0) {
      continue;
    }

    const end = start + candidate.length;
    if (isParagraphBounded(body, start, end)) {
      return { start, end };
    }
  }

  return null;
}

export function buildContentPullRequestBody(
  params: BuildContentPullRequestBodyParams
) {
  return assemblePullRequestBody(
    "",
    wrapManagedSection(buildManagedContent(params)),
    ""
  );
}

export function mergeContentPullRequestBody(
  currentBody: string | null | undefined,
  params: BuildContentPullRequestBodyParams
) {
  const existingBody = currentBody ?? "";
  const managed = wrapManagedSection(buildManagedContent(params));
  const trimmed = existingBody.trim();

  if (!trimmed || legacyManagedBodies(params).includes(trimmed)) {
    return assemblePullRequestBody("", managed, "");
  }

  const range = findReplacementRange(existingBody, params);
  if (range) {
    return assemblePullRequestBody(
      existingBody.slice(0, range.start),
      managed,
      existingBody.slice(range.end)
    );
  }

  return assemblePullRequestBody(`${existingBody.trimEnd()}\n\n`, managed, "");
}
