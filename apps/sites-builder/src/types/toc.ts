import type { MarkdownHeading } from "astro";

export interface TocProps {
  headings: MarkdownHeading[];
  /** Renders without label or landmark id, with every sub-heading shown (mobile jump menu). */
  inline?: boolean;
}

export interface TocItem {
  slug: string;
  text: string;
}

export interface TocSection extends TocItem {
  children: TocItem[];
}
