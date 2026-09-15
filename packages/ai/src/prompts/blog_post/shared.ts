import dedent from "dedent";

import {
  brandIdentityRule,
  factualityRules,
  failGuidance,
  humanizerGuidance,
  languageRule,
  prohibitedLanguage,
  recommendationsGuidance,
  sharedToolGuidance,
} from "../_shared";
import { toneRule } from "../_shared/tone";

interface BlogPostPromptOptions {
  taskContext: string;
  toneContext: string;
  voiceModel: string;
  voiceTraits: string;
  voiceExamples: string;
  exampleArticle: string;
  badExample: string;
  thinkingInstructions?: string;
}

export function buildBlogPostPrompt(options: BlogPostPromptOptions): string {
  return dedent`
    <task-context>
    ${options.taskContext}
    Your task is to generate a compelling, narrative blog post based on recent engineering work from the provided source targets and timeframe.
    This is NOT a changelog. This is a blog post that tells a story about what was built, why it matters, and how it works.
    </task-context>

    <tone-context>
    ${options.toneContext}

    Voice model:
    ${options.voiceModel}

    Key traits of this voice:
    ${options.voiceTraits}
    </tone-context>

    <voice-examples>
    These are real excerpts from blogs that match this tone. Study the rhythm, structure, and word choice. Mirror this style.

    ${options.voiceExamples}
    </voice-examples>

    <rules>
    - ${languageRule}
    - ${toneRule}
    ${factualityRules}
    - Process all relevant pull requests and commits from available data before drafting. Do not cherry-pick a subset and ignore the rest.
    - This is a narrative blog post, not a changelog. Do not use changelog formatting (no Highlights or More Updates sections, no bullet-point lists of PRs).
    - Focus on the 1 to 3 most interesting or impactful themes from the lookback window. Group related changes into a cohesive narrative rather than listing every PR.
    - Lead with the why and the user impact, not the implementation details. Technical depth should support the narrative, not replace it.
    - Use ## level headings to break the post into readable sections. Each section should flow naturally into the next.
    - Include code snippets, API examples, or before/after comparisons when they make the post more concrete and useful. Use fenced code blocks with language tags.
    - When <target-audience> is developer-oriented, you may reference specific PRs inline where they add credibility or let readers dig deeper. Use the format: [#number](url).
    - When <target-audience> is non-developer-oriented, do not reference PR numbers or links. Focus on outcomes and user-facing impact.
    - Mention contributors inline when relevant (e.g., "built by [@author](https://github.com/author/)") rather than appending attribution to every item.
    - Internal-only maintenance work (small refactors, formatting, lint-only changes, dependency churn, test-only updates, routine infra chores) should be omitted unless there is clear external impact.
    - Meaningful bug fixes can drive the post when they clearly improve user experience, reliability, security, performance, or developer workflows. Skip bug fixes that read as internal-only maintenance.
    - Target 400 to 800 words for the body (excluding title). Shorter is fine if there is genuinely less to cover; longer only when a single theme requires depth.
    - Do not include YAML frontmatter or metadata key-value blocks.
    - Do not include reasoning, analysis, or verification notes in the output.
    - Do not use emojis in section headings.
    - Never use em or en dashes. Use commas, periods, semicolons, or parentheses instead.

    ${prohibitedLanguage}

    Tool usage:
    - Your very first tool call must be getBrandReferences. Study the returned references to match the brand's voice, vocabulary, and sentence patterns.
    ${sharedToolGuidance}
    - Call getCommitsByTimeframe for each listed source repository using the exact lookback range before drafting. Do not skip repositories or rely on partial data.

    Saving:
    - ${humanizerGuidance}
    - After the content is finalized, you MUST call createPost to save it. Do not return the content as text.
    - If you need to revise after creating, call viewPost to review and updatePost to make changes.
    - ${failGuidance}
    </rules>

    <examples>
    ${options.exampleArticle}

    <bad-example>
    ${options.badExample}
    </bad-example>
    </examples>

    <the-ask>
    Generate the blog post now.
    When your content is finalized, call createPost with:
    - title: plain text, max 120 characters, no markdown. Make it specific and interesting, not generic.
    - markdown: the full blog post body as markdown, without the title heading.
    - recommendations: optional markdown string with concise, actionable publishing recommendations. Pass null when there is nothing genuinely useful to suggest.

    The markdown must:
    - Open with a strong lead paragraph (2 to 4 sentences) that tells the reader what changed and why they should care
    - Use ## headings to break content into sections that flow as a narrative
    - Focus on 1 to 3 key themes rather than covering every change
    - Include code snippets or concrete examples when they add clarity
    - End with a brief forward-looking closing (1 to 2 sentences, no "stay tuned" cliches)
    - Target 400 to 800 words
    - Not use changelog formatting (no Highlights or More Updates sections, no PR bullet lists)
    - Read like a blog post a developer would actually want to read

    ${recommendationsGuidance}

    You MUST call createPost to save the blog post. Do not return the content as text output.

    ${brandIdentityRule}
    </the-ask>

    <thinking-instructions>
    ${options.thinkingInstructions ?? "Think through what the most interesting themes are. Group related changes. Find the narrative thread. Be honest and direct. Skip anything that is not genuinely interesting."}
    </thinking-instructions>
  `;
}
