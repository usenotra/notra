import { geoContentBriefSchema } from "@notra/ai/schemas/geo-writer";
import type { GeoContentBrief } from "@notra/ai/types/geo-writer";

import { CONTENT_PLAN_LINK_DEFAULT_WHY } from "@/constants/content-plan";
import type {
  KeyedContentPlan,
  KeyedPlanLine,
  KeyedPlanSection,
} from "@/types/content/plan";
import { isBlogPostSubtype } from "@/utils/content-subtype";

export function createPlanId(): string {
  return crypto.randomUUID();
}

export function toPlanLine(text: string): KeyedPlanLine {
  return { id: createPlanId(), text };
}

export function emptyPlanSection(): KeyedPlanSection {
  return { id: createPlanId(), heading: "", goal: "", claims: [] };
}

export function toKeyedPlan(brief: GeoContentBrief): KeyedContentPlan {
  return {
    targetPrompt: brief.targetPrompt,
    intent: brief.intent,
    contentSubtype: brief.contentSubtype,
    workingTitle: brief.workingTitle,
    audience: brief.audience,
    jobToBeDone: brief.jobToBeDone,
    sections: brief.sections.map((section) => ({
      id: createPlanId(),
      heading: section.heading,
      goal: section.goal,
      claims: section.claims.map(toPlanLine),
    })),
    questionsToAnswer: brief.questionsToAnswer.map(toPlanLine),
    internalLinks: brief.internalLinks.map((link) => ({
      id: createPlanId(),
      ...link,
    })),
    acceptanceChecklist: brief.acceptanceChecklist.map(toPlanLine),
  };
}

export function fromKeyedPlan(draft: KeyedContentPlan): GeoContentBrief {
  return {
    targetPrompt: draft.targetPrompt,
    intent: draft.intent,
    contentSubtype: draft.contentSubtype,
    workingTitle: draft.workingTitle,
    audience: draft.audience,
    jobToBeDone: draft.jobToBeDone,
    sections: draft.sections.map((section) => ({
      heading: section.heading,
      goal: section.goal,
      claims: section.claims.map((claim) => claim.text),
    })),
    questionsToAnswer: draft.questionsToAnswer.map((question) => question.text),
    internalLinks: draft.internalLinks.map(({ url, anchor, why }) => ({
      url,
      anchor,
      why,
    })),
    acceptanceChecklist: draft.acceptanceChecklist.map((item) => item.text),
  };
}

function canonicalizeBrief(brief: GeoContentBrief): GeoContentBrief | null {
  const parsed = geoContentBriefSchema.safeParse(brief);
  return parsed.success ? parsed.data : null;
}

export function briefsEqual(
  left: GeoContentBrief,
  right: GeoContentBrief
): boolean {
  const canonicalLeft = canonicalizeBrief(left);
  const canonicalRight = canonicalizeBrief(right);
  if (!(canonicalLeft && canonicalRight)) {
    return false;
  }
  return JSON.stringify(canonicalLeft) === JSON.stringify(canonicalRight);
}

export function toSavableBrief(
  draft: KeyedContentPlan
): GeoContentBrief | null {
  const internalLinks = draft.internalLinks.map(completePlanLink);
  if (internalLinks.some((link) => link === null)) {
    return null;
  }

  const parsed = geoContentBriefSchema.safeParse({
    ...fromKeyedPlan(draft),
    targetPrompt: draft.targetPrompt.trim(),
    intent: draft.intent.trim(),
    workingTitle: draft.workingTitle.trim(),
    audience: draft.audience.trim(),
    jobToBeDone: draft.jobToBeDone.trim(),
    sections: draft.sections.map((section) => ({
      heading: section.heading.trim(),
      goal: section.goal.trim(),
      claims: section.claims.map((claim) => claim.text.trim()).filter(Boolean),
    })),
    questionsToAnswer: draft.questionsToAnswer
      .map((question) => question.text.trim())
      .filter(Boolean),
    internalLinks,
    acceptanceChecklist: draft.acceptanceChecklist
      .map((item) => item.text.trim())
      .filter(Boolean),
  });
  return parsed.success ? parsed.data : null;
}

export function replaceAt<T>(items: T[], index: number, value: T): T[] {
  return items.map((item, itemIndex) => (itemIndex === index ? value : item));
}

export function removeAt<T>(items: T[], index: number): T[] {
  return items.filter((_, itemIndex) => itemIndex !== index);
}

export function anchorFromUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) {
    return "";
  }
  try {
    const parsed = new URL(
      trimmed.includes("://") ? trimmed : `https://${trimmed}`
    );
    const lastSegment = parsed.pathname.split("/").filter(Boolean).at(-1);
    if (lastSegment) {
      return decodeURIComponent(lastSegment)
        .replaceAll(/[-_]+/g, " ")
        .replaceAll(/\s+/g, " ")
        .trim();
    }
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return trimmed;
  }
}

export function completePlanLink(link: {
  url: string;
  anchor: string;
  why: string;
}): { url: string; anchor: string; why: string } | null {
  const url = link.url.trim();
  if (!url) {
    return null;
  }
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
  } catch {
    return null;
  }
  const anchor = link.anchor.trim() || anchorFromUrl(url) || url;
  const why = link.why.trim() || CONTENT_PLAN_LINK_DEFAULT_WHY;
  if (!(anchor && why)) {
    return null;
  }
  return { url, anchor, why };
}
