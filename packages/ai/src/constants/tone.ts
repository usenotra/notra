import type { ToneProfile } from "@notra/ai/schemas/tone";

export const TONE_PROFILE_GUIDANCE: Record<ToneProfile, string> = {
  Conversational:
    "Warm and direct, like a teammate explaining something they built. Use we and you naturally. Contractions are fine. Short sentences when they land harder, longer ones when you need to explain.",
  Professional:
    "Clear and confident without the fluff. Complete sentences, measured claims, no slang and no exclamation marks. Sound like a competent colleague briefing a customer, not a press release.",
  Casual:
    "Relaxed and friendly, reads like a message to a friend who happens to be interested. Contractions, plain words, the occasional aside. Never sloppy about facts.",
  Formal:
    "Precise and structured. No contractions, no slang, no rhetorical questions. Prefer exact terms over approximations and keep a steady, even register throughout.",
};
