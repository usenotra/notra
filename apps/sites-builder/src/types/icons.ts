import type { BRAND_ICONS, ICONS } from "../constants/icons";

export type IconName = keyof typeof ICONS;
export type BrandIconName = keyof typeof BRAND_ICONS;

export type LinkIcon =
  | { kind: "lucide"; name: IconName }
  | { kind: "brand"; name: BrandIconName };

export interface BrandIconProps {
  name: BrandIconName;
  size?: number;
  class?: string;
}

export interface IconProps {
  name: IconName;
  size?: number;
  class?: string;
}

export interface LinkIconProps {
  icon: LinkIcon | undefined;
  size?: number;
  class?: string;
}
