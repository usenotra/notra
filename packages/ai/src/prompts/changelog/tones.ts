import {
  TONE_SCOPE_NOTE,
  TONE_VARIANTS_OPEN_TAG,
} from "@notra/ai/constants/tones";
import type { ToneProfile } from "@notra/ai/schemas/tone";
import dedent from "dedent";

export interface ChangelogToneVariant {
  tone: ToneProfile;
  toneContext: string;
  exampleHighlights: string;
}

const PROFESSIONAL_HIGHLIGHTS = dedent`
  ### Cache component support with actionable error guidance
  Cached auth calls now validate at runtime and return clear migration guidance when a call is unsupported.

  ### Email link verification for signup flows
  Signup verification completes through secure email links, with defined handling for expiration and mismatch cases.

  ### Async initial state support for modern React apps
  Auth state resolves asynchronously at the hook, which keeps root layouts free of extra loading logic.
`;

const CASUAL_HIGHLIGHTS = dedent`
  ### Cache component support with actionable error guidance
  Cached auth calls used to fail quietly. Now they tell you what went wrong and how to fix it.

  ### Email link verification for signup flows
  Signup links work end to end now, including the tricky cases like expired or mismatched links.

  ### Async initial state support for modern React apps
  Auth state loads on its own at the hook, so your root layout stays tidy.
`;

const FORMAL_HIGHLIGHTS = dedent`
  ### Cache component support with actionable error guidance
  Runtime validation now detects unsupported authentication calls in cached contexts and provides the correct usage pattern.

  ### Email link verification for signup flows
  The verification procedure covers secure link completion, expiration handling, and mismatch reporting.

  ### Async initial state support for modern React apps
  Authentication state resolution occurs asynchronously at the hook level, preserving the structure of root layouts.
`;

export const CHANGELOG_TONE_VARIANTS: Record<
  Exclude<ToneProfile, "Conversational">,
  ChangelogToneVariant
> = {
  Professional: {
    tone: "Professional",
    toneContext: dedent`
      Professional tone: clear, confident, and outcome focused. Sound like a product team writing for customers and stakeholders.
      Name the result first, then who it helps. Keep sentences polished and complete.
    `,
    exampleHighlights: PROFESSIONAL_HIGHLIGHTS,
  },
  Casual: {
    tone: "Casual",
    toneContext: dedent`
      Casual tone: friendly, relaxed, and plain spoken. Sound like a teammate sharing news with the community.
      Keep lines short and wording simple. A little warmth is good, but keep every claim specific.
    `,
    exampleHighlights: CASUAL_HIGHLIGHTS,
  },
  Formal: {
    tone: "Formal",
    toneContext: dedent`
      Formal tone: precise, structured, and traditional. Sound like an engineering team writing for regulated or academic readers.
      Use complete sentences and careful terms. State scope before detail.
    `,
    exampleHighlights: FORMAL_HIGHLIGHTS,
  },
};

export function buildChangelogToneAppendix(): string {
  const sections = (
    Object.keys(CHANGELOG_TONE_VARIANTS) as Array<
      Exclude<ToneProfile, "Conversational">
    >
  )
    .map((tone) => {
      const variant = CHANGELOG_TONE_VARIANTS[tone];
      return dedent`
        ## ${tone}
        <tone-context>
        ${variant.toneContext}
        </tone-context>
        <sample-highlights>
        ${variant.exampleHighlights}
        </sample-highlights>
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
