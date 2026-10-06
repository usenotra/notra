import type { Metadata } from "@/types/metadata";

import { RSS_FEED_PATH } from "./constants";
import { SITE_URL } from "./urls";

const TRAILING_SLASHES_REGEX = /\/+$/;

export const SITE_TAGLINE = "Get recommended by AI engines.";

export const SITE_TITLE = `Notra. ${SITE_TAGLINE}`;

export const SITE_DESCRIPTION =
  "Notra is a GEO tool that asks ChatGPT, Claude and Gemini the questions your buyers ask. It shows whether you appear, who appears instead and how to fix it.";

export const DEFAULT_SOCIAL_IMAGE = {
  url: "/og-image.png",
  width: 1200,
  height: 630,
  alt: "Notra social preview image",
} as const;

const SOCIAL_IMAGE_WIDTH = 1200;
const SOCIAL_IMAGE_HEIGHT = 630;

export const PAGE_SOCIAL_IMAGES = {
  personas: {
    url: "/og/personas.png",
    width: SOCIAL_IMAGE_WIDTH,
    height: SOCIAL_IMAGE_HEIGHT,
    alt: "Notra personas social preview image",
  },
  conversations: {
    url: "/og/conversations.png",
    width: SOCIAL_IMAGE_WIDTH,
    height: SOCIAL_IMAGE_HEIGHT,
    alt: "Notra conversations social preview image",
  },
  aiCrawlerLogs: {
    url: "/og/ai-crawler-logs.png",
    width: SOCIAL_IMAGE_WIDTH,
    height: SOCIAL_IMAGE_HEIGHT,
    alt: "Notra AI crawler logs social preview image",
  },
  features: {
    url: "/og/features.png",
    width: SOCIAL_IMAGE_WIDTH,
    height: SOCIAL_IMAGE_HEIGHT,
    alt: "Notra features social preview image",
  },
  pricing: {
    url: "/og/pricing.png",
    width: SOCIAL_IMAGE_WIDTH,
    height: SOCIAL_IMAGE_HEIGHT,
    alt: "Notra pricing social preview image",
  },
  changelog: {
    url: "/og/changelog.png",
    width: SOCIAL_IMAGE_WIDTH,
    height: SOCIAL_IMAGE_HEIGHT,
    alt: "Notra changelog social preview image",
  },
  freeHat: {
    url: "/og/free-hat.png",
    width: SOCIAL_IMAGE_WIDTH,
    height: SOCIAL_IMAGE_HEIGHT,
    alt: "Notra free hat social preview image",
  },
  contact: {
    url: "/og/contact.png",
    width: SOCIAL_IMAGE_WIDTH,
    height: SOCIAL_IMAGE_HEIGHT,
    alt: "Notra contact social preview image",
  },
  brand: {
    url: "/og/brand.png",
    width: SOCIAL_IMAGE_WIDTH,
    height: SOCIAL_IMAGE_HEIGHT,
    alt: "Notra brand assets social preview image",
  },
  feedbackMd: {
    url: "/og/feedback-md.png",
    width: SOCIAL_IMAGE_WIDTH,
    height: SOCIAL_IMAGE_HEIGHT,
    alt: "feedback.md social preview image",
  },
  mcpServer: {
    url: "/og/mcp-server.png",
    width: SOCIAL_IMAGE_WIDTH,
    height: SOCIAL_IMAGE_HEIGHT,
    alt: "Notra MCP server social preview image",
  },
  ossProgram: {
    url: "/og/oss-program.png",
    width: SOCIAL_IMAGE_WIDTH,
    height: SOCIAL_IMAGE_HEIGHT,
    alt: "Notra OSS program social preview image",
  },
  integrations: {
    url: DEFAULT_SOCIAL_IMAGE.url,
    width: SOCIAL_IMAGE_WIDTH,
    height: SOCIAL_IMAGE_HEIGHT,
    alt: "Notra integrations marketplace social preview image",
  },
  slack: {
    url: "/og/slack.png",
    width: SOCIAL_IMAGE_WIDTH,
    height: SOCIAL_IMAGE_HEIGHT,
    alt: "Notra Slack integration social preview image",
  },
} as const;

export const TWITTER_HANDLE = "@usenotra";

export function pageAlternates(url: string): Metadata["alternates"] {
  const pageUrl = url.replace(TRAILING_SLASHES_REGEX, "");
  const markdownUrl =
    pageUrl === SITE_URL ? `${SITE_URL}/index.md` : `${pageUrl}.md`;

  return {
    canonical: pageUrl,
    types: {
      "text/plain": `${SITE_URL}/llms.txt`,
      "text/markdown": markdownUrl,
    },
  };
}

export const TITLE_TEMPLATE = "%s - Notra";

export const ROOT_METADATA: Metadata = {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: SITE_URL,
    types: {
      "text/plain": `${SITE_URL}/llms.txt`,
      "application/rss+xml": `${SITE_URL}${RSS_FEED_PATH}`,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "Notra",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [DEFAULT_SOCIAL_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [DEFAULT_SOCIAL_IMAGE.url],
    site: TWITTER_HANDLE,
    creator: TWITTER_HANDLE,
  },
  robots: {
    index: true,
    follow: true,
  },
};
