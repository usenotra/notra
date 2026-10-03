import {
  SITE_PREVIEW_AUTH_PATH,
  SITE_PREVIEW_SESSION_SECONDS,
  SITE_PREVIEW_SHARE_LINK_SECONDS,
} from "@notra/sites-core/constants/sites";
import { signSitePreviewToken } from "@notra/sites-core/utils/preview-token";

import type { Site } from "./deployments";
import { getSitesPreviewSecret } from "./env";
import { sitePreviewOrigin } from "./urls";

/**
 * URL that signs a member into a protected preview: the worker verifies the
 * token, sets an HttpOnly cookie for that preview host and redirects to `next`.
 */
export async function previewAccessUrl(params: {
  site: Pick<Site, "id" | "slug">;
  previewKey: string;
  next?: string;
  kind: "member" | "share";
}): Promise<{ url: string; expiresAt: Date }> {
  const lifetime =
    params.kind === "share"
      ? SITE_PREVIEW_SHARE_LINK_SECONDS
      : SITE_PREVIEW_SESSION_SECONDS;
  const exp = Math.floor(Date.now() / 1000) + lifetime;
  const token = await signSitePreviewToken(
    {
      siteId: params.site.id,
      previewKey: params.previewKey,
      exp,
      kind: params.kind,
    },
    getSitesPreviewSecret()
  );
  const next =
    params.next?.startsWith("/") && !params.next.startsWith("//")
      ? params.next
      : "/";
  const url = new URL(
    SITE_PREVIEW_AUTH_PATH,
    sitePreviewOrigin(params.site.slug, params.previewKey)
  );
  url.searchParams.set("token", token);
  url.searchParams.set("next", next);
  return { url: url.toString(), expiresAt: new Date(exp * 1000) };
}
