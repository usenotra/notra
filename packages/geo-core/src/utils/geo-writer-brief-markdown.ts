import { geoContentBriefSchema } from "@notra/ai/schemas/geo-writer";
import type {
  GeoBriefInternalLink,
  GeoBriefSection,
  GeoContentBrief,
  GeoContentSubtype,
  GeoWriterBrief,
} from "@notra/ai/types/geo-writer";

const EMPTY_CLAIMS = "(no required claims)";
const EMPTY_LIST = "(none listed)";
const EMPTY_CHECKLIST = "(follow the GEO writing rules)";
const HEADER_PREFIXES = [
  "target prompt",
  "intent",
  "type",
  "audience",
  "job to be done",
] as const;
const FAQ_HEADING = "faq";
const TARGET_PROMPT_LABEL = "Target prompt:";
const LINKS_HEADING = "internal links";
const CHECKLIST_HEADING = "acceptance checklist";
const TYPE_LINE_REGEX = /^blog post\s*\(([^)]+)\)\s*$/i;
const BULLET_LINE_REGEX = /^- (.+)$/;
const HEADING_REGEX = /^##\s+(.+)$/;

function escapeMarkdownLinkUrl(url: string): string {
  return url
    .replaceAll("\\", "\\\\")
    .replaceAll("(", "\\(")
    .replaceAll(")", "\\)");
}

function unescapeMarkdownLinkUrl(url: string): string {
  return url.replaceAll(/\\([\\()])/g, "$1");
}

function evidenceMarkdown(brief: GeoWriterBrief): string[] {
  const lines: string[] = [];
  const baseline = brief.baseline;
  if (baseline) {
    lines.push(
      "## Baseline",
      "",
      `Mentioned by ${baseline.mentionedEngines} of ${baseline.totalEngines} engines in the latest scan${baseline.capturedAt ? ` (${baseline.capturedAt.slice(0, 10)})` : ""}.`
    );
    if (baseline.competitorMentions.length > 0) {
      lines.push(
        "",
        "Brands recommended instead:",
        ...baseline.competitorMentions.map(
          (item) =>
            `- ${item.name} (${item.engines} of ${baseline.totalEngines} engines)`
        )
      );
    }
    if (baseline.citedDomains.length > 0) {
      lines.push(
        "",
        "Domains assistants cited:",
        ...baseline.citedDomains.map(
          (item) => `- ${item.domain} (${item.engines} engines)`
        )
      );
    }
    lines.push("");
  }
  const hasEvidence =
    brief.recommendedAngle ||
    (brief.competitorsToCounter && brief.competitorsToCounter.length > 0) ||
    (brief.missingCoverage && brief.missingCoverage.length > 0) ||
    (brief.sourcesToReference && brief.sourcesToReference.length > 0);
  if (!hasEvidence) {
    return lines;
  }
  lines.push("## Why this article should win", "");
  if (brief.recommendedAngle) {
    lines.push(brief.recommendedAngle, "");
  }
  if (brief.competitorsToCounter && brief.competitorsToCounter.length > 0) {
    lines.push(
      "Competitors to counter:",
      ...brief.competitorsToCounter.map((item) => `- ${item}`),
      ""
    );
  }
  if (brief.missingCoverage && brief.missingCoverage.length > 0) {
    lines.push(
      "Coverage to add:",
      ...brief.missingCoverage.map((item) => `- ${item}`),
      ""
    );
  }
  if (brief.sourcesToReference && brief.sourcesToReference.length > 0) {
    lines.push(
      "Sources assistants trust for this prompt:",
      ...brief.sourcesToReference.map((item) => `- ${item}`),
      ""
    );
  }
  return lines;
}

export function isGeoBriefMarkdown(markdown: string): boolean {
  return markdown.trimStart().startsWith(TARGET_PROMPT_LABEL);
}

