import type { APIRoute } from "astro";

import { allAuthors, authorsOf } from "../lib/authors";
import { getAreaEntries } from "../lib/entries";
import { absoluteUrl, config, href, params } from "../lib/params";
import { isoDate } from "../utils/dates";

export const GET: APIRoute = async () => {
  const entries = await getAreaEntries();
  const indexable = params.noindex
    ? []
    : entries.filter(
        (entry) =>
          !(entry.data.draft || ("noindex" in entry.data && entry.data.noindex))
      );
  const lastModified = indexable.map((entry) =>
    "updated" in entry.data && entry.data.updated
      ? entry.data.updated
      : entry.data.date
  );
  const newest = lastModified.reduce<Date | null>(
    (latest, date) => (latest && latest > date ? latest : date),
    null
  );
  const urls = [
    `<url><loc>${absoluteUrl(href())}</loc>${newest ? `<lastmod>${isoDate(newest)}</lastmod>` : ""}</url>`,
    ...indexable.map(
      (entry, index) =>
        `<url><loc>${absoluteUrl(href(entry.id))}</loc><lastmod>${isoDate(lastModified[index] ?? entry.data.date)}</lastmod></url>`
    ),
    ...allAuthors()
      .filter(
        (author) =>
          params.area === "blog" &&
          config.seo.indexing === "all" &&
          indexable.some(
            (entry) =>
              entry.collection === "blog" &&
              authorsOf(entry).some((byline) => byline.id === author.id)
          )
      )
      .map(
        (author) =>
          `<url><loc>${absoluteUrl(author.href ?? href())}</loc></url>`
      ),
  ];
  const body = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${params.noindex ? "" : urls.join("")}</urlset>`;
  return new Response(body, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
};
