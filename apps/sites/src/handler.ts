import {
  SITE_PREVIEW_AUTH_PATH,
  SITE_PREVIEW_SIGN_OUT_PATH,
} from "@notra/sites-core/constants/sites";
import type { SiteServingState } from "@notra/sites-core/types/deployment";
import type { ParsedSiteHost } from "@notra/sites-core/types/hosts";
import { parseSiteHost } from "@notra/sites-core/utils/hosts";
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
  hostingApexPage,
  notDeployedPage,
  notFoundPage,
  previewClosedPage,
  securityTxt,
  serviceErrorPage,
  unavailablePage,
} from "./pages";
import {
  handlePreviewAuth,
  handlePreviewSignOut,
  previewAccessDenied,
} from "./preview-auth";
import {
  html,
  markdownNotFound,
  methodNotAllowed,
  plainText,
  robotsTxt,
  serveFile,
} from "./responses";
import { isReportablePageView, reportTraffic } from "./traffic";
import type {
  LoadedManifest,
  ResolvedDeployment,
  SiteRequestContext,
} from "./types/serving";
import type { SitesDeps } from "./types/worker";
import {
  markdownTwin,
  matchRedirect,
  normalizeRequestPath,
  prefersMarkdown,
  resolveFile,
  resolveMarkdownFile,
  twinPagePath,
} from "./utils/routing";

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

async function resolvePreview(
  context: SiteRequestContext,
  state: SiteServingState,
  siteId: string,
  previewKey: string
): Promise<ResolvedDeployment | Response> {
  const { deps, url, origin } = context;
  const pointer = state.previews[previewKey];
  if (!pointer) {
    return previewKey in state.removedPreviews
      ? html(previewClosedPage(), 410)
      : html(notFoundPage(), 404);
  }
  if (isPreviewExpired(pointer, deps.now())) {
    return html(previewClosedPage(), 410);
  }
  const previewContext = { ...context, state, siteId, previewKey };
  if (url.pathname === SITE_PREVIEW_AUTH_PATH) {
    return await handlePreviewAuth(previewContext);
  }
  if (url.pathname === SITE_PREVIEW_SIGN_OUT_PATH) {
    return handlePreviewSignOut(previewContext);
  }
  if (url.pathname === "/robots.txt") {
    return robotsTxt(origin, null);
  }
  if (pointer.visibility === "protected") {
    const denied = await previewAccessDenied(previewContext);
    if (denied) {
      return denied;
    }
  }
  return {
    siteId,
    deploymentId: pointer.deploymentId,
    isPreview: true,
    trafficToken: null,
  };
}

async function resolveDeployment(
  context: SiteRequestContext,
  parsedHost: ParsedSiteHost
): Promise<ResolvedDeployment | Response> {
  const { deps, request } = context;
  const isCustom = parsedHost.kind === "custom";
  const hostRecord = await loadHost(
    deps,
    isCustom ? parsedHost.hostname : `${parsedHost.slug}.${deps.hostingDomain}`
  );
  if (hostRecord?.kind !== (isCustom ? "custom" : "alias")) {
    return html(notFoundPage(), 404);
  }
  const { siteId } = hostRecord;
  const state = await loadState(deps, siteId);
  if (!state || (!isCustom && parsedHost.slug !== state.slug)) {
    return html(notFoundPage(), 404);
  }
  if (state.status !== "active") {
    return html(unavailablePage(), 410);
  }
  if (parsedHost.kind === "preview") {
    return await resolvePreview(context, state, siteId, parsedHost.previewKey);
  }
  if (request.method === "POST") {
    return methodNotAllowed("GET, HEAD");
  }
  if (!state.production) {
    return html(notDeployedPage(), 404);
  }
  return {
    siteId,
    deploymentId: state.production.deploymentId,
    isPreview: false,
    trafficToken: state.trafficToken,
  };
}

async function serveDeployment(
  context: SiteRequestContext,
  resolved: ResolvedDeployment
): Promise<Response> {
  const { deps, request, url, host } = context;
  const { siteId, deploymentId, trafficToken } = resolved;
  const loaded = await loadManifest(deps, siteId, deploymentId);
  if (!loaded) {
    throw new StateUnavailableError(
      `Manifest missing for active deployment ${deploymentId}`
    );
  }
  const response = await serveFromManifest(context, resolved, loaded);
  if (
    trafficToken &&
    deps.trafficIngestUrl &&
    isReportablePageView(request, response, deps.dashboardUrl)
  ) {
    const { publicOrigin } = loaded.manifest.target;
    deps.waitUntil(
      reportTraffic({
        fetch: deps.fetch,
        ingestUrl: deps.trafficIngestUrl,
        token: trafficToken,
        request,
        publicUrl: new URL(`${url.pathname}${url.search}`, publicOrigin).href,
        proxied: new URL(publicOrigin).hostname !== host,
        status: response.status,
      })
    );
  }
  return response;
}

