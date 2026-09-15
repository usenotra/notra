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

interface ChangelogPromptOptions {
  taskContext: string;
  toneContext: string;
  exampleHighlights: string;
  thinkingInstructions?: string;
}

export function buildChangelogPrompt(options: ChangelogPromptOptions): string {
  return dedent`
    <task-context>
    ${options.taskContext}
    Your task is to generate a comprehensive, well-organized changelog for the provided source targets and timeframe.
    </task-context>

    <tone-context>
    ${options.toneContext}
    </tone-context>

    <rules>
    - ${languageRule}
    - ${toneRule}
    ${factualityRules}

    Audience filtering:
    - For every candidate item, evaluate whether it is internal-only or meaningfully relevant to <target-audience>. If not relevant, omit it entirely. Do not put it in Highlights or More Updates.
    - Internal-only maintenance work (small refactors, formatting, lint-only changes, dependency churn, test-only updates, routine infra chores) should be omitted unless there is a clear audience-relevant impact on reliability, security, performance, compatibility, or user outcomes.
    - Meaningful bug fixes are valid changelog content when they clearly improve user experience, reliability, security, performance, compatibility, or developer workflows. Omit bug fixes that read as internal-only.
    - When relevance is uncertain, prefer omission over weak filler.
    - If <target-audience> is developer-oriented (developers, engineers, technical teams), include verified PR links for referenced changes whenever available.
    - If <target-audience> is non-developer-oriented, do not reference PR numbers or PR links anywhere in the output.
    - For both audiences, keep author attribution when available using this format: (Author: [@\${author}](https://github.com/\${author}/)).

    Structure:
    - Process all relevant pull requests from available data. Align retrieval to the provided lookback window.
    - The summary is a single paragraph immediately after the title line. Target 120-180 words. Go shorter only when there is genuinely less to cover.
    - Do not include a "## Summary" heading. Do not include a TL;DR, Overview, or any preface text before the summary paragraph.
    - The next heading must be ## Highlights.
    - Build a Highlights section with up to five most important changes. Filter aggressively for high-signal updates with clear user, customer, reliability, security, or performance impact.
    - Prioritize highlight selection in this order: Security, Breaking Changes, Major Features, Reliability Fixes, Performance.
    - If there are fewer than five genuinely high-impact changes, include fewer (4, 3, 2, or 1). Do not pad to reach five.
    - Do not number highlight items. Do not name the section "Top 5".
    - Each highlight item: title plus a short, concise description. One sentence is ideal, two maximum.
    - Exclude low-signal PRs from Highlights (small refactors, dependency churn, wording tweaks, minor guardrail cleanups without clear external impact).
    - Every PR that passes audience filtering appears exactly once in either Highlights or More Updates. Filtered-out PRs appear nowhere.
    - More Updates contains bullet lists only under each category, with no paragraph prose.
    - If a PR fits multiple categories, use this priority: Security > Bug Fixes > Features & Enhancements > Performance Improvements > Infrastructure > Internal Changes > Testing > Documentation.
    - Avoid unnecessary product or vendor namedropping in highlight copy unless required for technical clarity.

    Output discipline:
    - Do not include YAML frontmatter or metadata key-value blocks.
    - Do not include reasoning, analysis, or verification notes in the output.
    - Do not use emojis in section headings.
    - Never use em dashes (—) or en dashes (–). Use commas, periods, semicolons, or parentheses instead.

    ${prohibitedLanguage}

    Tool usage:
    - Your very first tool call must be getBrandReferences. Study the returned references to match the brand's voice, vocabulary, and sentence patterns.
    ${sharedToolGuidance}
    - Call getCommitsByTimeframe for each listed source repository using the exact lookback range before drafting Highlights.

    Saving:
    - ${humanizerGuidance}
    - Only call createPost after the content is finalized and you have at least one meaningful, audience-relevant change worth publishing. Do not return the content as text.
    - If you need to revise after creating, call viewPost to review and updatePost to make changes.
    - ${failGuidance}
    - If data exists but every candidate change is filtered out as low-signal, internal-only, maintenance-only, or otherwise not worth mentioning to <target-audience>, do NOT call createPost. Call the skip tool instead. The reason for filtering matters more than reaching a minimum count.
    </rules>

    <examples>
    <example>
    [Summary paragraph, 120-180 words.]

    ## Highlights

    ${options.exampleHighlights}

    ## More Updates

    ### Security
    - **Rotated webhook signing secret handling** [#131](https://github.com/org/repo/pull/131) - Improves secret lifecycle controls. (Author: [@lee](https://github.com/lee/))

    ### Bug Fixes
    - **Fixed null-state crash in trigger editor** [#140](https://github.com/org/repo/pull/140) - Prevents editor crashes for partially configured triggers. (Author: [@sam](https://github.com/sam/))

    ### Features & Enhancements
    - **Added repository filter presets** [#142](https://github.com/org/repo/pull/142) - Speeds up common workflow setup. (Author: [@alex](https://github.com/alex/))
    </example>

    <bad-example>
    ### Enhanced input validation and limits
    Added validation guards and input limits to prevent edge cases, including better snapshot callback dependencies and safer handling of commands menu interactions.

    Why this is bad:
    - Too vague and low-signal for Highlights.
    - Reads like routine internal cleanup without clear user-facing impact.
    - Does not communicate measurable risk reduction or meaningful audience-relevant impact.
    </bad-example>

    <bad-example>
    ### Dependency and lint maintenance updates
    Upgraded several internal packages, adjusted lint rules, and cleaned up formatting across the codebase.

    Why this is bad:
    - Pure maintenance work with no user-visible or operational impact.
    - Belongs in More Updates at most, or omitted if there is nothing else worth publishing.
    </bad-example>
    </examples>

    <the-ask>
    Generate the changelog now.
    When your content is finalized, call createPost with:
    - title: plain text, max 120 characters, no markdown
    - markdown: the full changelog content body as markdown/MDX, without the title heading
    - recommendations: optional markdown string with concise, actionable publishing recommendations. Pass null when there is nothing genuinely useful to suggest.

    The markdown must:
    - Start with the Summary paragraph (target 120-180 words)
    - Not include a "## Summary" heading
    - Use ## Highlights as the next heading, with up to five items based on true importance (do not force five)
    - Format each highlight as:
      ### [Short change title]
      [One concise sentence describing what changed and why it matters]
    - Use a ## More Updates section, with categories: Security, Features & Enhancements, Bug Fixes, Performance Improvements, Infrastructure, Internal Changes, Testing, Documentation
    - Use bullet points only under each category in More Updates (no paragraph prose)
    - Format PR entries as:
      - **[Descriptive Title]** [#\${number}](https://github.com/\${owner}/\${repo}/pull/\${number}) - Brief description of what changed and why it matters. (Author: [@\${author}](https://github.com/\${author}/))

    If a change reads as a maintenance update, an internal change, or a dependency/package update with no audience-relevant impact, omit it from the changelog completely. If those filters leave you with nothing meaningful to publish, do not call createPost. Call skip instead with a concise reason.

    ${recommendationsGuidance}

    You MUST call createPost for the finalized changelog. Do not return the content as text output.

    ${brandIdentityRule}
    </the-ask>

    <thinking-instructions>
    ${options.thinkingInstructions ?? "Think through prioritization, categorization, and full coverage internally before responding. Omit changes that sound like maintenance updates, internal-only changes, or dependency bumps."}
    </thinking-instructions>
  `;
}
