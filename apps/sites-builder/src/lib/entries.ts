import { type CollectionEntry, getCollection } from "astro:content";

import { params } from "./params";

export type BlogEntry = CollectionEntry<"blog">;
export type ChangelogEntry = CollectionEntry<"changelog">;

const byDateDesc = (a: { data: { date: Date } }, b: { data: { date: Date } }) =>
  b.data.date.getTime() - a.data.date.getTime();

export async function getBlogEntries(): Promise<BlogEntry[]> {
  const entries = await getCollection(
    "blog",
    (entry) => params.includeDrafts || !entry.data.draft
  );
  return entries.sort(byDateDesc);
}

export async function getChangelogEntries(): Promise<ChangelogEntry[]> {
  const entries = await getCollection(
    "changelog",
    (entry) => params.includeDrafts || !entry.data.draft
  );
  return entries.sort(byDateDesc);
}

export function authorsOf(entry: BlogEntry): string[] {
  const author = entry.data.author;
  if (!author) {
    return [];
  }
  return Array.isArray(author) ? author : [author];
}

const WORDS_PER_MINUTE = 220;

export function readingMinutes(body: string | undefined): number {
  const words = (body ?? "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/<[^>]+>/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

const dateFormat = new Intl.DateTimeFormat("en", {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

export function formatDate(date: Date): string {
  return dateFormat.format(date);
}

export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
