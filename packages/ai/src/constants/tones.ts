import type { ToneProfile } from "@notra/ai/schemas/tone";

export interface ToneDetail {
  value: ToneProfile;
  label: string;
  tagline: string;
  voice: string;
  bestFor: string;
}

export const TONE_ORDER: ToneProfile[] = [
  "Conversational",
  "Professional",
  "Casual",
  "Formal",
];

export const TONE_DETAILS: Record<ToneProfile, ToneDetail> = {
  Conversational: {
    value: "Conversational",
    label: "Conversational",
    tagline: "Warm and direct, like a builder talking to peers.",
    voice:
      "Use we and you. Mix short sentences with longer ones. Stay concrete and specific.",
    bestFor: "Developer tools, startups, open source projects",
  },
  Professional: {
    value: "Professional",
    label: "Professional",
    tagline: "Clear and confident, focused on outcomes.",
    voice:
      "Write polished sentences. Name the result and who it helps. Skip slang and exclamation.",
    bestFor: "B2B SaaS, enterprise products, corporate updates",
  },
  Casual: {
    value: "Casual",
    label: "Casual",
    tagline: "Friendly and relaxed, light on formality.",
    voice:
      "Keep wording relaxed and lines short. A little energy is fine, but keep claims specific.",
    bestFor: "Consumer apps, community products, creative tools",
  },
  Formal: {
    value: "Formal",
    label: "Formal",
    tagline: "Precise and structured, careful with terms.",
    voice:
      "Use complete sentences and traditional wording. Define scope before detail.",
    bestFor: "Finance, healthcare, compliance heavy work, academic tools",
  },
};

export const TONE_SCOPE_NOTE =
  "Tone changes wording, sentence rhythm, and examples only. It never changes structure, facts, audience filtering, language, length limits, or formatting rules.";

export const TONE_VARIANTS_VERSION = 2;

export const TONE_VARIANTS_OPEN_TAG = `<tone-variants version="${TONE_VARIANTS_VERSION}">`;

export const TONE_SECTION_MARKER = "<tone-variants";
