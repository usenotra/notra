import {
  SITE_PREVIEW_AUTH_PATH,
  SITE_PREVIEW_MEMBER_SESSION_SECONDS,
  SITE_PREVIEW_SHARE_LINK_SECONDS,
} from "@notra/sites-core/constants/sites";
import { safePreviewNextPath } from "@notra/sites-core/utils/preview-path";
import { signSitePreviewToken } from "@notra/sites-core/utils/preview-token";

import { getSitesPreviewSecret } from "./env";
import { updateSiteSettings } from "./sites";
import type {
  PreviewAccessUrl,
  PreviewAccessUrlParams,
} from "./types/preview-access";
import type { Site, UpdateSiteSettingsResult } from "./types/sites";
import { sitePreviewOrigin } from "./utils/urls";

export async function previewAccessUrl(
  params: PreviewAccessUrlParams
): Promise<PreviewAccessUrl> {
  const lifetime =
    params.kind === "share"
      ? SITE_PREVIEW_SHARE_LINK_SECONDS
      : SITE_PREVIEW_MEMBER_SESSION_SECONDS;
  const issuedAt = Date.now();
  const exp = Math.floor(issuedAt / 1000) + lifetime;
  const token = await signSitePreviewToken(
    {
      siteId: params.site.id,
      previewKey: params.previewKey,
      exp,
      kind: params.kind,
      userId: params.userId,
      issuedAt,
    },
    getSitesPreviewSecret()
  );
  const next = safePreviewNextPath(params.next);
  const url = new URL(
    SITE_PREVIEW_AUTH_PATH,
    sitePreviewOrigin(params.site.slug, params.previewKey)
  );
  url.searchParams.set("token", token);
  url.searchParams.set("next", next);
  return { url: url.toString(), expiresAt: new Date(exp * 1000) };
}

export async function setSitePreviewPassword(
  site: Site,
  password: string | null,
  userId: string
): Promise<UpdateSiteSettingsResult> {
  return await updateSiteSettings(site, { previewPassword: password }, userId);
}
