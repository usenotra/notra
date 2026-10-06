import { SITE_PREVIEW_PASSWORD_MIN_LENGTH } from "@notra/sites-core/constants/sites";

import { SITE_PREVIEW_ACCESS_MODES } from "@/constants/site-preview-access";
import type {
  SitePreviewAccessDraft,
  SitePreviewAccessMode,
  SitePreviewAccessModeConfig,
  SitePreviewAccessPlan,
} from "@/types/site-preview-access";
import type { SiteRecord } from "@/types/sites";

export function sitePreviewAccessMode(
  site: Pick<SiteRecord, "previewVisibility" | "previewPasswordSetAt">
): SitePreviewAccessMode {
  if (site.previewVisibility === "public") {
    return "public";
  }
  return site.previewPasswordSetAt ? "password" : "members";
}

export function sitePreviewAccessModeConfig(
  mode: SitePreviewAccessMode
): SitePreviewAccessModeConfig {
  const config = SITE_PREVIEW_ACCESS_MODES.find(
    (candidate) => candidate.mode === mode
  );
  if (!config) {
    throw new Error(`Unknown preview access mode: ${mode}`);
  }
  return config;
}

export function sitePreviewAccessPlan(
  site: Pick<
    SiteRecord,
    "previewsEnabled" | "previewVisibility" | "previewPasswordSetAt"
  >,
  draft: SitePreviewAccessDraft
): SitePreviewAccessPlan {
  const wantsNewPassword = draft.mode === "password" && draft.editingPassword;
  const removesPassword =
    Boolean(site.previewPasswordSetAt) && draft.mode !== "password";
  const previewVisibility = sitePreviewAccessModeConfig(draft.mode).visibility;
  const settingsChanged =
    draft.enabled !== site.previewsEnabled ||
    previewVisibility !== site.previewVisibility;

  let password: string | null | undefined;
  if (wantsNewPassword) {
    password = draft.password;
  } else if (removesPassword) {
    password = null;
  }

  return {
    previewsEnabled: draft.enabled,
    previewVisibility,
    settingsChanged,
    password,
    passwordTooShort:
      wantsNewPassword &&
      draft.password.length < SITE_PREVIEW_PASSWORD_MIN_LENGTH,
    isDirty:
      settingsChanged ||
      removesPassword ||
      (wantsNewPassword && draft.password.length > 0),
  };
}
