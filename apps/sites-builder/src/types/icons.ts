import type { BRAND_ICONS, ICONS } from "../constants/icons";

export type IconName = keyof typeof ICONS;
export type BrandIconName = keyof typeof BRAND_ICONS;

export type LinkIcon =
  | { kind: "lucide"; name: IconName }
  | { kind: "brand"; name: BrandIconName };
