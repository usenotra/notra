import {
  Globe02Icon,
  PasswordValidationIcon,
  SquareLock02Icon,
} from "@hugeicons/core-free-icons";

import type { SitePreviewAccessModeConfig } from "@/types/site-preview-access";

export const SITE_PREVIEW_ACCESS_MODES: readonly SitePreviewAccessModeConfig[] =
  [
    { mode: "members", visibility: "protected", icon: SquareLock02Icon },
    {
      mode: "password",
      visibility: "protected",
      icon: PasswordValidationIcon,
    },
    { mode: "public", visibility: "public", icon: Globe02Icon },
  ];
