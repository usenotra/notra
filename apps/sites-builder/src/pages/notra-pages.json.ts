import type { APIRoute } from "astro";

import {
  authorsOf,
  getBlogEntries,
  getChangelogEntries,
  isoDate,
} from "../lib/entries";
import { areaDescription, areaTitle, href, params } from "../lib/params";

/**
 * Build-time page list for the notra-sites CLI, which turns every page into
 * Markdown and writes llms.txt. It is consumed during the build and never deployed.
 */
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
          date: isoDate(entry.data.date),
          updated: entry.data.updated ? isoDate(entry.data.updated) : undefined,
          authors: authorsOf(entry),
          tags: entry.data.tags,
          indexable: !(entry.data.draft || entry.data.noindex),
        }))
      : (await getChangelogEntries()).map((entry) => ({
          path: href(entry.id),
          title: entry.data.title,
          description: entry.data.description,
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
