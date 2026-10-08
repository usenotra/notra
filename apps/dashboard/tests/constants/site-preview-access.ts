import type { SitePreviewAccessPlan } from "../../src/types/site-preview-access";

export const site = {
  previewsEnabled: true,
  previewVisibility: "protected" as const,
  previewPasswordSetAt: "2026-10-01T00:00:00Z",
};

export const plan: SitePreviewAccessPlan = {
  previewsEnabled: true,
  previewVisibility: "protected",
  settingsChanged: false,
  password: undefined,
  passwordTooShort: false,
  isDirty: true,
};
