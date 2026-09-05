import type {
  GeoPersonaMemoryKind,
  GeoPersonaProfile,
} from "@notra/db/types/geo-personas";

import type { PersonaDialogView } from "@/types/geo-personas-ui";

export const GEO_PERSONAS_PAGE_TITLE = "Personas";
export const GEO_PERSONAS_PAGE_DESCRIPTION =
  "Simulated buyers researching your category in AI engines";
export const GEO_PERSONAS_EMPTY_TITLE = "No personas yet";
export const GEO_PERSONAS_EMPTY_DESCRIPTION =
  "Up to five ideal customers, written from your site. Each one talks to every AI engine during a scan.";
export const GEO_PERSONA_DIALOG_VIEWS = [
  { value: "conversation", label: "Conversation" },
  { value: "profile", label: "Profile" },
] as const satisfies readonly { value: PersonaDialogView; label: string }[];
export const GEO_PERSONA_CONVERSATION_EMPTY_TITLE = "No conversation yet";
export const GEO_PERSONA_CONVERSATION_EMPTY_DESCRIPTION =
  "Personas talk to every engine during a scan.";
export const GEO_PERSONA_CONVERSATION_PAUSED_DESCRIPTION =
  "This persona is paused. Include it in scans to start a conversation.";
export const GEO_PERSONAS_REGENERATE_TITLE = "Replace your personas?";
export const GEO_PERSONAS_REGENERATE_DESCRIPTION =
  "The current personas, their memories and their conversations are removed. This cannot be undone.";

/**
 * Generation is one model call with no server-side progress, so the counter
 * is paced on elapsed time. The last step holds until the response lands.
 */
export const GEO_PERSONA_GENERATION_STEPS = [
  { label: "Reading your site", afterMs: 0 },
  { label: "Writing profiles", afterMs: 12_000 },
  { label: "Writing memories", afterMs: 35_000 },
  { label: "Indexing memories", afterMs: 65_000 },
] as const;
export const GEO_PERSONA_GENERATION_TICK_MS = 500;

export const GEO_PERSONAS_MEMORIES_COLUMN_WIDTH = "6.5rem";
export const GEO_PERSONAS_TURNS_COLUMN_WIDTH = "5rem";
export const GEO_PERSONAS_ACTIONS_COLUMN_WIDTH = "7rem";

export const GEO_PERSONA_SKELETON_ROW_COUNT = 4;

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

export const GEO_PERSONA_MEMORY_KIND_LABELS: Record<
  GeoPersonaMemoryKind,
  string
> = {
  background: "Background",
  experience: "Experience",
  preference: "Preference",
  constraint: "Constraint",
};

/** Order the memory groups appear in on the detail dialog. */
export const GEO_PERSONA_MEMORY_KIND_ORDER: readonly GeoPersonaMemoryKind[] = [
  "background",
  "experience",
  "preference",
  "constraint",
];

export const GEO_PERSONA_PROFILE_SECTIONS = [
  { key: "goals", label: "Goals" },
  { key: "painPoints", label: "Pain points" },
  { key: "currentStack", label: "Current stack" },
  { key: "buyingTriggers", label: "Buying triggers" },
  { key: "objections", label: "Objections" },
] as const satisfies readonly {
  key: keyof GeoPersonaProfile;
  label: string;
}[];
export const GEO_PERSONA_SENTENCE_SEGMENTER = new Intl.Segmenter(undefined, {
  granularity: "sentence",
});
