import type { SiteConfig } from "@notra/sites-core/types/site-config";

import type { LinkIcon } from "./icons";

export type NavbarLink = SiteConfig["navbar"]["links"][number];

export interface PlainLink {
  label: string;
  href: string;
  icon?: string;
}

export interface ResolvedLink {
  label: string;
  href: string;
  icon?: LinkIcon;
  iconOnly: boolean;
}

export interface FooterColumn {
  header?: string;
  items: ResolvedLink[];
}
