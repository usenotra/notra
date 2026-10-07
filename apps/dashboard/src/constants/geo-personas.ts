import type {
  GeoPersonaMemoryKind,
  GeoPersonaProfile,
} from "@notra/db/types/geo-personas";

import type { PersonaDialogView } from "@/types/geo-personas-ui";

export const GEO_PERSONA_RESULTS_POLL_MS = 15_000;
export const GEO_PERSONA_FORECAST_DAYS = 7;
export const GEO_PERSONA_FORECAST_SAMPLE_DAYS = 7;
/** The activity chart's y-axis never shrinks below this ceiling (percent). */
export const GEO_PERSONA_CHART_MIN_MAX = 20;
/** Headroom steps for the y-axis ceiling (percent). */
export const GEO_PERSONA_CHART_MAX_STEP = 10;
export const GEO_PERSONA_DIALOG_VIEWS = [
  "conversation",
  "prompts",
  "profile",
] as const satisfies readonly PersonaDialogView[];

/**
 * Generation is one model call with no server-side progress, so the counter
 * is paced on elapsed time. The last step holds until the response lands.
 */
export const GEO_PERSONA_GENERATION_STEPS = [
  { key: "readingSite", afterMs: 0 },
  { key: "writingProfiles", afterMs: 12_000 },
  { key: "writingMemories", afterMs: 35_000 },
  { key: "indexingMemories", afterMs: 65_000 },
] as const;
export const GEO_PERSONA_GENERATION_TICK_MS = 500;

export const GEO_PERSONAS_MEMORIES_COLUMN_WIDTH = "6.5rem";
export const GEO_PERSONAS_TURNS_COLUMN_WIDTH = "9rem";
export const GEO_PERSONAS_ACTIONS_COLUMN_WIDTH = "6rem";
export const GEO_PERSONAS_MIN_TABLE_ROWS = 3;

export const GEO_PERSONA_SKELETON_ROW_COUNT = 5;

/** Render size of the DiceBear SVG; it scales down crisply to any avatar size. */
export const GEO_PERSONA_AVATAR_SIZE = 96;
/** Soft backgrounds so the illustration reads on both light and dark surfaces. */
export const GEO_PERSONA_AVATAR_BACKGROUNDS = [
  "#b6e3f4",
  "#c0aede",
  "#d1d4f9",
  "#ffd5dc",
  "#ffdfbf",
] as const;

/** Order the memory groups appear in on the detail dialog. */
export const GEO_PERSONA_MEMORY_KIND_ORDER: readonly GeoPersonaMemoryKind[] = [
  "background",
  "experience",
  "preference",
  "constraint",
];

export const GEO_PERSONA_PROFILE_SECTIONS = [
  { key: "goals" },
  { key: "painPoints" },
  { key: "currentStack" },
  { key: "buyingTriggers" },
  { key: "objections" },
] as const satisfies readonly {
  key: keyof GeoPersonaProfile;
}[];
