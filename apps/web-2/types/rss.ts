export interface RssFeedItem {
  title: string;
  link: string;
  guid: string;
  description: string;
  content: string;
  pubDate: string;
}

export interface RssFeedOptions {
  title: string;
  description: string;
  feedUrl: string;
  siteUrl: string;
  language: string;
  items: RssFeedItem[];
  lastBuildDate: string;
}
