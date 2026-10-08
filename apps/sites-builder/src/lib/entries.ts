import { getCollection } from "astro:content";

import type { BlogEntry, ChangelogEntry, DatedEntry } from "../types/entries";
import { params } from "./params";

const byDateDesc = (a: DatedEntry, b: DatedEntry) =>
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

export function getAreaEntries(): Promise<BlogEntry[] | ChangelogEntry[]> {
  return params.area === "blog" ? getBlogEntries() : getChangelogEntries();
}