export function geoBriefToMarkdown(brief: GeoWriterBrief): string {
  const sections = brief.sections
    .map((section) => {
      const claims =
        section.claims.length > 0
          ? section.claims.map((claim) => `- ${claim}`).join("\n")
          : `- ${EMPTY_CLAIMS}`;
      return `## ${section.heading}\n\n${section.goal}\n\n${claims}`;
    })
    .join("\n\n");
  const questions =
    brief.questionsToAnswer.length > 0
      ? brief.questionsToAnswer.map((question) => `- ${question}`).join("\n")
      : `- ${EMPTY_LIST}`;
  const links =
    brief.internalLinks.length > 0
      ? brief.internalLinks
          .map(
            (link) =>
              `- [${link.anchor}](${escapeMarkdownLinkUrl(link.url)}): ${link.why}`
          )
          .join("\n")
      : `- ${EMPTY_LIST}`;
  const checklist =
    brief.acceptanceChecklist.length > 0
      ? brief.acceptanceChecklist.map((item) => `- ${item}`).join("\n")
      : `- ${EMPTY_CHECKLIST}`;

  return [
    `${TARGET_PROMPT_LABEL} ${brief.targetPrompt}`,
    `Intent: ${brief.intent}`,
    `Type: blog post (${brief.contentSubtype})`,
    `Audience: ${brief.audience}`,
    `Job to be done: ${brief.jobToBeDone}`,
    "",
    ...evidenceMarkdown(brief),
    sections,
    "",
    "## FAQ",
    "",
    questions,
    "",
    "## Internal links",
    "",
    links,
    "",
    "## Acceptance checklist",
    "",
    checklist,
  ].join("\n");
}

export function markdownToGeoBrief(
  markdown: string,
  fallback: Pick<GeoContentBrief, "workingTitle" | "contentSubtype">
): GeoContentBrief | null {
  const blocks = splitMarkdownBlocks(markdown);
  if (!blocks) {
    return null;
  }

  const parsed = geoContentBriefSchema.safeParse({
    targetPrompt: blocks.headers.get("target prompt") ?? "",
    intent: blocks.headers.get("intent") ?? "",
    contentSubtype: parseContentSubtype(
      blocks.headers.get("type"),
      fallback.contentSubtype
    ),
    workingTitle: fallback.workingTitle,
    audience: blocks.headers.get("audience") ?? "",
    jobToBeDone: blocks.headers.get("job to be done") ?? "",
    sections: blocks.sections,
    questionsToAnswer: parseListItems(blocks.faq, EMPTY_LIST),
    internalLinks: parseInternalLinks(blocks.links),
    acceptanceChecklist: parseListItems(blocks.checklist, EMPTY_CHECKLIST),
  });

  return parsed.success ? parsed.data : null;
}

function parseContentSubtype(
  typeLine: string | undefined,
  fallback: GeoContentSubtype
): GeoContentSubtype {
  if (!typeLine) {
    return fallback;
  }
  const match = TYPE_LINE_REGEX.exec(typeLine.trim());
  if (!match?.[1]) {
    return fallback;
  }
  const candidate = match[1].trim().toLowerCase();
  const parsed =
    geoContentBriefSchema.shape.contentSubtype.safeParse(candidate);
  return parsed.success ? parsed.data : fallback;
}

