import {
  OFFERING_CHECK_FAVICON_SIZE,
  OFFERING_CHECK_INVALID_MESSAGES,
  OFFERING_CHECK_MAX_SOURCE_DOMAINS,
  OFFERING_CHECK_MAX_SOURCE_PAGES,
  OFFERING_CHECK_MODEL_LABEL,
  OFFERING_QUESTION_TITLES,
  OFFERING_REPORT_FAILURE_MESSAGES,
  OFFERING_VERDICTS,
} from "@/constants/offering-check";
import type {
  OfferingAnswer,
  OfferingCheckResult,
  OfferingFormProblem,
  OfferingQuestion,
  OfferingQuestionKind,
  OfferingCheckInput,
  OfferingSampleField,
  OfferingThread,
  OfferingMarkdownNode,
  OfferingSourceDomain,
} from "@/types/offering-check";

const PROTOCOL_PATTERN = /^[a-z][a-z0-9+.-]*:\/\//i;
const WWW_PATTERN = /^www\./;
const HOSTNAME_PATTERN =
  /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/;
const MARKDOWN_CITATION_PATTERN = /\s*\(\[[^\]]+\]\([^)]+\)\)/g;
const TRACKING_PARAM = "utm_source";

export function normalizeDomain(input: string): string | null {
  const trimmed = input.trim().toLowerCase();
  if (trimmed.length === 0) {
    return null;
  }
  const withProtocol = PROTOCOL_PATTERN.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  if (!URL.canParse(withProtocol)) {
    return null;
  }
  const hostname = new URL(withProtocol).hostname.replace(WWW_PATTERN, "");
  return HOSTNAME_PATTERN.test(hostname) ? hostname : null;
}

function normalizeOfferingCheckText(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, " ");
}

export function getOfferingCheckBrandFeatureIdentity(
  input: OfferingCheckInput
): string {
  return JSON.stringify([
    input.domain.toLowerCase(),
    normalizeOfferingCheckText(input.feature),
  ]);
}

export function getOfferingCheckCacheIdentity(
  input: OfferingCheckInput
): string {
  return JSON.stringify([
    input.domain.toLowerCase(),
    normalizeOfferingCheckText(input.feature),
    normalizeOfferingCheckText(input.problem),
  ]);
}

export function offeringFaviconUrl(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${OFFERING_CHECK_FAVICON_SIZE}`;
}

export function domainOfUrl(url: string): string | null {
  if (!URL.canParse(url)) {
    return null;
  }
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return null;
  }
  return parsed.hostname.toLowerCase().replace(WWW_PATTERN, "");
}

function cleanSourceUrl(url: string): string {
  if (!URL.canParse(url)) {
    return url;
  }
  const parsed = new URL(url);
  parsed.searchParams.delete(TRACKING_PARAM);
  parsed.hash = "";
  return parsed.toString();
}

function isOwnDomain(candidate: string, domain: string): boolean {
  return candidate === domain || candidate.endsWith(`.${domain}`);
}

export function stripAnswerCitations(text: string): string {
  return text.replace(MARKDOWN_CITATION_PATTERN, "").trim();
}

export function groupSourcesByDomain(
  domain: string,
  retrievedUrls: readonly string[],
  citedUrls: readonly string[]
): OfferingSourceDomain[] {
  const groups = new Map<string, Map<string, boolean>>();
  const add = (rawUrl: string, cited: boolean) => {
    const url = cleanSourceUrl(rawUrl);
    const urlHost = domainOfUrl(url);
    if (!urlHost) {
      return;
    }
    const host = isOwnDomain(urlHost, domain) ? domain : urlHost;
    const group = groups.get(host) ?? new Map<string, boolean>();
    group.set(url, (group.get(url) ?? false) || cited);
    groups.set(host, group);
  };
  for (const url of citedUrls) {
    add(url, true);
  }
  for (const url of retrievedUrls) {
    add(url, false);
  }

  return [...groups.entries()]
    .map(([host, group]) => {
      const urls = [...group.entries()]
        .map(([url, cited]) => ({ url, cited }))
        .sort((a, b) => Number(b.cited) - Number(a.cited));
      return {
        domain: host,
        pages: urls.length,
        urls: urls.slice(0, OFFERING_CHECK_MAX_SOURCE_PAGES),
        cited: urls.some((page) => page.cited),
        own: isOwnDomain(host, domain),
        topUrl: urls[0]?.url ?? `https://${host}`,
      };
    })
    .sort((a, b) => b.pages - a.pages || Number(b.cited) - Number(a.cited))
    .slice(0, OFFERING_CHECK_MAX_SOURCE_DOMAINS);
}

const SENTENCE_END_PATTERN = /[.!?]$/;

/**
 * The name question always runs. With a problem, a second question describes
 * the need the way a buyer would, without the feature name.
 */
export function buildOfferingQuestions(
  input: OfferingCheckInput
): OfferingQuestion[] {
  if (input.feature.length === 0) {
    return [
      {
        kind: "name",
        text: `What does ${input.domain} offer? List its main products and features and say briefly what each one does.`,
      },
    ];
  }
  const feature = input.feature.replaceAll('"', "");
  const questions: OfferingQuestion[] = [
    {
      kind: "name",
      text: `Does ${input.domain} offer a feature called "${feature}"? What does it do? If you do not know it, tell me what they offer instead.`,
    },
  ];
  if (input.problem.length > 0) {
    const problem = SENTENCE_END_PATTERN.test(input.problem)
      ? input.problem
      : `${input.problem}.`;
    questions.push({
      kind: "problem",
      text: `I use ${input.domain}. ${problem} What in ${input.domain} can I use for this?`,
    });
  }
  return questions;
}

