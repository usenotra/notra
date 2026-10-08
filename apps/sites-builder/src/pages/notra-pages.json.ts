import type { APIRoute } from "astro";

import { authorsOf } from "../lib/authors";
import { getBlogEntries, getChangelogEntries } from "../lib/entries";
import { areaDescription, areaTitle, href, params } from "../lib/params";
import { isoDate } from "../utils/dates";
import { excerpt } from "../utils/excerpt";

export const GET: APIRoute = async () => {
  const common = {
    area: params.area,
    title: areaTitle(params.area),
    description: areaDescription(params.area),
  };
  const entries =
    params.area === "blog"
      ? (await getBlogEntries()).map((entry) => ({
          path: href(entry.id),
          title: entry.data.title,
          description: entry.data.description,
          summary: excerpt(entry.body),
          date: isoDate(entry.data.date),
          updated: entry.data.updated ? isoDate(entry.data.updated) : undefined,
          authors: authorsOf(entry).map((author) => author.name),
          tags: entry.data.tags,
          indexable: !(entry.data.draft || entry.data.noindex),
        }))
      : (await getChangelogEntries()).map((entry) => ({
          path: href(entry.id),
          title: entry.data.title,
          description: entry.data.description,
          summary: excerpt(entry.body),
          date: isoDate(entry.data.date),
          version: entry.data.version,
          tags: entry.data.tags,
          indexable: !entry.data.draft,
        }));
  return new Response(
    JSON.stringify({ ...common, indexPath: href(), entries }),
    {
      headers: { "Content-Type": "application/json" },
    }
  );
};
