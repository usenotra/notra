import type { SITE_SLOT_NAMES } from "@notra/sites-core/constants/site-layout";

export type SlotName = (typeof SITE_SLOT_NAMES)[number];

export interface SiteMdxModule {
  default: (props: Record<string, unknown>) => unknown;
}

export interface SlotSite {
  name: string;
  description?: string;
}

export interface SlotArea {
  id: "blog" | "changelog";
  title: string;
  description?: string;
  url: string;
}

export interface SlotPost {
  title: string;
  description?: string;
  date: string;
  tags: string[];
  authors: { name: string; title?: string; url?: string }[];
  url: string;
}

export interface SlotChangelogEntry {
  title: string;
  version?: string;
  date: string;
  url: string;
}

export interface CustomChromeProps {
  part: "header" | "footer";
}

export interface SiteSlotProps {
  name: SlotName;
  data?: Record<string, unknown>;
  class?: string;
}
