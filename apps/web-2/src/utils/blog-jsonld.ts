import type { BlogFaqEntry, BlogJsonLdInput, NotraBlogPost } from "~types/blog";

import {
  BLOG_FAQ_HEADING_REGEX,
  BLOG_HEADING_REGEX,
  BLOG_NUMBERED_HEADING_PREFIX_REGEX,
  BLOG_PARAGRAPH_REGEX,
  BLOG_TAG_REGEX,
  BLOG_WHITESPACE_REGEX,
  HTML_ENTITY_MAP,
  HTML_ENTITY_REGEX,
  NOTRA_LOGO_PATH,
} from "@/utils/constants";
import { SITE_URL } from "@/utils/urls";

interface BlogHeading {
  level: number;
  text: string;
  index: number;
  endIndex: number;
}

function decodeHtmlEntities(value: string) {
  return value.replace(
    HTML_ENTITY_REGEX,
    (match, entity: string) => HTML_ENTITY_MAP[entity] ?? match
  );
}

function stripHtml(value: string) {
  return decodeHtmlEntities(value.replace(BLOG_TAG_REGEX, ""))
    .replace(BLOG_WHITESPACE_REGEX, " ")
    .trim();
}

function extractHeadings(html: string): BlogHeading[] {
  const headings: BlogHeading[] = [];

  for (const match of html.matchAll(BLOG_HEADING_REGEX)) {
    const [fullMatch, levelGroup, contentGroup] = match;
    if (!(levelGroup && contentGroup !== undefined && fullMatch)) {
      continue;
    }

    const text = stripHtml(contentGroup);
    if (text.length === 0) {
      continue;
    }

    const startIndex = match.index ?? 0;
    headings.push({
      level: Number(levelGroup),
      text,
      index: startIndex,
      endIndex: startIndex + fullMatch.length,
    });
  }

  return headings;
}

function extractParagraphs(html: string) {
  const paragraphs: string[] = [];

  for (const match of html.matchAll(BLOG_PARAGRAPH_REGEX)) {
    const content = match[1];
    if (content === undefined) {
      continue;
    }
    const stripped = stripHtml(content);
    if (stripped.length > 0) {
      paragraphs.push(stripped);
    }
  }

  return paragraphs;
}

function extractBlogFaqEntries(html: string): BlogFaqEntry[] {
  const headings = extractHeadings(html);
  const faqHeadingIndex = headings.findIndex(
    (heading) =>
      heading.level === 2 && BLOG_FAQ_HEADING_REGEX.test(heading.text)
  );

  if (faqHeadingIndex === -1) {
    return [];
  }

  const faqHeading = headings[faqHeadingIndex];
  if (!faqHeading) {
    return [];
  }

  const sectionHeadings = headings.slice(faqHeadingIndex + 1);
  const sectionEnd =
    sectionHeadings.find((heading) => heading.level === 2)?.index ??
    html.length;

  const entries: BlogFaqEntry[] = [];

  for (let i = 0; i < sectionHeadings.length; i += 1) {
    const heading = sectionHeadings[i];
    if (!heading || heading.level !== 3 || heading.index >= sectionEnd) {
      continue;
    }

    const nextHeading = sectionHeadings[i + 1];
    const answerEnd = Math.min(nextHeading?.index ?? sectionEnd, sectionEnd);
    const answerSlice = html.slice(heading.endIndex, answerEnd);
    const answerParts = extractParagraphs(answerSlice);

    if (heading.text.length > 0 && answerParts.length > 0) {
      entries.push({
        question: heading.text,
        answer: answerParts.join(" "),
      });
    }
  }

  return entries;
}

function extractBlogAboutEntities(html: string) {
  const seen = new Set<string>();
  const entities: string[] = [];

  for (const heading of extractHeadings(html)) {
    if (heading.level !== 2 || BLOG_FAQ_HEADING_REGEX.test(heading.text)) {
      continue;
    }

    const text = heading.text.replace(BLOG_NUMBERED_HEADING_PREFIX_REGEX, "");
    if (!seen.has(text)) {
      seen.add(text);
      entities.push(text);
    }
  }

  return entities;
}

export function buildBlogArticleJsonLd({
  post,
  url,
  imageUrl,
}: BlogJsonLdInput) {
  const aboutEntities = extractBlogAboutEntities(post.content);
  const publisher = {
    "@type": "Organization",
    name: "Notra",
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: `${SITE_URL}${NOTRA_LOGO_PATH}`,
    },
  } as const;

  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    image: imageUrl,
    datePublished: post.createdAt,
    dateModified: post.updatedAt,
    author: publisher,
    publisher,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    url,
    inLanguage: "en-US",
    keywords: aboutEntities.length > 0 ? aboutEntities.join(", ") : undefined,
    about:
      aboutEntities.length > 0
        ? aboutEntities.map((name) => ({ "@type": "Thing", name }))
        : undefined,
  };
}

export function buildBlogFaqJsonLd(post: NotraBlogPost) {
  const entries = extractBlogFaqEntries(post.content);

  if (entries.length === 0) {
    return null;
  }

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: entries.map((entry) => ({
      "@type": "Question",
      name: entry.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: entry.answer,
      },
    })),
  };
}
