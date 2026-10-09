import type { IconSvgElement } from "@hugeicons/react";

import type { SitePreviewVisibility } from "@/types/sites";

export type SitePreviewAccessMode = "members" | "password" | "public";

export interface SitePreviewAccessModeConfig {
  mode: SitePreviewAccessMode;
  visibility: SitePreviewVisibility;
  icon: IconSvgElement;
}

export interface SitePreviewAccessDraft {
  enabled: boolean;
  mode: SitePreviewAccessMode;
  password: string;
  editingPassword: boolean;
}

export interface SitePreviewAccessPlan {
  previewsEnabled: boolean;
  previewVisibility: SitePreviewVisibility;
  settingsChanged: boolean;
  password: string | null | undefined;
  passwordTooShort: boolean;
  isDirty: boolean;
}
