import type { CollectionEntry } from "astro:content";

export type BlogEntry = CollectionEntry<"blog">;
export type ChangelogEntry = CollectionEntry<"changelog">;

export interface DatedEntry {
  data: { date: Date };
}

export interface EntryIdOptions {
  entry: string;
}
