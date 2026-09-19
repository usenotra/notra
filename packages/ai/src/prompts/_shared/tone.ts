import { TONE_PROFILE_GUIDANCE } from "@notra/ai/constants/tone";
import type { ToneProfile } from "@notra/ai/schemas/tone";
import dedent from "dedent";

export const toneRule = dedent`
  TONE RULE: If a <tone> block is provided, it is the voice of the linked brand identity and overrides the default tone described in this skill. Match it in word choice, sentence rhythm, and register. It changes how things are phrased, never the structure, facts, audience, language, length, or formatting rules above. If <tone> contains custom notes, follow those notes instead of any named profile.
`;

export function buildToneContext(input: {
  toneProfile?: ToneProfile | null;
  customTone?: string | null;
}): string {
  const customTone = input.customTone?.trim();
  if (customTone) {
    return `\n<tone>\nCustom tone from the brand identity. Follow these notes for voice:\n${customTone}\n</tone>`;
  }

  if (!input.toneProfile) {
    return "";
  }

  return `\n<tone profile="${input.toneProfile}">\n${TONE_PROFILE_GUIDANCE[input.toneProfile]}\n</tone>`;
}
