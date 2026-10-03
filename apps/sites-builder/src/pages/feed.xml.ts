import type { APIRoute } from "astro";

import { getBlogEntries, getChangelogEntries } from "../lib/entries";
import {
  absoluteUrl,
  areaDescription,
  areaTitle,
  href,
  params,
} from "../lib/params";

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export const GET: APIRoute = async () => {
  const entries =
    params.area === "blog"
      ? await getBlogEntries()
      : await getChangelogEntries();
  const published = entries.filter((entry) => !entry.data.draft);
  const items = published
    .map((entry) => {
      const link = absoluteUrl(href(entry.id));
      const description = entry.data.description
        ? `<description>${escapeXml(entry.data.description)}</description>`
        : "";
      return `<item><title>${escapeXml(entry.data.title)}</title><link>${link}</link><guid isPermaLink="true">${link}</guid><pubDate>${entry.data.date.toUTCString()}</pubDate>${description}</item>`;
    })
    .join("");
  const channelLink = absoluteUrl(href());
  const body = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>${escapeXml(areaTitle(params.area))}</title><link>${channelLink}</link><description>${escapeXml(areaDescription(params.area) ?? areaTitle(params.area))}</description><atom:link href="${absoluteUrl(href("feed.xml"))}" rel="self" type="application/rss+xml"/>${items}</channel></rss>`;
  return new Response(body, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
};
