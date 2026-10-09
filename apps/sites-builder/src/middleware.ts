import { defineMiddleware } from "astro:middleware";

import { rewritePublicAssetUrls } from "../compiler/utils/public-assets";
import { params } from "./lib/params";

export const onRequest = defineMiddleware(async (_context, next) => {
  const response = await next();
  if (
    !import.meta.env.DEV ||
    !response.body ||
    !response.headers.get("content-type")?.startsWith("text/html")
  ) {
    return response;
  }
  const html = await response.clone().text();
  const rewritten = rewritePublicAssetUrls(
    html,
    params.mount,
    new Set(params.publicFiles)
  );
  if (rewritten === html) {
    return response;
  }
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.delete("etag");
  return new Response(rewritten, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
});
