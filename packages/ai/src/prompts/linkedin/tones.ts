import {
  TONE_SCOPE_NOTE,
  TONE_VARIANTS_OPEN_TAG,
} from "@notra/ai/constants/tones";
import type { ToneProfile } from "@notra/ai/schemas/tone";
import dedent from "dedent";

export interface LinkedInToneVariant {
  tone: ToneProfile;
  toneContext: string;
  sentenceLengthGuidance: string;
  example: string;
}

export const LINKEDIN_TONE_VARIANTS: Record<
  Exclude<ToneProfile, "Conversational">,
  LinkedInToneVariant
> = {
  Professional: {
    tone: "Professional",
    toneContext: dedent`
      Professional tone: assured and businesslike. Sound like a founder writing for peers and customers.
      Frame the work as a decision with a reason, then give the result.
    `,
    sentenceLengthGuidance:
      "Keep sentences complete and even. Most lines should run 10 to 18 words. Avoid fragments.",
    example: dedent`
      We changed how cached auth calls fail.

      Too many teams lost time to errors that said nothing about the cause. That cost trust in the integration.

      The runtime now validates these calls and returns:
      - The reason the call is unsupported
      - The exact pattern to use instead
      - No extra round trip to find it

      Small fix. Fewer dead ends for every team that builds on us.
    `,
  },
  Casual: {
    tone: "Casual",
    toneContext: dedent`
      Casual tone: open and easygoing. Sound like a person thinking out loud.
      Keep the story personal and the lesson plain.
    `,
    sentenceLengthGuidance:
      "Keep lines short and loose. Most lines should stay under 12 words. Fragments are fine when they read naturally.",
    example: dedent`
      My least favorite error message is fixed.

      Cached auth calls used to fail with zero explanation. Everyone just stared at it.

      Now they say:
      - What went wrong
      - What to type instead
      - Done

      Took longer than I want to admit. Worth it.
    `,
  },
  Formal: {
    tone: "Formal",
    toneContext: dedent`
      Formal tone: measured and careful. Sound like an industry note for a serious audience.
      State the problem, the response, and the effect in that order.
    `,
    sentenceLengthGuidance:
      "Use complete sentences of even length. Most lines should run 12 to 20 words. Avoid fragments and colloquial openings.",
    example: dedent`
      Authentication errors in cached contexts required clearer reporting.

      Reports often omitted the cause, which slowed resolution and weakened confidence in the integration.

      The runtime now validates each call and returns:
      - The reason the pattern is unsupported
      - The correct usage to apply
      - No further lookup required

      The result is faster resolution and consistent behavior across implementations.
    `,
  },
};

export function buildLinkedInToneAppendix(): string {
  const sections = (
    Object.keys(LINKEDIN_TONE_VARIANTS) as Array<
      Exclude<ToneProfile, "Conversational">
    >
  )
    .map((tone) => {
      const variant = LINKEDIN_TONE_VARIANTS[tone];
      return dedent`
        ## ${tone}
        <tone-context>
        ${variant.toneContext}
        </tone-context>
        Sentence guidance: ${variant.sentenceLengthGuidance}
        <sample>
        ${variant.example}
        </sample>
      `;
    })
    .join("\n\n");

  return dedent`
    ${TONE_VARIANTS_OPEN_TAG}
    The default voice of this skill is Conversational: warm, direct, and specific, written like a thoughtful builder.
    When the user prompt includes a <tone> value other than Conversational, follow that tone's section below instead. Match its sentence style, wording, and sample rhythm.
    ${TONE_SCOPE_NOTE}
    ${sections}
    </tone-variants>
  `;
}
