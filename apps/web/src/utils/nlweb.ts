import {
  NLWEB_MAX_RESULTS,
  NLWEB_MIN_SCORE,
  NLWEB_QUERY_ALIASES,
  NLWEB_STOP_WORDS,
  NLWEB_VERSION,
} from "@/constants/nlweb";
import type { NlwebResult } from "@/types/nlweb";
import { buildDeveloperLlmsText } from "@/utils/llms";
import {
  buildFeaturesMarkdown,
  buildLandingMarkdown,
  buildPricingMarkdown,
} from "@/utils/site-markdown";
import { SITE_URL } from "@/utils/urls";

const SECTION_HEADING = /^#{1,3}\s+(.+)$/gm;
const MARKDOWN_LINK = /\[([^\]]+)]\([^)]+\)/g;
const MARKDOWN_SYNTAX = /[`*_>#-]/g;
const WORD = /[\p{L}\p{N}]+/gu;

const PAGES = [
  {
    title: "Notra",
    url: `${SITE_URL}/index.md`,
    content: buildLandingMarkdown(),
  },
  {
    title: "Notra Features",
    url: `${SITE_URL}/features.md`,
    content: buildFeaturesMarkdown(),
  },
  {
    title: "Notra Pricing",
    url: `${SITE_URL}/pricing.md`,
    content: buildPricingMarkdown(),
  },
  {
    title: "Notra Developer Resources",
    url: `${SITE_URL}/developers/llms.txt`,
    content: buildDeveloperLlmsText(),
  },
] as const;

function tokens(value: string) {
  return (value.toLocaleLowerCase().match(WORD) ?? []).filter(
    (word) => word.length > 2 && !NLWEB_STOP_WORDS.has(word)
  );
}

function queryTerms(query: string) {
  const terms = new Set(tokens(query));
  for (const term of terms) {
    for (const alias of NLWEB_QUERY_ALIASES[term] ?? []) {
      terms.add(alias);
    }
  }
  return [...terms];
}

function cleanMarkdown(value: string) {
  return value
    .replace(MARKDOWN_LINK, "$1")
    .replace(MARKDOWN_SYNTAX, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sections(content: string) {
  const matches = [...content.matchAll(SECTION_HEADING)];
  if (matches.length === 0) {
    return [{ heading: "Overview", content }];
  }

  return matches.map((match, index) => ({
    heading: match[1]?.trim() ?? "Overview",
    content: content.slice(
      (match.index ?? 0) + match[0].length,
      matches[index + 1]?.index ?? content.length
    ),
  }));
}

function scoreSection(
  pageTitle: string,
  heading: string,
  content: string,
  terms: string[]
) {
  const headingTokens = tokens(`${pageTitle} ${heading}`);
  const contentTokens = tokens(content);

  return terms.reduce((score, term) => {
    const headingMatches = headingTokens.filter((word) => word === term).length;
    const contentMatches = contentTokens.filter((word) => word === term).length;
    return score + headingMatches * 6 + Math.min(contentMatches, 4);
  }, 0);
}

export function retrieveNlwebResults(query: string): NlwebResult[] {
  const terms = queryTerms(query);
  if (terms.length === 0) {
    return [];
  }

  const seenUrls = new Set<string>();

  return PAGES.flatMap((page) =>
    sections(page.content).map((section) => ({
      page,
      section,
      score: scoreSection(page.title, section.heading, section.content, terms),
    }))
  )
    .filter(({ score }) => score >= NLWEB_MIN_SCORE)
    .sort((left, right) => right.score - left.score)
    .filter(({ page }) => {
      if (seenUrls.has(page.url)) {
        return false;
      }
      seenUrls.add(page.url);
      return true;
    })
    .slice(0, NLWEB_MAX_RESULTS)
    .map(({ page, section }) => ({
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: page.title
        .toLocaleLowerCase()
        .endsWith(section.heading.toLocaleLowerCase())
        ? page.title
        : `${page.title}: ${section.heading}`,
      url: page.url,
      description: cleanMarkdown(section.content).slice(0, 600),
      grounding: {
        source: page.url,
      },
    }));
}

export function nlwebMeta<T extends "answer" | "failure">(responseType: T) {
  return {
    response_type: responseType,
    version: NLWEB_VERSION,
  } as const;
}
