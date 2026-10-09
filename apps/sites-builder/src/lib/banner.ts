import { createHash } from "node:crypto";

import { BANNER_COLORS, BANNER_DISMISS_KEY } from "../constants/banner";
import type { ResolvedBanner } from "../types/banner";
import { renderInlineMarkdown } from "../utils/inline-markdown";
import { config } from "./params";

export function siteBanner(): ResolvedBanner | null {
  const banner = config.banner;
  if (!banner) {
    return null;
  }
  const hash = createHash("sha256")
    .update(banner.content)
    .digest("hex")
    .slice(0, 12);
  const custom = banner.color;
  const colors =
    typeof custom === "string"
      ? { light: custom, dark: custom }
      : (custom ?? BANNER_COLORS[banner.type]);
  return {
    html: renderInlineMarkdown(banner.content),
    dismissible: banner.dismissible,
    storageKey: `${BANNER_DISMISS_KEY}${hash}`,
    light: colors.light,
    dark: colors.dark,
    foreground:
      !custom && banner.type === "info"
        ? "var(--primary-foreground)"
        : "oklch(1 0 0)",
  };
}
