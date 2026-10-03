import type { LanguageModelV4Prompt } from "@ai-sdk/provider";
import { DEMO_FAKE_PARAGRAPHS } from "@notra/ai/constants/demo-responses";

const BRIEF_SECTION_HEADING = /^\s*\d+\.\s+##\s+(.+?)\s*$/gm;
const ARTICLE_TITLE = /write the article "([^"]+)"/i;
const SECTION_GOAL = /^\s*Goal:\s*(.+?)\s*$/gm;
const NON_SLUG_CHARACTERS = /[^a-z0-9]+/g;

export function demoSlug(title: string): string {
  return title
    .toLowerCase()
    .replaceAll(NON_SLUG_CHARACTERS, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Tools the GEO writer agent has: research first, then save. */
export const DEMO_WRITER_TOOLS = ["webSearch", "createBlogPost"] as const;

export function calledTools(prompt: LanguageModelV4Prompt): Set<string> {
  const names = new Set<string>();
  for (const message of prompt) {
    if (message.role !== "tool") {
      continue;
    }
    for (const part of message.content) {
      if (part.type === "tool-result") {
        names.add(part.toolName);
      }
    }
  }
  return names;
}

/**
 * Article for the GEO writer: one H2 per brief section (the save gate checks
 * them) and an FAQ, built from the brief in the instructions.
 */
export function demoWriterArticle(promptText: string): {
  title: string;
  markdown: string;
} {
  const title =
    ARTICLE_TITLE.exec(promptText)?.[1] ??
    "How teams make meeting decisions searchable";
  const headings = [...promptText.matchAll(BRIEF_SECTION_HEADING)]
    .map((match) => match[1]?.trim() ?? "")
    .filter(Boolean);
  const goals = [...promptText.matchAll(SECTION_GOAL)].map(
    (match) => match[1]?.trim() ?? ""
  );
  const paragraphs = DEMO_FAKE_PARAGRAPHS.en;
  const sections = (headings.length > 0 ? headings : ["Overview"]).map(
    (heading, index) =>
      [
        `## ${heading}`,
        goals[index] ?? "",
        paragraphs[(index + 1) % paragraphs.length],
      ]
        .filter(Boolean)
        .join("\n\n")
  );
  const markdown = [
    `${title} comes down to one thing: decisions have to be easy to find later. ${paragraphs[0]}`,
    ...sections,
    "## FAQ",
    "### How long does setup take?\n\nMost teams connect their calendar and record the first meeting in under ten minutes. Summaries arrive a few minutes after each call.",
    "### Does it work with Slack and Linear?\n\nYes. Summaries can be posted to a Slack channel and action items can be sent to Linear with a link back to the moment in the meeting.",
  ].join("\n\n");
  return { title, markdown };
}

const TOPIC_BLOCK = /<topic>\s*([\s\S]*?)\s*<\/topic>/i;
const BRAND_NAME_LINE = /^\s*Name:\s*([^(\n]+)/m;
const MAX_TITLE_LENGTH = 120;

function sentenceCase(value: string): string {
  const trimmed = value.trim().replace(/[.?!]+$/, "");
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

/**
 * Brief for the GEO writer's planner, built around the visitor's topic so
 * the plan (and the article written from it) is about what they asked for.
 */
export function demoWriterBrief(promptText: string) {
  const topic =
    TOPIC_BLOCK.exec(promptText)?.[1]?.split("\n")[0]?.trim() ||
    "Making meeting decisions searchable";
  const brand = BRAND_NAME_LINE.exec(promptText)?.[1]?.trim() || "Fieldnote";
  const subject = sentenceCase(topic).slice(0, 80);
  const lowerSubject = subject.charAt(0).toLowerCase() + subject.slice(1);
  return {
    targetPrompt: topic.endsWith("?")
      ? topic
      : `What is the best way to approach ${lowerSubject}?`,
    intent: "Commercial investigation: the reader is comparing approaches.",
    contentSubtype: "guide",
    workingTitle: `${subject}: a practical guide`.slice(0, MAX_TITLE_LENGTH),
    audience: "Product and engineering leads at remote software teams.",
    jobToBeDone: `Decide how to handle ${lowerSubject} without adding meetings.`,
    sections: [
      {
        heading: `Why ${lowerSubject} matters`,
        goal: "Explain the cost of getting this wrong for a growing team.",
        claims: ["Decisions made in calls are hard to find a week later."],
      },
      {
        heading: "How teams handle it today",
        goal: "Compare the common approaches and where they break down.",
        claims: ["Manual notes depend on one person and go stale."],
      },
      {
        heading: `How ${brand} helps`,
        goal: `Show what ${brand} automates and what stays with the team.`,
        claims: [`${brand} links every summary to the moment in the call.`],
      },
      {
        heading: "Getting started in a week",
        goal: "Give a short rollout plan the reader can follow.",
        claims: ["Start with one recurring meeting and expand from there."],
      },
    ],
    questionsToAnswer: [
      `How long does it take to set up ${brand}?`,
      "Does this work for teams across time zones?",
    ],
    internalLinks: [],
    acceptanceChecklist: [
      "Answers the target prompt in the first paragraph.",
      "Every section contains at least one concrete example.",
    ],
  };
}
