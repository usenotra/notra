import { prohibitedLanguage } from "@notra/ai/prompts/_shared/index";
import { buildToneContext, toneRule } from "@notra/ai/prompts/_shared/tone";
import { GEO_WRITING_RULES } from "@notra/ai/prompts/geo_writer/planner";
import type { GeoWriterPromptInput } from "@notra/ai/types/geo-writer";
import dedent from "dedent";

const MAX_FETCHED_SITEMAP_PAGES = 3;
const MIN_INTERNAL_LINKS = 2;
const MAX_INTERNAL_LINKS = 5;
const MIN_WORDS = 900;
const MAX_WORDS = 1600;

function formatBrief(input: GeoWriterPromptInput): string {
  const { brief } = input;
  const sections = brief.sections
    .map((section, index) => {
      const claims =
        section.claims.length > 0
          ? section.claims.map((claim) => `    - ${claim}`).join("\n")
          : "    - (no required claims)";
      return dedent`
        ${index + 1}. ## ${section.heading}
           Goal: ${section.goal}
           Claims to support:
        ${claims}
      `;
    })
    .join("\n");
  const questions =
    brief.questionsToAnswer.length > 0
      ? brief.questionsToAnswer.map((question) => `- ${question}`).join("\n")
      : "- (none listed; add two or three questions a buyer would ask)";
  const links =
    brief.internalLinks.length > 0
      ? brief.internalLinks
          .map((link) => `- [${link.anchor}](${link.url}) because ${link.why}`)
          .join("\n")
      : "- (no internal links in the brief; copy URLs exactly from getSitemapPages, otherwise use no internal links)";
  const checklist =
    brief.acceptanceChecklist.length > 0
      ? brief.acceptanceChecklist.map((item) => `- ${item}`).join("\n")
      : "- (follow the GEO writing rules)";
  const evidence = formatBriefEvidence(input);

  return dedent`
    Target prompt: ${brief.targetPrompt}
    Intent: ${brief.intent}
    Content type: blog post (${brief.contentSubtype})
    Working title: ${brief.workingTitle}
    Audience: ${brief.audience}
    Job to be done: ${brief.jobToBeDone}

    Sections:
    ${sections}

    FAQ questions to answer:
    ${questions}

    Internal links:
    ${links}

    Acceptance checklist:
    ${checklist}
    ${evidence}
  `;
}

function formatBriefEvidence(input: GeoWriterPromptInput): string {
  const { brief } = input;
  const lines: string[] = [];
  if (brief.recommendedAngle) {
    lines.push(`Recommended angle: ${brief.recommendedAngle}`);
  }
  if (brief.competitorsToCounter && brief.competitorsToCounter.length > 0) {
    lines.push(
      "Brands assistants recommend instead (address each fairly, do not invent facts about them):",
      ...brief.competitorsToCounter.map((item) => `- ${item}`)
    );
  }
  if (brief.missingCoverage && brief.missingCoverage.length > 0) {
    lines.push(
      "Coverage the winning answers had that this article must include:",
      ...brief.missingCoverage.map((item) => `- ${item}`)
    );
  }
  if (brief.sourcesToReference && brief.sourcesToReference.length > 0) {
    lines.push(
      "Domains assistants cite for this prompt (match their depth, only reference them when the brand facts support it):",
      ...brief.sourcesToReference.map((item) => `- ${item}`)
    );
  }
  if (brief.baseline) {
    lines.push(
      `Baseline: the brand is mentioned by ${brief.baseline.mentionedEngines} of ${brief.baseline.totalEngines} engines today. The goal is to raise that after this article is published.`
    );
  }
  if (lines.length === 0) {
    return "";
  }
  return `\nEvidence from the latest scan:\n${lines.join("\n")}`;
}

export function buildGeoWriterInstructions(
  input: GeoWriterPromptInput
): string {
  return dedent`
    You are a senior writer producing one article for ${input.brandName}. The article must be understood, quoted, and cited by AI assistants (ChatGPT, Claude, Perplexity, Gemini, Google AI Overviews). An approved brief tells you what to write. Follow it.

    <brief>
    ${formatBrief(input)}
    </brief>

    <topic-notes>
    ${input.topic}
    </topic-notes>

    Today's date: ${input.today}
    ${buildToneContext({ toneProfile: input.toneProfile, customTone: input.customTone })}

    Do these steps in order:

    1. Call getBrandReferences to learn the brand voice and any reference material. Call searchBrandReferences if you need a specific fact.
    2. Call getGeoContext to see which prompts competitors win, what the brand is called, and who the competitors are. Use it for positioning and fair comparisons.
    3. Call getSitemapPages to confirm which brand pages exist. Call fetchSitemapPage on at most ${MAX_FETCHED_SITEMAP_PAGES} pages you plan to link so your description of them is accurate.
    4. Optionally call listAvailableSkills and getSkillByName if an organization skill (for example "blog-post") describes house style you should follow. Skip the "humanizer" skill; a separate pass handles that.
    5. Write the article as markdown and call createBlogPost exactly once with the title, a URL slug, and the markdown body. Do not pass recommendations. Do not return the article as plain text.
    6. If something makes the task impossible, call fail with a concise reason.

    Article structure (markdown, do not repeat the title as an H1):
    - First paragraph: answer "${input.brief.targetPrompt}" directly within the first 100 words. Include one sentence that names ${input.brandName}, its product category, and who it is for.
    - An "Updated ${input.monthYear}" line right after the first paragraph, in italics.
    - One ## section per brief section, in the brief's order, using the brief's headings (you may tighten wording). Support every listed claim. Use ### subheadings, bullet lists, tables, or numbered steps where they make the content easier to extract.
    - A ## FAQ section at the end. Each question becomes a ### heading followed by a direct answer of two to four sentences.
    - ${MIN_INTERNAL_LINKS} to ${MAX_INTERNAL_LINKS} internal links to ${input.brandName} pages. Copy URLs exactly from the brief or from getSitemapPages. Never invent, rewrite, or guess URLs. If getSitemapPages returns no pages and the brief has no internal links, use no internal links.
    - Length: ${MIN_WORDS} to ${MAX_WORDS} words. Density over padding.

    GEO writing rules:
    ${GEO_WRITING_RULES}

    Voice:
    - Call getBrandReferences first. Use it for facts and product vocabulary. If no <tone> block is provided, also mirror the brand's sentence patterns.
    - ${toneRule}

    Factual rules:
    - Only state facts that come from the brief, the topic notes, brand references, GEO context, or fetched pages. Never invent statistics, quotes, customer names, pricing, or competitor features.
    - If a claim from the brief cannot be supported by available material, soften it to what is supported or drop it. Do not fabricate support.
    - Competitor mentions must be fair and specific. No bashing.

    ${prohibitedLanguage}

    ## Output rules (hard)
    - The brief and topic notes are internal instructions, not article content. Never copy field labels, Intent, Type, Content type, Audience, Job to be done, outline goals, the acceptance checklist, or planning notes into the title or markdown body. Reuse the target prompt wording once, verbatim, in the opening answer or an H2. Use everything else only to guide the article.
    - NEVER use em dashes or en dashes anywhere in the title, slug, or body. Use commas, periods, semicolons, parentheses, or a hyphen (-).
    - No preamble, no "In this article". Start with the answer.
    - Write in ${input.language}.
  `;
}
