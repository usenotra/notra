import { AUTH_SIGNUP_URL } from "@/constants/auth";
import { COMPARE_COMPETITORS } from "@/constants/compare/competitors";
import {
  COMPARE_AT_A_GLANCE_ROWS,
  COMPARE_CORRECTION_HREF,
  COMPARE_CORRECTION_LABEL,
  COMPARE_CUSTOMER_LOGOS,
  COMPARE_CUSTOMERS_CAPTION,
  COMPARE_DISCLAIMER,
  COMPARE_INDEX_SUBTITLE,
  COMPARE_INDEX_TITLE,
  COMPARE_NOT_LISTED,
  COMPARE_NOT_LISTED_NOTE,
  COMPARE_PATH,
  COMPARE_ROW_GROUPS,
  COMPARE_VERIFIED_LABEL,
  NOTRA_COMPARE_PLANS,
  NOTRA_PRICING_NOTE,
} from "@/constants/compare/page";
import type {
  CompareCompetitor,
  ComparePlan,
  ComparePoint,
  CompareRow,
} from "@/types/compare";
import {
  findCompareCompetitor,
  findCompareRow,
  formatCompareCell,
  getCompareFaqs,
  getCompareHref,
  getCompareCorrectionBody,
  getCompareCorrectionHeading,
  getCompareTitle,
  getRelatedCompareCompetitors,
} from "@/utils/compare";
import { SITE_URL } from "@/utils/urls";

function bulletList(items: string[]) {
  return items.map((item) => `- ${item}`).join("\n");
}

function pointList(points: ComparePoint[], numbered = false) {
  return points
    .map(
      (point, index) =>
        `${numbered ? `${index + 1}.` : "-"} **${point.title}.** ${point.description}`
    )
    .join("\n");
}

function planList(plans: ComparePlan[]) {
  return plans
    .map((plan) => `- **${plan.name}** (${plan.price}): ${plan.detail}`)
    .join("\n");
}

function cell(value: string) {
  return value.replaceAll("|", "\\|");
}

function rowLine(row: CompareRow, competitor: CompareCompetitor) {
  return `| ${cell(row.label)} | ${cell(formatCompareCell(row.notra))} | ${cell(formatCompareCell(competitor.values[row.id]))} |`;
}

function tableHeader(competitor: CompareCompetitor) {
  return [`| Feature | Notra | ${competitor.name} |`, "| --- | --- | --- |"];
}

function compareUrl(competitor: CompareCompetitor) {
  return `${SITE_URL}${getCompareHref(competitor)}`;
}

export function buildCompareIndexMarkdown(): string {
  const list = COMPARE_COMPETITORS.map(
    (competitor) =>
      `- [${getCompareTitle(competitor)}](${compareUrl(competitor)}.md): ${competitor.summary}`
  ).join("\n");

  return [
    `# ${COMPARE_INDEX_TITLE}`,
    "",
    COMPARE_INDEX_SUBTITLE,
    "",
    `Updated ${COMPARE_VERIFIED_LABEL}.`,
    "",
    "## Comparisons",
    "",
    list,
    "",
    COMPARE_DISCLAIMER,
    "",
  ].join("\n");
}

export function buildCompareMarkdown(slug: string): string | null {
  const competitor = findCompareCompetitor(slug);
  if (!competitor) {
    return null;
  }

  const glance = COMPARE_AT_A_GLANCE_ROWS.flatMap((id) => {
    const row = findCompareRow(id);
    return row ? [rowLine(row, competitor)] : [];
  });

  const features = COMPARE_ROW_GROUPS.flatMap((group) => [
    `### ${group.category}`,
    "",
    ...tableHeader(competitor),
    ...group.rows.map((row) => rowLine(row, competitor)),
    "",
  ]);

  const faqs = getCompareFaqs(competitor).flatMap((faq) => [
    `### ${faq.question}`,
    "",
    faq.answer,
    "",
  ]);

  const others = getRelatedCompareCompetitors(competitor).map(
    (item) => `- [${getCompareTitle(item)}](${compareUrl(item)}.md)`
  );

  const customers = COMPARE_CUSTOMER_LOGOS.map((logo) =>
    logo.href ? `[${logo.label}](${logo.href})` : logo.label
  ).join(", ");

  return [
    `# ${getCompareTitle(competitor)}`,
    "",
    competitor.heroSubtitle,
    "",
    `Updated ${COMPARE_VERIFIED_LABEL}. Page: ${compareUrl(competitor)}. ${competitor.name} website: ${competitor.website}.`,
    "",
    `- [Start for free](${AUTH_SIGNUP_URL})`,
    `- [Notra pricing](${SITE_URL}/pricing.md)`,
    "",
    `${COMPARE_CUSTOMERS_CAPTION}: ${customers}.`,
    "",
    "## At a glance",
    "",
    ...tableHeader(competitor),
    ...glance,
    "",
    "## The short answer",
    "",
    "### Pick Notra if",
    "",
    bulletList(competitor.chooseNotra),
    "",
    `### Pick ${competitor.name} if`,
    "",
    bulletList(competitor.chooseCompetitor),
    "",
    "## Feature by feature",
    "",
    `Every engine and feature we could verify on both sides, including the ones where ${competitor.name} is ahead. "Yes" means included, "No" means not available and "${COMPARE_NOT_LISTED}" means ${COMPARE_NOT_LISTED_NOTE.toLowerCase()}.`,
    "",
    ...features,
    `## Why teams pick Notra over ${competitor.name}`,
    "",
    pointList(competitor.advantages, true),
    "",
    `## What ${competitor.name} does well`,
    "",
    pointList(competitor.strengths),
    "",
    "## Pricing side by side",
    "",
    "### Notra",
    "",
    planList(NOTRA_COMPARE_PLANS),
    "",
    NOTRA_PRICING_NOTE,
    "",
    `### ${competitor.name}`,
    "",
    planList(competitor.plans),
    "",
    competitor.pricingNote,
    "",
    "## Frequently asked questions",
    "",
    ...faqs,
    "## Other comparisons",
    "",
    ...others,
    `- [All comparisons](${SITE_URL}${COMPARE_PATH}.md)`,
    "",
    `## ${getCompareCorrectionHeading(competitor)}`,
    "",
    getCompareCorrectionBody(competitor),
    "",
    `[${COMPARE_CORRECTION_LABEL}](${SITE_URL}${COMPARE_CORRECTION_HREF}.md)`,
    "",
    COMPARE_DISCLAIMER,
    "",
  ].join("\n");
}

export function listCompareMarkdownPages() {
  return COMPARE_COMPETITORS.map((competitor) => ({
    pattern: getCompareHref(competitor),
    slug: competitor.slug,
  }));
}