const REGEX_SPECIAL_PATTERN = /[.*+?^${}()|[\]\\]/g;
const WORD_CHARACTER = String.raw`[\p{L}\p{M}\p{N}_]`;

function highlightFeatureText(
  node: OfferingMarkdownNode,
  pattern: RegExp
): void {
  if (!node.children || node.tagName === "code" || node.tagName === "pre") {
    return;
  }
  node.children = node.children.flatMap((child): OfferingMarkdownNode[] => {
    if (child.type !== "text" || typeof child.value !== "string") {
      highlightFeatureText(child, pattern);
      return [child];
    }
    return child.value.split(pattern).flatMap((value, index) =>
      value
        ? [
            index % 2 === 0
              ? { type: "text", value }
              : {
                  type: "element",
                  tagName: "mark",
                  properties: {
                    className: [
                      "rounded",
                      "bg-[#8B5CF626]",
                      "box-decoration-clone",
                      "px-0.5",
                      "text-inherit",
                      "dark:bg-[#8B5CF640]",
                    ],
                  },
                  children: [{ type: "text", value }],
                },
          ]
        : []
    );
  });
}

export function createFeatureHighlightPlugin(feature: string) {
  const needle = feature.replaceAll('"', "").trim();
  const pattern = new RegExp(
    `(?<!${WORD_CHARACTER})(${needle.replace(REGEX_SPECIAL_PATTERN, "\\$&")})(?!${WORD_CHARACTER})`,
    "giu"
  );
  return () => (tree: OfferingMarkdownNode) => {
    if (needle.length > 0) {
      highlightFeatureText(tree, pattern);
    }
  };
}

/**
 * The hero leads with the problem question when one was asked, since buyers
 * who do not know the feature name are the harder audience to reach.
 */
export function getOfferingHeroCopy(
  result: OfferingCheckResult | null,
  hasFeature: boolean
): { lead: string; body: string } {
  const headline =
    result?.answers.find((answer) => answer.kind === "problem") ??
    result?.answers[0];
  if (!headline) {
    return {
      lead: `Asking ${OFFERING_CHECK_MODEL_LABEL} about `,
      body: "Searching the web now. You are watching the answer come in.",
    };
  }
  const copy = OFFERING_VERDICTS[headline.verdict];
  if (headline.kind === "problem") {
    return { lead: copy.problemLead, body: copy.problemBody };
  }
  return {
    lead: copy.heroLead,
    body: hasFeature ? copy.featureBody : copy.companyBody,
  };
}

export function offeringQuestionTitle(
  kind: OfferingQuestionKind,
  hasFeature: boolean
): string {
  if (!hasFeature) {
    return OFFERING_QUESTION_TITLES.company;
  }
  return OFFERING_QUESTION_TITLES[kind];
}

export function getOfferingActivityLabel(thread: OfferingThread): string {
  if (thread.seconds !== null) {
    return "Grading the answer";
  }
  if (thread.answer.length > 0) {
    return "Writing the answer";
  }
  if (thread.domains.length > 0) {
    const sites = thread.domains.length === 1 ? "site" : "sites";
    return `Searching the web · ${thread.domains.length} ${sites}`;
  }
  return thread.queries.length > 0 ? "Searching the web" : "Thinking";
}

export function countSourcePages(
  sources: readonly OfferingSourceDomain[]
): number {
  return sources.reduce((total, source) => total + source.pages, 0);
}

/** Sites, pages and use of the own site across every answer of a check. */
export function summarizeOfferingSources(answers: readonly OfferingAnswer[]) {
  const sites = new Set<string>();
  const pages = new Set<string>();
  let ownRead = false;
  let ownCited = false;
  for (const source of answers.flatMap((answer) => answer.sources)) {
    sites.add(source.domain);
    for (const page of source.urls) {
      pages.add(page.url);
    }
    ownRead = ownRead || source.own;
    ownCited = ownCited || (source.own && source.cited);
  }
  let ownSite = "Not opened";
  if (ownCited) {
    ownSite = "Cited";
  } else if (ownRead) {
    ownSite = "Read, not cited";
  }
  return { sites: sites.size, pages: pages.size, ownSite };
}

const NOTICE_FIELD: Partial<Record<OfferingFormProblem, OfferingSampleField>> =
  {
    "invalid-domain": "domain",
    "unknown-site": "domain",
    "invalid-feature": "feature",
    "invalid-problem": "problem",
  };

/** The message for a form notice, and the field it belongs to if any. */
export function describeOfferingNotice(notice: OfferingFormProblem): {
  field: OfferingSampleField | null;
  message: string;
} {
  const message =
    notice === "invalid-domain" ||
    notice === "invalid-feature" ||
    notice === "invalid-problem"
      ? OFFERING_CHECK_INVALID_MESSAGES[notice]
      : OFFERING_REPORT_FAILURE_MESSAGES[notice];
  return { field: NOTICE_FIELD[notice] ?? null, message };
}
