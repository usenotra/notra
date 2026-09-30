import { classifyRequest } from "./classify";
import {
  DEFAULT_TAG_PATHS,
  TAG_LOOP_GUARD_HEADER,
  TAG_LOOP_GUARD_VALUE,
  TAG_STRIPPED_RESPONSE_HEADER_PREFIXES,
  TAG_STRIPPED_RESPONSE_HEADERS,
  TAGGABLE_CONTENT_TYPES,
  TAGGABLE_HTML_CONTENT_TYPES,
} from "./constants";
import { matchesAnyRule, shouldTrackRequest } from "./exclude";
import { tagHtmlLinks } from "./html";
import { getJourneyId, mintJourneyId, tagMarkdownLinks } from "./markdown";
import { reportGeoError } from "./send";
import type {
  GeoExcludeRule,
  GeoTagLinksConfig,
  GeoTagLinksOption,
  GeoTagMode,
  GeoTagResponseOptions,
} from "./types";

export function resolveTagLinksConfig(
  option: GeoTagLinksOption | undefined
): GeoTagLinksConfig | null {
  if (!option) {
    return null;
  }
  if (option === true) {
    return {};
  }
  return option;
}

function passesSharedGates(request: Request): boolean {
  if (request.headers.has(TAG_LOOP_GUARD_HEADER)) {
    return false;
  }
  if (request.method.toUpperCase() !== "GET") {
    return false;
  }
  return classifyRequest(request.headers) !== null;
}

export function shouldTagRequest(
  request: Request,
  url: URL,
  config: GeoTagLinksConfig
): boolean {
  if (!passesSharedGates(request)) {
    return false;
  }
  return matchesAnyRule(request, url, config.paths ?? DEFAULT_TAG_PATHS);
}

export function resolveTagMode(
  request: Request,
  url: URL,
  config: GeoTagLinksConfig,
  exclude?: GeoExcludeRule[]
): GeoTagMode | null {
  if (!passesSharedGates(request)) {
    return null;
  }
  if (matchesAnyRule(request, url, config.paths ?? DEFAULT_TAG_PATHS)) {
    return "markdown";
  }
  if (!config.html) {
    return null;
  }
  if (!shouldTrackRequest(request, url, exclude)) {
    return null;
  }
  return "html";
}

function isTaggableContentType(
  value: string | null,
  allowed: readonly string[]
): boolean {
  if (!value) {
    return false;
  }
  const normalized = value.toLowerCase();
  return allowed.some((type) => normalized.includes(type));
}

function taggedHeaders(source: Headers): Headers {
  const headers = new Headers(source);

  for (const name of TAG_STRIPPED_RESPONSE_HEADERS) {
    headers.delete(name);
  }

  for (const name of Array.from(headers.keys())) {
    const isControlHeader = TAG_STRIPPED_RESPONSE_HEADER_PREFIXES.some(
      (prefix) => name.startsWith(prefix)
    );
    if (isControlHeader) {
      headers.delete(name);
    }
  }

  return headers;
}

export async function tagMarkdownResponse(
  request: Request,
  config: GeoTagLinksConfig,
  options: GeoTagResponseOptions = {}
): Promise<Response | undefined> {
  try {
    const url = new URL(request.url);
    const mode = resolveTagMode(request, url, config, options.exclude);
    if (!mode) {
      return;
    }

    const journeyId = getJourneyId(url) ?? mintJourneyId();
    const headers = new Headers(request.headers);
    headers.set(TAG_LOOP_GUARD_HEADER, TAG_LOOP_GUARD_VALUE);

    const send = options.fetch ?? globalThis.fetch;
    const origin = await send(request.url, { method: "GET", headers });

    if (!origin.ok) {
      return;
    }

    const contentType = origin.headers.get("content-type");
    const isMarkdownBody = isTaggableContentType(
      contentType,
      TAGGABLE_CONTENT_TYPES
    );
    const isHtmlBody =
      mode === "html" &&
      isTaggableContentType(contentType, TAGGABLE_HTML_CONTENT_TYPES);
    if (!(isMarkdownBody || isHtmlBody)) {
      return;
    }

    const body = await origin.text();
    const host = config.host ?? url.hostname;
    const tagged = isMarkdownBody
      ? tagMarkdownLinks(body, journeyId, { host })
      : tagHtmlLinks(body, journeyId, { host });

    return new Response(tagged, {
      status: origin.status,
      statusText: origin.statusText,
      headers: taggedHeaders(origin.headers),
    });
  } catch (error) {
    reportGeoError(options.onError, error);
    return;
  }
}
