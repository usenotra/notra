import {
  TONE_SCOPE_NOTE,
  TONE_VARIANTS_OPEN_TAG,
} from "@notra/ai/constants/tones";
import type { ToneProfile } from "@notra/ai/schemas/tone";
import dedent from "dedent";

export interface TwitterToneVariant {
  tone: ToneProfile;
  toneContext: string;
  example: string;
}

export const TWITTER_TONE_VARIANTS: Record<
  Exclude<ToneProfile, "Conversational">,
  TwitterToneVariant
> = {
  Professional: {
    tone: "Professional",
    toneContext: dedent`
      Professional tone: clear, confident, and plain. Sound like a product account stating a fact.
      One sentence of context, one of result. No slang, no exclamation, no hype.
    `,
    example: dedent`
      Cached auth calls now validate at runtime.
      Unsupported calls return the correct pattern instead of failing quietly.
    `,
  },
  Casual: {
    tone: "Casual",
    toneContext: dedent`
      Casual tone: relaxed and friendly. Sound like a person, not an account.
      Keep it short and plain. Light humor is fine when the fact stays clear.
    `,
    example: dedent`
      Cached auth errors finally say something useful.
      They now point at the fix instead of leaving you guessing.
    `,
  },
  Formal: {
    tone: "Formal",
    toneContext: dedent`
      Formal tone: measured and exact. Sound like a status update for careful readers.
      State what changed and its effect. Complete sentences only.
    `,
    example: dedent`
      Runtime validation now covers authentication calls in cached contexts.
      Unsupported patterns are reported with the correct usage.
    `,
  },
};

export function buildTwitterToneAppendix(): string {
  const sections = (
    Object.keys(TWITTER_TONE_VARIANTS) as Array<
      Exclude<ToneProfile, "Conversational">
    >
  )
    .map((tone) => {
      const variant = TWITTER_TONE_VARIANTS[tone];
      return dedent`
        ## ${tone}
        <tone-context>
        ${variant.toneContext}
        </tone-context>
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
