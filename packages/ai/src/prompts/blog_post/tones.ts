import {
  TONE_SCOPE_NOTE,
  TONE_VARIANTS_OPEN_TAG,
} from "@notra/ai/constants/tones";
import type { ToneProfile } from "@notra/ai/schemas/tone";
import dedent from "dedent";

export interface BlogPostToneVariant {
  tone: ToneProfile;
  toneContext: string;
  voiceTraits: string;
  sample: string;
}

export const BLOG_POST_TONE_VARIANTS: Record<
  Exclude<ToneProfile, "Conversational">,
  BlogPostToneVariant
> = {
  Professional: {
    tone: "Professional",
    toneContext: dedent`
      Write with clarity and confidence, like a product team explaining work that matters to customers.
      Lead with outcomes, then explain how the work supports them. Avoid slang and filler.
    `,
    voiceTraits: dedent`
      - Open with a clear statement of what changed and why it matters to the reader.
      - Use "we" sparingly and keep the focus on the reader's outcome.
      - Explain tradeoffs plainly when they affect adoption or cost.
      - Keep paragraphs structured: claim, evidence, implication.
      - Close with what is available now and where to read more.
    `,
    sample: dedent`
      We added multi-model support to the editor this week. You can now choose the model that fits the task from the command palette, and your context carries over when you switch.
      The larger change sits underneath: the indexing pipeline now uses semantic search across your codebase, so questions return relevant code based on meaning instead of keyword overlap. Early use shows fewer missing-context responses and faster first answers.
    `,
  },
  Casual: {
    tone: "Casual",
    toneContext: dedent`
      Write like a teammate telling a story they care about. Keep it light, honest, and easy to follow.
      Short paragraphs help. Say what surprised you and what you would try next.
    `,
    voiceTraits: dedent`
      - Open with the moment that made the work interesting.
      - Use everyday words and short paragraphs.
      - Show one concrete example before generalizing.
      - Admit what is still rough or unfinished.
      - Close with a simple pointer to try it out.
    `,
    sample: dedent`
      Picking a model for each task used to mean opening a new session and starting over. That got old fast.
      Now you pick from the command palette and keep going. Underneath, search got a real upgrade too: it matches on meaning, so "where do we retry webhooks" finds the retry code even when the words differ. Give it a spin and tell us where it still misses.
    `,
  },
  Formal: {
    tone: "Formal",
    toneContext: dedent`
      Write with precision and care, like an engineering report for a demanding reader.
      Define terms, state scope, and separate observation from interpretation.
    `,
    voiceTraits: dedent`
      - Open by stating the subject and scope of the post.
      - Present changes in logical order, each with its purpose and effect.
      - Use complete sentences and consistent terminology throughout.
      - Support claims with concrete behavior or measurement, not adjectives.
      - Close with a summary of current status and planned next steps.
    `,
    sample: dedent`
      This post describes two related changes to the editor: selectable language models and semantic code indexing.
      Model selection is now available from the command palette, and session context is preserved across switches. The indexing pipeline evaluates queries by meaning in addition to keyword overlap, which increases the relevance of retrieved code for natural language questions. Both changes are available in the current release.
    `,
  },
};

export function buildBlogPostToneAppendix(): string {
  const sections = (
    Object.keys(BLOG_POST_TONE_VARIANTS) as Array<
      Exclude<ToneProfile, "Conversational">
    >
  )
    .map((tone) => {
      const variant = BLOG_POST_TONE_VARIANTS[tone];
      return dedent`
        ## ${tone}
        <tone-context>
        ${variant.toneContext}
        Key traits of this voice:
        ${variant.voiceTraits}
        </tone-context>
        <sample>
        ${variant.sample}
        </sample>
      `;
    })
    .join("\n\n");

  return dedent`
    ${TONE_VARIANTS_OPEN_TAG}
    The default voice of this skill is Conversational: warm and authentic, like a teammate sharing something they built.
    When the user prompt includes a <tone> value other than Conversational, follow that tone's section below instead. Match its sentence style, wording, and sample rhythm.
    ${TONE_SCOPE_NOTE}
    ${sections}
    </tone-variants>
  `;
}