function hostingApexResponse(deps: SitesDeps, url: URL): Response {
  if (url.pathname === "/.well-known/security.txt") {
    return plainText(securityTxt(url.origin, deps.now()), 86_400);
  }
  return html(hostingApexPage(deps.hostingDomain), 200);
}

function canonicalPageLink(
  publicOrigin: string,
  twinPath: string
): Record<string, string> {
  const pagePath = twinPagePath(twinPath);
  return pagePath
    ? { Link: `<${new URL(pagePath, publicOrigin).href}>; rel="canonical"` }
    : {};
}

async function serveFromManifest(
  context: SiteRequestContext,
  resolved: ResolvedDeployment,
  { manifest, files }: LoadedManifest
): Promise<Response> {
  const { deps, request, url, host, origin } = context;
  const { publicOrigin, mounts, noindex } = manifest.target;
  const path = normalizeRequestPath(url.pathname);
  if (path === null) {
    return html(notFoundPage(), 400);
  }
  if (path === "/robots.txt") {
    const crawlable = new URL(publicOrigin).hostname === host && !noindex;
    return robotsTxt(origin, crawlable ? manifest : null);
  }
  const redirect = matchRedirect(manifest, path);
  if (redirect) {
    return new Response(null, {
      status: redirect.status,
      headers: {
        Location: redirect.location,
        "Cache-Control": "public, max-age=300",
      },
    });
  }
  const fileParams = {
    deps,
    request,
    siteId: resolved.siteId,
    deploymentId: resolved.deploymentId,
    isPreview: resolved.isPreview,
    contentSecurityPolicy: manifest.contentSecurityPolicy,
    status: 200,
  };
  const markdownFile = resolveMarkdownFile(files, path);
  if (markdownFile) {
    return await serveFile({
      ...fileParams,
      file: markdownFile,
      extraHeaders: canonicalPageLink(publicOrigin, markdownFile.path),
    });
  }
  const wantsMarkdown = prefersMarkdown(request.headers.get("accept"));
  const file = resolveFile(files, path);
  const twin = file ? markdownTwin(files, file) : null;
  if (twin && wantsMarkdown) {
    return await serveFile({
      ...fileParams,
      file: twin,
      extraHeaders: {
        Vary: "Accept",
        "Content-Location": twin.path,
        ...canonicalPageLink(publicOrigin, twin.path),
      },
    });
  }
  if (file) {
    return await serveFile({
      ...fileParams,
      file,
      extraHeaders: twin
        ? {
            Vary: "Accept",
            Link: `<${twin.path}>; rel="alternate"; type="text/markdown"`,
          }
        : undefined,
    });
  }
  const area = resolveAreaForPath(mounts, path);
  if (wantsMarkdown || path.endsWith(".md")) {
    return markdownNotFound({
      path,
      indexPath: area ? joinMountPath(area.mount, "index.md") : null,
      llmsPath: joinMountPath(area?.mount ?? "/", "llms.txt"),
    });
  }
  const notFound = area
    ? files.get(joinMountPath(area.mount, "404.html"))
    : undefined;
  if (notFound) {
    return await serveFile({
      ...fileParams,
      file: notFound,
      status: 404,
      extraHeaders: { Vary: "Accept" },
    });
  }
  return html(notFoundPage(), 404);
}

export async function handleSiteRequest(
  request: Request,
  deps: SitesDeps
): Promise<Response> {
  const url = new URL(request.url);
  const allowsPost = url.pathname === SITE_PREVIEW_AUTH_PATH;
  const allowed = allowsPost ? ["GET", "HEAD", "POST"] : ["GET", "HEAD"];
  if (!allowed.includes(request.method)) {
    return methodNotAllowed(allowed.join(", "));
  }
  const host = requestHost(deps, request, url);
  if (host === deps.hostingDomain || host === `www.${deps.hostingDomain}`) {
    return hostingApexResponse(deps, url);
  }
  const parsedHost = parseSiteHost(host, deps.hostingDomain);
  if (!parsedHost) {
    return html(notFoundPage(), 404);
  }
  const origin = `${url.protocol}//${host}${url.port ? `:${url.port}` : ""}`;
  const context = { deps, request, url, host, origin };
  try {
    const resolved = await resolveDeployment(context, parsedHost);
    return resolved instanceof Response
      ? resolved
      : await serveDeployment(context, resolved);
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
