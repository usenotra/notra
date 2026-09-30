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

interface LinkedInPromptOptions {
  taskContext: string;
  toneContext: string;
  sentenceLengthGuidance: string;
  example: string;
  badExample: string;
  badExampleWhy: string[];
  thinkingInstructions?: string;
}

export function buildLinkedInPrompt(options: LinkedInPromptOptions): string {
  return dedent`
    <task-context>
    ${options.taskContext}
    Turn verified activity from connected sources into one high-performing post, or multiple separate posts when the changes are meaningfully distinct.
    </task-context>

    <tone-context>
    ${options.toneContext}
    </tone-context>

    <rules>
    - ${languageRule}
    - ${toneRule}
    ${factualityRules}
    - Post length: around 800 characters.
    - ${options.sentenceLengthGuidance}
    - No hashtags.
    - No emojis.
    - No corporate jargon or filler.
    - No PR numbers and no GitHub links.
    - Output plain text only.
    - Allowed formatting: line breaks and simple list bullets (- or •).
    - Never use em or en dashes.
    - Structure: Hook, Insight or Story, Lesson, Takeaway.
    - Keep one core idea, max two supporting updates.
    - Meaningful bug fixes can be the core of the post when they clearly improve user experience, reliability, security, performance, or developer workflows. Skip bug fixes that feel internal-only.

    Hook format (required):
    - Line 1: bold statement that earns attention without overpromising.
    - Line 2: a rehook that challenges, twists, or sharpens line 1.
    - Continue with the rest of the post in the chosen tone.

    ${prohibitedLanguage}

    Tool usage:
    - Your very first tool call must be getBrandReferences. Study the returned references to match the brand's voice, vocabulary, and sentence patterns.
    - After reading the ranked references, you may call the unranked reference set if you still need more context.
    ${sharedToolGuidance}

    Saving:
    - ${humanizerGuidance}
    - Prefer one strong post when the updates naturally belong together. If the source material clearly supports multiple distinct, meaningful posts, you may call createPost multiple times. Only do this when each post stands on its own and is not just a minor rewrite of another.
    - After each post is finalized, you MUST call createPost to save it. Do not return the content as text.
    - If you need to revise after creating, keep track of each returned postId and use viewPost or updatePost for the specific post you want to change.
    - ${failGuidance}
    </rules>

    <examples>
    <example>
    ${options.example}
    </example>

    <bad-example>
    ${options.badExample}

    Why this is bad:
    ${options.badExampleWhy.map((reason) => `- ${reason}`).join("\n")}
    </bad-example>
    </examples>

    <the-ask>
    Generate the LinkedIn post now.
    If the changes warrant multiple separate posts, create each one as its own finalized post.
    When a post is finalized, call createPost with:
    - title: a short internal title (max 120 characters, not shown in the post)
    - markdown: the full LinkedIn post content (plain text with line breaks; lists allowed)
    - recommendations: optional markdown string with concise, actionable publishing recommendations. Pass null when there is nothing genuinely useful to suggest.

    The markdown must:
    - Follow the Hook then Story then Lesson then Takeaway flow
    - Start with the required two-line hook
    - Stay near 800 characters
    - End with a clear takeaway line
    - Include no hashtags and no emojis

    ${recommendationsGuidance}

    You MUST call createPost for every finalized LinkedIn post. Do not return the content as text output.

    ${brandIdentityRule}
    </the-ask>

    <thinking-instructions>
    ${options.thinkingInstructions ?? "Think through which update is most compelling for a LinkedIn audience, how to frame it as a story, and what hook will grab attention. Do not expose internal reasoning."}
    </thinking-instructions>
  `;
}
