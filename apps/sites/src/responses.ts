import { SITE_R2_KEYS } from "@notra/sites-core/constants/sites";
import type {
  SiteManifest,
  SiteManifestFile,
} from "@notra/sites-core/types/deployment";
import {
  joinMountPath,
  listMountedAreas,
} from "@notra/sites-core/utils/mounts";

import {
  AI_USER_AGENTS,
  ASSET_SEGMENT,
  EDGE_CACHE_ORIGIN,
  IMMUTABLE_CACHE_CONTROL,
} from "./constants/responses";
import { serviceErrorPage } from "./pages";
import type { MarkdownNotFoundParams, ServeFileParams } from "./types/serving";
import type { SitesDeps } from "./types/worker";
import { html, plainText } from "./utils/responses";

export function methodNotAllowed(allow: string): Response {
  return new Response("Method not allowed", {
    status: 405,
    headers: { Allow: allow },
  });
}

export function noStoreRedirect(
  location: string,
  status: number,
  extraHeaders: Record<string, string> = {}
): Response {
  return new Response(null, {
    status,
    headers: {
      Location: location,
      "Cache-Control": "no-store",
      ...extraHeaders,
    },
  });
}

export function robotsTxt(
  origin: string,
  crawlable: SiteManifest | null
): Response {
  const lines = crawlable
    ? [
        `# Markdown map of this site for language models: ${origin}/llms.txt`,
        "User-agent: *",
        "Allow: /",
        "",
        ...AI_USER_AGENTS.map((agent) => `User-agent: ${agent}`),
        "Allow: /",
        "",
        ...listMountedAreas(crawlable.target.mounts).map(
          ({ mount }) =>
            `Sitemap: ${origin}${joinMountPath(mount, "sitemap.xml")}`
        ),
      ]
    : ["User-agent: *", "Disallow: /"];
  return plainText(`${lines.join("\n")}\n`, 300);
}

function fileCacheControl(file: SiteManifestFile, isPreview: boolean): string {
  if (isPreview) {
    return "private, no-store";
  }
  return file.path.includes(ASSET_SEGMENT)
    ? IMMUTABLE_CACHE_CONTROL
    : "public, max-age=0, must-revalidate";
}

async function readFileBody(
  deps: SitesDeps,
  siteId: string,
  deploymentId: string,
  file: SiteManifestFile
): Promise<ReadableStream | null> {
  const cacheKey = `${EDGE_CACHE_ORIGIN}/${siteId}/${deploymentId}${file.path}`;
  const cached = await deps.cache?.match(cacheKey);
  if (cached?.body) {
    return cached.body;
  }
  const object = await deps.bucket.get(
    SITE_R2_KEYS.file(siteId, deploymentId, file.path)
  );
  if (!(object?.body && deps.cache)) {
    return object?.body ?? null;
  }
  const [forClient, forCache] = object.body.tee();
  deps.waitUntil(
    deps.cache.put(
      cacheKey,
      new Response(forCache, {
        headers: {
          "Content-Type": file.contentType,
          "Cache-Control": IMMUTABLE_CACHE_CONTROL,
        },
      })
    )
  );
  return forClient;
}

export async function serveFile(params: ServeFileParams): Promise<Response> {
  const { deps, request, siteId, deploymentId, file, status, isPreview } =
    params;
  const etag = `"${file.sha256}"`;
  const headers = new Headers({
    "Content-Type": file.contentType,
    "Cache-Control": fileCacheControl(file, isPreview),
    ETag: etag,
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
  });
  if (isPreview) {
    headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  if (
    params.contentSecurityPolicy &&
    file.contentType.startsWith("text/html")
  ) {
    headers.set("Content-Security-Policy", params.contentSecurityPolicy);
  }
  for (const [name, value] of Object.entries(params.extraHeaders ?? {})) {
    headers.set(name, value);
  }
  if (status === 200 && request.headers.get("If-None-Match") === etag) {
    return new Response(null, { status: 304, headers });
  }
  const body = await readFileBody(deps, siteId, deploymentId, file);
  if (!body) {
    return html(serviceErrorPage(), 503);
  }
  return new Response(request.method === "HEAD" ? null : body, {
    status,
    headers,
  });
}

export function markdownNotFound(params: MarkdownNotFoundParams): Response {
  const lines = [
    "# Not found",
    "",
    `There is no page at \`${params.path.replaceAll("`", "")}\`. It may have moved, or the link is wrong.`,
    "",
  ];
  if (params.indexPath) {
    lines.push(`- [Index](${params.indexPath}): every entry, newest first`);
  }
  lines.push(`- [llms.txt](${params.llmsPath}): a Markdown map of this site`);
  return new Response(`${lines.join("\n")}\n`, {
    status: 404,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
      Vary: "Accept",
    },
  });
}
