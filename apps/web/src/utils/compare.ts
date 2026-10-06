import { COMPARE_COMPETITORS } from "@/constants/compare/competitors";
import {
  COMPARE_ROW_GROUPS,
  NOTRA_COMPARE_PLANS,
  COMPARE_VERIFIED_LABEL,
} from "@/constants/compare/page";
import type {
  CompareCellValue,
  CompareCompetitor,
  CompareFaq,
  ComparePlan,
  CompareRow,
  CompareRowId,
} from "@/types/compare";
import type { FaqContent } from "@/types/landing/faq";

export function getCompareHref(competitor: CompareCompetitor): string {
  return `/notra-vs-${competitor.slug}`;
}

export function findCompareCompetitor(
  slug: string
): CompareCompetitor | undefined {
  return COMPARE_COMPETITORS.find((competitor) => competitor.slug === slug);
}

export function getRelatedCompareCompetitors(
  current: CompareCompetitor
): CompareCompetitor[] {
  return COMPARE_COMPETITORS.filter(
    (competitor) => competitor.slug !== current.slug
  );
}

export function findCompareRow(id: CompareRowId): CompareRow | undefined {
  return COMPARE_ROW_GROUPS.flatMap((group) => group.rows).find(
    (row) => row.id === id
  );
}

export function getCompareTitle(competitor: CompareCompetitor): string {
  return `Notra vs ${competitor.name}`;
}

export function getCompareMetaTitle(competitor: CompareCompetitor): string {
  return `${getCompareTitle(competitor)}: ${competitor.name} alternative compared (${COMPARE_VERIFIED_LABEL})`;
}

export function formatCompareCell(value: CompareCellValue): string {
  if (typeof value === "string") {
    return value;
  }
  return value ? "Yes" : "No";
}

function lowerFirst(value: string): string {
  const startsWithAcronym = value.charAt(1) === value.charAt(1).toUpperCase();
  if (startsWithAcronym) {
    return value;
  }
  return value.charAt(0).toLowerCase() + value.slice(1);
}

function formatPlan(plan: ComparePlan): string {
  return `${plan.name} (${plan.price})`;
}

function joinList(items: string[]): string {
  if (items.length < 2) {
    return items.join("");
  }
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

export function getCompareFaqs(competitor: CompareCompetitor): CompareFaq[] {
  const { name } = competitor;
  return [
    {
      question: `What is the difference between Notra and ${name}?`,
      answer: competitor.heroSubtitle,
    },
    {
      question: `What does ${name} do especially well?`,
      answer: competitor.strengths
        .map((strength) => `${strength.title}. ${strength.description}`)
        .join(" "),
    },
    {
      question: `Who should pick Notra and who should pick ${name}?`,
      answer: `Pick Notra if ${joinList(competitor.chooseNotra.map(lowerFirst))}. Pick ${name} if ${joinList(competitor.chooseCompetitor.map(lowerFirst))}.`,
    },
    {
      question: `How does ${name} pricing compare to Notra?`,
      answer: `${name} plans are ${joinList(competitor.plans.map(formatPlan))}. ${competitor.pricingNote} Notra plans are ${joinList(NOTRA_COMPARE_PLANS.map(formatPlan))}.`,
    },
    ...competitor.faqs,
  ];
}

export function getCompareFaqContent(
  competitor: CompareCompetitor
): FaqContent {
  return {
    heading: "Frequently asked questions",
    subcopy: `What people ask when comparing Notra and ${competitor.name}.`,
    items: getCompareFaqs(competitor).map((faq, index) => ({
      id: `${competitor.slug}-${index}`,
      question: faq.question,
      answer: faq.answer,
      defaultOpen: index === 0,
    })),
  };
}

export function buildCompareFaqJsonLd(competitor: CompareCompetitor) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: getCompareFaqs(competitor).map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}

export function splitHeadline(
  headline: string,
  accent: string
): [string, string] {
  const index = headline.indexOf(accent);
  if (index === -1) {
    return [headline, ""];
  }
  return [headline.slice(0, index), headline.slice(index + accent.length)];
}

export function getCompareCorrectionHeading(
  competitor: CompareCompetitor
): string {
  return `Work at ${competitor.name}? Help us keep this fair.`;
}

export function getCompareCorrectionBody(
  competitor: CompareCompetitor
): string {
  return `If anything on this page about ${competitor.name} is wrong or out of date, tell us and we will fix it as soon as we can. We never want to give buyers bad information. We want to compete, and we want to compete fairly.`;
}
