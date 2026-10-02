import type { NotraBlogPost } from "~types/blog";
import type { RssFeedItem, RssFeedOptions } from "~types/rss";

import {
  RSS_FEED_DESCRIPTION,
  RSS_FEED_LANGUAGE,
  RSS_FEED_PATH,
  RSS_FEED_TITLE,
} from "@/utils/constants";
import { SITE_URL } from "@/utils/urls";

const XML_ESCAPE_REGEX = /[<>&'"]/g;
const CDATA_END_REGEX = /]]>/g;

const XML_ESCAPE_MAP: Record<string, string> = {
  "<": "&lt;",
  ">": "&gt;",
  "&": "&amp;",
  "'": "&apos;",
  '"': "&quot;",
};

function escapeXml(value: string) {
  return value.replace(
    XML_ESCAPE_REGEX,
    (char) => XML_ESCAPE_MAP[char] ?? char
  );
}

function wrapCdata(value: string) {
  return `<![CDATA[${value.replace(CDATA_END_REGEX, "]]]]><![CDATA[>")}]]>`;
}

function toRfc822Date(value: string) {
  return new Date(value).toUTCString();
}

function buildItem(item: RssFeedItem) {
  return [
    "    <item>",
    `      <title>${escapeXml(item.title)}</title>`,
    `      <link>${escapeXml(item.link)}</link>`,
    `      <guid isPermaLink="true">${escapeXml(item.guid)}</guid>`,
    `      <pubDate>${item.pubDate}</pubDate>`,
    `      <description>${wrapCdata(item.description)}</description>`,
    `      <content:encoded>${wrapCdata(item.content)}</content:encoded>`,
    "    </item>",
  ].join("\n");
}

function buildRssFeed(options: RssFeedOptions) {
  const items = options.items.map(buildItem).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escapeXml(options.title)}</title>
    <link>${escapeXml(options.siteUrl)}</link>
    <description>${escapeXml(options.description)}</description>
    <language>${escapeXml(options.language)}</language>
    <lastBuildDate>${options.lastBuildDate}</lastBuildDate>
    <atom:link href="${escapeXml(options.feedUrl)}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;
}

export function buildBlogRssFeed(posts: NotraBlogPost[]) {
  const feedUrl = `${SITE_URL}${RSS_FEED_PATH}`;
  const blogUrl = `${SITE_URL}/blog`;

  const items: RssFeedItem[] = posts.map((post) => {
    const link = `${blogUrl}/${post.slug}`;
    return {
      title: post.title,
      link,
      guid: link,
      description: post.excerpt,
      content: post.content,
      pubDate: toRfc822Date(post.createdAt),
    };
  });

  const lastBuildDate = items[0]?.pubDate ?? new Date().toUTCString();

  return buildRssFeed({
    title: RSS_FEED_TITLE,
    description: RSS_FEED_DESCRIPTION,
    feedUrl,
    siteUrl: blogUrl,
    language: RSS_FEED_LANGUAGE,
    items,
    lastBuildDate,
  });
}

export function rssResponse(content: string, status = 200) {
  return new Response(content, {
    status,
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
    },
  });
}
