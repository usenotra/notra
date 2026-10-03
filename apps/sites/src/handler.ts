import { SITE_PREVIEW_AUTH_PATH } from "@notra/sites-core/constants/sites";
import {
  type ParsedSiteHost,
  parseSiteHost,
} from "@notra/sites-core/utils/hosts";
import {
  joinMountPath,
  resolveAreaForPath,
} from "@notra/sites-core/utils/mounts";
import { isPreviewExpired } from "@notra/sites-core/utils/serving-state";

import {
  loadHost,
  loadManifest,
  loadState,
  StateUnavailableError,
} from "./loaders";
import {
  notDeployedPage,
  notFoundPage,
  serviceErrorPage,
  unavailablePage,
} from "./pages";
import { handlePreviewAuth, previewAccessDenied } from "./preview-auth";
import { html, markdownNotFound, robotsTxt, serveFile } from "./responses";
import {
  markdownTwin,
  matchRedirect,
  normalizeRequestPath,
  prefersMarkdown,
  resolveFile,
  resolveMarkdownFile,
} from "./routing";
import type { SitesDeps } from "./types";

export { resetCachesForTests } from "./loaders";

interface ResolvedDeployment {
  siteId: string;
  deploymentId: string;
  isPreview: boolean;
}

/** Resolves which host a request is for. The dev override exists only when its secret is configured. */
function requestHost(deps: SitesDeps, request: Request, url: URL): string {
  const override = request.headers.get("x-notra-host");
  if (
    override &&
    deps.devHostOverrideToken &&
    request.headers.get("x-notra-dev-token") === deps.devHostOverrideToken
  ) {
    return override;
  }
  return url.hostname;
}

/**
 * Host → site → serving state → deployment. Returns a Response whenever the
 * request ends here (unknown host, takedown, locked preview, preview login).
 */
async function resolveDeployment(
  deps: SitesDeps,
  request: Request,
  url: URL,
  parsedHost: ParsedSiteHost,
  origin: string
): Promise<ResolvedDeployment | Response> {
  const hostKey =
    parsedHost.kind === "custom"
      ? parsedHost.hostname
      : `${parsedHost.slug}.${deps.hostingDomain}`;
  const hostRecord = await loadHost(deps, hostKey);
  if (
    !hostRecord ||
    hostRecord.kind !== (parsedHost.kind === "custom" ? "custom" : "alias")
  ) {
    return html(notFoundPage(), 404);
  }
  const siteId = hostRecord.siteId;
  const state = await loadState(deps, siteId);
  if (
    !state ||
    (parsedHost.kind !== "custom" && parsedHost.slug !== state.slug)
  ) {
    return html(notFoundPage(), 404);
  }
  // Checked before anything is served or read from cache, so a takedown wins over every cache.
  if (state.status !== "active") {
    return html(unavailablePage(), 410);
  }

  if (parsedHost.kind !== "preview") {
    return state.production
      ? {
          siteId,
          deploymentId: state.production.deploymentId,
          isPreview: false,
        }
      : html(notDeployedPage(), 404);
  }
  const pointer = state.previews[parsedHost.previewKey];
  if (!pointer || isPreviewExpired(pointer, deps.now())) {
    return html(notFoundPage(), 404);
  }
  if (url.pathname === SITE_PREVIEW_AUTH_PATH) {
    return await handlePreviewAuth(deps, url, siteId, parsedHost.previewKey);
  }
  if (url.pathname === "/robots.txt") {
    return robotsTxt(null, false, origin);
  }
  if (pointer.visibility === "protected") {
    const denied = await previewAccessDenied(
      deps,
      request,
      url,
      siteId,
      parsedHost.previewKey
    );
    if (denied) {
      return denied;
    }
  }
  return { siteId, deploymentId: pointer.deploymentId, isPreview: true };
}

/** Robots, redirects, the file itself, or the area's own 404 page. */
async function serveDeployment(
  deps: SitesDeps,
  request: Request,
  url: URL,
  host: string,
  origin: string,
  resolved: ResolvedDeployment
): Promise<Response> {
  const { siteId, deploymentId, isPreview } = resolved;
  const loaded = await loadManifest(deps, siteId, deploymentId);
  if (!loaded) {
    throw new StateUnavailableError(
      `Manifest missing for active deployment ${deploymentId}`
    );
  }
  const path = normalizeRequestPath(url.pathname);
  if (path === null) {
    return html(notFoundPage(), 400);
  }
  if (path === "/robots.txt") {
    // Only the canonical host is crawlable. When the customer proxies acme.com/blog to the alias,
    // the alias disallows everything and acme.com's own robots.txt governs the proxied paths.
    const canonicalHost = new URL(loaded.manifest.target.publicOrigin).hostname;
    return robotsTxt(
      loaded.manifest,
      canonicalHost === host && !loaded.manifest.target.noindex,
      origin
    );
  }
  const redirect = matchRedirect(loaded.manifest, path);
  if (redirect) {
    return new Response(null, {
      status: redirect.status,
      headers: {
        Location: redirect.location,
        "Cache-Control": "public, max-age=300",
      },
    });
  }
  const fileParams = { deps, request, siteId, deploymentId, isPreview };
  const markdownFile = resolveMarkdownFile(loaded.files, path);
  if (markdownFile) {
    return await serveFile({ ...fileParams, file: markdownFile, status: 200 });
  }
  const wantsMarkdown = prefersMarkdown(request.headers.get("accept"));
  const file = resolveFile(loaded.files, path);
  if (file) {
    // Every page has a Markdown twin: agents get it by asking for text/markdown.
    const twin = markdownTwin(loaded.files, file);
    if (twin && wantsMarkdown) {
      return await serveFile({
        ...fileParams,
        file: twin,
        status: 200,
        extraHeaders: { Vary: "Accept", "Content-Location": twin.path },
      });
    }
    return await serveFile({
      ...fileParams,
      file,
      status: 200,
      extraHeaders: twin
        ? {
            Vary: "Accept",
            Link: `<${twin.path}>; rel="alternate"; type="text/markdown"`,
          }
        : undefined,
    });
  }
  if (wantsMarkdown || path.endsWith(".md")) {
    return markdownNotFound();
  }
  const area = resolveAreaForPath(
    loaded.manifest.target.mounts,
    path.endsWith("/") ? path.slice(0, -1) || "/" : path
  );
  const notFound = area
    ? loaded.files.get(joinMountPath(area.mount, "404.html"))
    : undefined;
  if (notFound) {
    return await serveFile({ ...fileParams, file: notFound, status: 404 });
  }
  return html(notFoundPage(), 404);
}

export async function handleSiteRequest(
  request: Request,
  deps: SitesDeps
): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { Allow: "GET, HEAD" },
    });
  }
  const url = new URL(request.url);
  const host = requestHost(deps, request, url);
  const parsedHost = parseSiteHost(host, deps.hostingDomain);
  if (!parsedHost) {
    return html(notFoundPage(), 404);
  }
  const origin = `${url.protocol}//${host}${url.port ? `:${url.port}` : ""}`;
  try {
    const resolved = await resolveDeployment(
      deps,
      request,
      url,
      parsedHost,
      origin
    );
    return resolved instanceof Response
      ? resolved
      : await serveDeployment(deps, request, url, host, origin, resolved);
  } catch (error) {
    if (
      error instanceof StateUnavailableError ||
      error instanceof SyntaxError
    ) {
      console.error("sites.state_unavailable", { host, error: String(error) });
      return html(serviceErrorPage(), 503, { "Retry-After": "5" });
    }
    throw error;
  }
}
