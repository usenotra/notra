import type { CollectionEntry } from "astro:content";

export type BlogEntry = CollectionEntry<"blog">;
export type ChangelogEntry = CollectionEntry<"changelog">;

export interface DatedEntry {
  data: { date: Date };
}

export interface EntryIdOptions {
  entry: string;
}

export interface FeaturedEntries {
  featured: BlogEntry[];
  rest: BlogEntry[];
}

export interface BlogPostProps {
  entry: BlogEntry;
}

export interface ChangelogEntryProps {
  entry: ChangelogEntry;
  standalone?: boolean;
  layout?: "timeline" | "cards" | "compact";
}

export interface PostCardProps {
  entry: BlogEntry;
  headingLevel?: "h2" | "h3";
  variant?: "card" | "feature" | "row";
  featured?: boolean;
  placeholder?: boolean;
  showAuthor?: boolean;
  /** Loads the cover eagerly; only for the first card above the fold. */
  priority?: boolean;
}

export interface PostPaginationProps {
  next?: BlogEntry;
  previous?: BlogEntry;
}

export type EntryPageProps =
  | { kind: "blog"; entry: BlogEntry }
  | { kind: "changelog"; entry: ChangelogEntry };
