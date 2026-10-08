import type { BlogEntry, ChangelogEntry } from "../types/entries";
import type {
  SlotArea,
  SlotChangelogEntry,
  SlotPost,
  SlotSite,
} from "../types/site-files";
import { formatDate } from "../utils/dates";
import { excerpt } from "../utils/excerpt";
import { authorsOf } from "./authors";
import {
  absoluteUrl,
  areaDescription,
  areaTitle,
  config,
  href,
  params,
} from "./params";

export function slotSite(): SlotSite {
  return { name: config.name, description: config.description };
}

export function slotArea(): SlotArea {
  return {
    id: params.area,
    title: areaTitle(params.area),
    description: areaDescription(params.area),
    url: absoluteUrl(href()),
  };
}

export function slotPost(entry: BlogEntry): SlotPost {
  return {
    title: entry.data.title,
    description: entry.data.description ?? excerpt(entry.body),
    date: formatDate(entry.data.date),
    tags: entry.data.tags,
    authors: authorsOf(entry).map((author) => ({
      name: author.name,
      title: author.title,
      url: author.href ? absoluteUrl(author.href) : author.url,
    })),
    url: absoluteUrl(href(entry.id)),
  };
}

export function slotChangelogEntry(entry: ChangelogEntry): SlotChangelogEntry {
  return {
    title: entry.data.title,
    version: entry.data.version,
    date: formatDate(entry.data.date),
    url: absoluteUrl(href(entry.id)),
  };
}
