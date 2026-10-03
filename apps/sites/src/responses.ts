import {
  SITE_ASSETS_DIR,
  SITE_R2_KEYS,
} from "@notra/sites-core/constants/sites";
import type {
  SiteManifest,
  SiteManifestFile,
} from "@notra/sites-core/schemas/deployment";
import {
  joinMountPath,
  listMountedAreas,
} from "@notra/sites-core/utils/mounts";

import { serviceErrorPage } from "./pages";
import type { SitesDeps } from "./types";

const ASSET_SEGMENT = `/${SITE_ASSETS_DIR}/`;

export function html(
  body: string,
  status: number,
  extraHeaders: Record<string, string> = {}
): Response {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
      ...extraHeaders,
    },
  });
}

/** AI crawlers and agents are named explicitly so a site's stance is unambiguous to them. */
const AI_USER_AGENTS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "Meta-ExternalAgent",
  "MistralAI-User",
  "DuckAssistBot",
];

export function robotsTxt(
  manifest: SiteManifest | null,
  indexable: boolean,
  origin: string
): Response {
  const lines = indexable
    ? [
        `# Markdown map of this site for language models: ${origin}/llms.txt`,
        "User-agent: *",
        "Allow: /",
        "",
        ...AI_USER_AGENTS.map((agent) => `User-agent: ${agent}`),
        "Allow: /",
        "",
        ...(manifest
          ? listMountedAreas(manifest.target.mounts).map(
              ({ mount }) =>
                `Sitemap: ${origin}${joinMountPath(mount, "sitemap.xml")}`
            )
          : []),
      ]
    : ["User-agent: *", "Disallow: /"];
  return new Response(`${lines.join("\n")}\n`, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}

export async function serveFile(params: {
  deps: SitesDeps;
  request: Request;
  siteId: string;
  deploymentId: string;
  file: SiteManifestFile;
  status: number;
  isPreview: boolean;
  extraHeaders?: Record<string, string>;
}): Promise<Response> {
  const { deps, request, siteId, deploymentId, file, status, isPreview } =
    params;
  const etag = `"${file.sha256}"`;
  const isAsset = file.path.includes(ASSET_SEGMENT);
  let cacheControl = "public, max-age=0, must-revalidate";
  if (isPreview) {
    cacheControl = "private, no-store";
  } else if (isAsset) {
    cacheControl = "public, max-age=31536000, immutable";
  }
  const headers = new Headers({
    "Content-Type": file.contentType,
    "Cache-Control": cacheControl,
    ETag: etag,
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
  });
  if (isPreview) {
    headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  for (const [name, value] of Object.entries(params.extraHeaders ?? {})) {
    headers.set(name, value);
  }
  if (status === 200 && request.headers.get("If-None-Match") === etag) {
    return new Response(null, { status: 304, headers });
  }

  const cacheKey = `https://sites-cache.notra.internal/${siteId}/${deploymentId}${file.path}`;
  let body: ReadableStream | null = null;
  const cached = await deps.cache?.match(cacheKey);
  if (cached?.body) {
    body = cached.body;
  } else {
    const object = await deps.bucket.get(
      SITE_R2_KEYS.file(siteId, deploymentId, file.path)
    );
    if (!object?.body) {
      return html(serviceErrorPage(), 503);
    }
    if (deps.cache) {
      const [forClient, forCache] = object.body.tee();
      body = forClient;
      const cache = deps.cache;
      deps.waitUntil(
        cache.put(
          cacheKey,
          new Response(forCache, {
            headers: {
              "Content-Type": file.contentType,
              "Cache-Control": "public, max-age=31536000, immutable",
            },
          })
        )
      );
    } else {
      body = object.body;
    }
  }
  return new Response(request.method === "HEAD" ? null : body, {
    status,
    headers,
  });
}

export function markdownNotFound(): Response {
  return new Response("# Not found\n\nThis page does not exist.\n", {
    status: 404,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "no-store",
      Vary: "Accept",
    },
  });
}
