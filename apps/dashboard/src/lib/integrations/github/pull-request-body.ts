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

export type { OpenInNotraBadgeUrls };

export interface BuildContentPullRequestBodyParams {
  contentType: GitHubPublishContentType;
  /** Repository path of the committed draft. */
  path: string;
  owner: string;
  repo: string;
  /** Branch that contains the committed draft. */
  branch: string;
  /** Deep link to the content in the Notra dashboard. */
  contentUrl?: string;
  /** Absolute URLs of the "Open in Notra" badge images per color scheme. */
  badgeUrls?: OpenInNotraBadgeUrls;
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

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Drops a previously rendered deep link so republishing can place one fresh
 * link after the file path, including after notes another app appended.
 */
function stripOpenInNotraLink(
  body: string,
  params: BuildContentPullRequestBodyParams
) {
  if (!params.contentUrl) {
    return body;
  }

  const url = escapeRegExp(params.contentUrl);
  const button = new RegExp(
    `<a href="${url}"><picture><source media="\\(prefers-color-scheme: dark\\)" srcset="[^"]*"><source media="\\(prefers-color-scheme: light\\)" srcset="[^"]*"><img src="[^"]*" alt="Open in Notra" height="44"></picture></a>`,
    "g"
  );
  const markdownLink = new RegExp(`\\[Open in Notra\\]\\(${url}\\)`, "g");
  return body
    .replace(button, "")
    .replace(markdownLink, "")
    .replace(/\n{3,}/g, "\n\n");
}

function openInNotraTail(params: BuildContentPullRequestBodyParams) {
  const link = renderOpenInNotraLink(params);
  return link ? `\n\n${link}` : "";
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

function wrapManagedSection(managedContent: string) {
  return [
    GITHUB_PULL_REQUEST_BODY_SECTION_START,
    managedContent,
    GITHUB_PULL_REQUEST_BODY_SECTION_END,
  ].join("\n");
}

function escapeHtmlText(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function encodeGitHubPath(value: string) {
  return value
    .split("/")
    .filter((segment) => segment.length > 0)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function buildManagedContent(params: BuildContentPullRequestBodyParams) {
  const path = params.path.trim();
  if (!path) {
    return draftSummary(params.contentType);
  }

  const label = `<code>${escapeHtmlText(path)}</code>`;
  const owner = params.owner.trim();
  const repo = params.repo.trim();
  const branch = params.branch.trim();
  if (!(owner && repo && branch)) {
    return label;
  }

  const href = `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/blob/refs/heads/${encodeGitHubPath(branch)}/${encodeGitHubPath(path)}`;
  return `<a href="${href}">${label}</a>`;
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
  suffix: string,
  reservedTail = ""
) {
  const maxLength = Math.max(
    0,
    GITHUB_PULL_REQUEST_BODY_MAX_LENGTH - reservedTail.length
  );
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
  )}${keptSuffix}${reservedTail}`;
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
    "",
    openInNotraTail(params)
  );
}

export function mergeContentPullRequestBody(
  currentBody: string | null | undefined,
  params: BuildContentPullRequestBodyParams
) {
  const existingBody = stripOpenInNotraLink(currentBody ?? "", params);
  const managed = wrapManagedSection(buildManagedContent(params));
  const tail = openInNotraTail(params);
  const trimmed = existingBody.trim();

  if (!trimmed || legacyManagedBodies(params).includes(trimmed)) {
    return assemblePullRequestBody("", managed, "", tail);
  }

  const range = findReplacementRange(existingBody, params);
  if (range) {
    return assemblePullRequestBody(
      existingBody.slice(0, range.start),
      managed,
      existingBody.slice(range.end),
      tail
    );
  }

  return assemblePullRequestBody(
    `${existingBody.trimEnd()}\n\n`,
    managed,
    "",
    tail
  );
}
