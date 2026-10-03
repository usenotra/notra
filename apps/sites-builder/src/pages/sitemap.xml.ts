import type { APIRoute } from "astro";

import { getBlogEntries, getChangelogEntries, isoDate } from "../lib/entries";
import { absoluteUrl, href, params } from "../lib/params";

/** One sitemap per area; the customer references it from their root sitemap or robots.txt. */
export const GET: APIRoute = async () => {
  const entries =
    params.area === "blog"
      ? await getBlogEntries()
      : await getChangelogEntries();
  const indexable = params.noindex
    ? []
    : entries.filter(
        (entry) =>
          !(entry.data.draft || ("noindex" in entry.data && entry.data.noindex))
      );
  const urls = [
    `<url><loc>${absoluteUrl(href())}</loc></url>`,
    ...indexable.map((entry) => {
      const updated =
        "updated" in entry.data && entry.data.updated
          ? entry.data.updated
          : entry.data.date;
      return `<url><loc>${absoluteUrl(href(entry.id))}</loc><lastmod>${isoDate(updated)}</lastmod></url>`;
    }),
  ];
  const body = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${params.noindex ? "" : urls.join("")}</urlset>`;
  return new Response(body, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
};
