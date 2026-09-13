// Single source of truth for tone profiles lives in `./tone`.
// This module re-exports it so existing `@notra/ai/schemas/brand` imports keep working.
export {
  TONE_PROFILES,
  toneProfileSchema,
  getValidToneProfile,
  type ToneProfile,
} from "./tone";
