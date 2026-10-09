import { BRAND_ICONS, ICONS } from "../constants/icons";
import type { BrandIconName, IconName, LinkIcon } from "../types/icons";

export function lucideIcon(name: string | undefined): LinkIcon | undefined {
  if (!(name && Object.hasOwn(ICONS, name))) {
    return undefined;
  }
  return { kind: "lucide", name: name as IconName };
}

export function brandIcon(platform: string): LinkIcon {
  const key =
    platform.toLowerCase() === "twitter" ? "x" : platform.toLowerCase();
  if (Object.hasOwn(BRAND_ICONS, key)) {
    return { kind: "brand", name: key as BrandIconName };
  }
  return { kind: "lucide", name: "globe" };
}
