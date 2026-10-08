import type { APIRoute } from "astro";

import { authorNamesOf } from "../lib/authors";
import { getAreaEntries } from "../lib/entries";
import {
  absoluteUrl,
  areaDescription,
  areaTitle,
  href,
  namedAreaTitle,
  params,
} from "../lib/params";
import { excerpt } from "../utils/excerpt";
import { escapeXml } from "../utils/xml";

export const GET: APIRoute = async () => {
  const entries = await getAreaEntries();
  const published = entries.filter((entry) => !entry.data.draft);
  const items = published
    .map((entry) => {
      const link = absoluteUrl(href(entry.id));
      const summary = entry.data.description ?? excerpt(entry.body);
      const description = summary
        ? `<description>${escapeXml(summary)}</description>`
        : "";
      const creators = authorNamesOf(entry)
        .map((name) => `<dc:creator>${escapeXml(name)}</dc:creator>`)
        .join("");
      const categories = entry.data.tags
        .map((tag) => `<category>${escapeXml(tag)}</category>`)
        .join("");
      return `<item><title>${escapeXml(entry.data.title)}</title><link>${link}</link><guid isPermaLink="true">${link}</guid><pubDate>${entry.data.date.toUTCString()}</pubDate>${description}${creators}${categories}</item>`;
    })
    .join("");
  const lastBuild = published[0]
    ? `<lastBuildDate>${published[0].data.date.toUTCString()}</lastBuildDate>`
    : "";
  const channelLink = absoluteUrl(href());
  const body = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/"><channel><title>${escapeXml(namedAreaTitle(params.area))}</title><link>${channelLink}</link><description>${escapeXml(areaDescription(params.area) ?? areaTitle(params.area))}</description><language>en</language>${lastBuild}<atom:link href="${absoluteUrl(href("feed.xml"))}" rel="self" type="application/rss+xml"/>${items}</channel></rss>`;
  return new Response(body, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
};