function splitMarkdownBlocks(markdown: string): {
  headers: Map<string, string>;
  sections: GeoBriefSection[];
  faq: string[];
  links: string[];
  checklist: string[];
} | null {
  const lines = markdown.replaceAll("\r\n", "\n").split("\n");
  const headers = new Map<string, string>();
  const headingIndexes: Array<{ heading: string; index: number }> = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line) {
      continue;
    }
    const heading = HEADING_REGEX.exec(line.trim());
    if (heading?.[1]) {
      headingIndexes.push({ heading: heading[1].trim(), index });
      continue;
    }
    if (headingIndexes.length > 0) {
      continue;
    }
    const separator = line.indexOf(":");
    if (separator <= 0) {
      continue;
    }
    const label = line.slice(0, separator).trim().toLowerCase();
    if (!HEADER_PREFIXES.includes(label as (typeof HEADER_PREFIXES)[number])) {
      continue;
    }
    headers.set(label, line.slice(separator + 1).trim());
  }

  const checklistIndex = headingIndexes.findLastIndex(
    (item) => item.heading.toLowerCase() === CHECKLIST_HEADING
  );
  const linksIndex = headingIndexes.findLastIndex(
    (item, index) =>
      index < checklistIndex && item.heading.toLowerCase() === LINKS_HEADING
  );
  const faqIndex = headingIndexes.findLastIndex(
    (item, index) =>
      index < linksIndex && item.heading.toLowerCase() === FAQ_HEADING
  );
  if (
    faqIndex < 0 ||
    linksIndex !== faqIndex + 1 ||
    checklistIndex !== linksIndex + 1 ||
    checklistIndex !== headingIndexes.length - 1
  ) {
    return null;
  }

  const faqHeading = headingIndexes[faqIndex];
  const linksHeading = headingIndexes[linksIndex];
  const checklistHeading = headingIndexes[checklistIndex];
  if (!faqHeading || !linksHeading || !checklistHeading) {
    return null;
  }

  const outlineHeadings = headingIndexes.slice(0, faqIndex);
  const sections = outlineHeadings.flatMap((item, outlineIndex) => {
    const start = item.index + 1;
    const nextHeading = outlineHeadings[outlineIndex + 1] ?? faqHeading;
    const end = nextHeading.index;
    const body = lines.slice(start, end).map((line) => line.trim());
    const bullets = body.filter((line) => BULLET_LINE_REGEX.test(line));
    const goal = body
      .filter((line) => line.length > 0 && !BULLET_LINE_REGEX.test(line))
      .join(" ")
      .trim();
    if (!goal) {
      return [];
    }
    const claims = parseListItems(bullets, EMPTY_CLAIMS);
    const section: GeoBriefSection = {
      heading: item.heading,
      goal,
      claims,
    };
    return [section];
  });

  return {
    headers,
    sections,
    faq: linesBetween(lines, faqHeading, linksHeading),
    links: linesBetween(lines, linksHeading, checklistHeading),
    checklist: lines.slice(checklistHeading.index + 1),
  };
}

function linesBetween(
  lines: string[],
  start: { index: number },
  end: { index: number }
): string[] {
  return lines.slice(start.index + 1, end.index);
}

function parseListItems(lines: string[], emptyToken: string): string[] {
  return lines.flatMap((line) => {
    const match = BULLET_LINE_REGEX.exec(line.trim());
    if (!match?.[1]) {
      return [];
    }
    const value = match[1].trim();
    if (value === emptyToken) {
      return [];
    }
    return [value];
  });
}

function parseInternalLinks(lines: string[]): GeoBriefInternalLink[] {
  return lines.flatMap((line) => {
    const link = parseInternalLink(line.trim());
    return link ? [link] : [];
  });
}

function parseInternalLink(line: string): GeoBriefInternalLink | null {
  if (!line.startsWith("- [")) {
    return null;
  }
  const anchorEnd = line.indexOf("](", 3);
  if (anchorEnd < 0) {
    return null;
  }
  const anchor = line.slice(3, anchorEnd).trim();
  const urlStart = anchorEnd + 2;
  let depth = 0;
  for (let index = urlStart; index < line.length; index += 1) {
    const character = line[index];
    if (character === "\\" && index + 1 < line.length) {
      index += 1;
      continue;
    }
    if (character === "(") {
      depth += 1;
      continue;
    }
    if (character !== ")") {
      continue;
    }
    if (depth > 0) {
      depth -= 1;
      continue;
    }
    if (line[index + 1] !== ":") {
      return null;
    }
    const url = unescapeMarkdownLinkUrl(line.slice(urlStart, index).trim());
    const why = line.slice(index + 2).trim();
    if (!(anchor && url && why)) {
      return null;
    }
    return { anchor, url, why };
  }
  return null;
}
