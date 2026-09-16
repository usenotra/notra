import { GEO_PERSONA_MEMORY_KINDS } from "@notra/db/constants/geo-personas";
import { array, boolean, enum as enumType, literal, object, string } from "zod";

import {
  GEO_PERSONA_BRIEF_MAX_LENGTH,
  GEO_PERSONA_MIN_COUNT,
  GEO_PERSONA_MIN_MEMORIES,
  GEO_PERSONA_FIELD_MAX_LENGTH,
  GEO_PERSONA_PROFILE_LIST_MAX,
  GEO_PERSONA_SUMMARY_MAX_LENGTH,
  GEO_PERSONA_MAX_TURNS,
  GEO_PERSONA_PROFILE_LIST_MIN,
} from "../constants/geo-personas";
import { geoOrganizationInputSchema } from "./geo";

// The model-facing schema stays lenient on purpose: models routinely overshoot
// list lengths by one, and a hard max would discard an otherwise good set.
// `normalizeGeneratedPersona` trims everything to the product limits.
const requiredText = string().trim().min(1);
const textList = array(requiredText).min(GEO_PERSONA_PROFILE_LIST_MIN);

export const geoGeneratedPersonaMemorySchema = object({
  kind: enumType(GEO_PERSONA_MEMORY_KINDS),
  content: requiredText,
});

export const geoGeneratedPersonaSchema = object({
  name: requiredText.describe(
    "A short, distinct buyer archetype label, such as Budgeter or Digital Trendsetter; not a personal name."
  ),
  role: requiredText
    .regex(/^\S+(?:\s+\S+)?$/, "Use a job title of at most two words")
    .describe(
      "A complete job title of one or two words, such as Marketing Lead, Founder, or IT Manager."
    ),
  company: requiredText,
  summary: requiredText,
  searchStyle: requiredText,
  goals: textList,
  painPoints: textList,
  currentStack: textList,
  buyingTriggers: textList,
  objections: textList,
  conversationPrompts: array(requiredText).min(GEO_PERSONA_MAX_TURNS),
  memories: array(geoGeneratedPersonaMemorySchema).min(
    GEO_PERSONA_MIN_MEMORIES
  ),
});

export const geoPersonaGenerationSchema = object({
  personas: array(geoGeneratedPersonaSchema).min(GEO_PERSONA_MIN_COUNT),
});

export const geoPersonaRegenerationSchema = object({
  personas: array(geoGeneratedPersonaSchema).length(1),
});

export const geoPersonasGenerateInputSchema = geoOrganizationInputSchema
  .extend({
    personaId: string().min(1).optional(),
    brief: string().trim().min(1).max(GEO_PERSONA_BRIEF_MAX_LENGTH).optional(),
    promptsOnly: literal(true).optional(),
  })
  .refine((input) => !(input.personaId && input.brief), {
    message: "Choose a persona or a brief, not both",
  })
  .refine((input) => !input.promptsOnly || Boolean(input.personaId), {
    message: "A persona is required when generating prompts only",
    path: ["personaId"],
  });

const editableList = array(
  string().trim().min(1).max(GEO_PERSONA_FIELD_MAX_LENGTH)
).max(GEO_PERSONA_PROFILE_LIST_MAX);

export const geoPersonaEditableDetailsSchema = object({
  name: string().trim().min(1).max(GEO_PERSONA_FIELD_MAX_LENGTH),
  role: string()
    .trim()
    .min(1)
    .max(GEO_PERSONA_FIELD_MAX_LENGTH)
    .regex(/^\S+(?:\s+\S+)?$/, "Use at most two words"),
  company: string().trim().min(1).max(GEO_PERSONA_FIELD_MAX_LENGTH),
  summary: string().trim().min(1).max(GEO_PERSONA_SUMMARY_MAX_LENGTH),
  searchStyle: string().trim().min(1).max(GEO_PERSONA_SUMMARY_MAX_LENGTH),
  profile: object({
    goals: editableList,
    painPoints: editableList,
    currentStack: editableList,
    buyingTriggers: editableList,
    objections: editableList,
  }),
});

export const geoPersonaUpdateInputSchema = geoOrganizationInputSchema
  .extend({
    personaId: string().min(1),
    enabled: boolean().optional(),
    details: geoPersonaEditableDetailsSchema.optional(),
  })
  .refine(
    (input) => input.enabled !== undefined || input.details !== undefined,
    {
      message: "Provide persona details or an enabled state",
    }
  );

export const geoPersonaDeleteInputSchema = geoOrganizationInputSchema.extend({
  personaId: string().min(1),
});

export const geoPersonaRestoreInputSchema = geoOrganizationInputSchema.extend({
  personaId: string().min(1),
});

export const geoPersonaResultsInputSchema = geoOrganizationInputSchema
  .extend({
    personaId: string().min(1).optional(),
    scanId: string().min(1).optional(),
  })
  .refine((input) => !input.scanId || Boolean(input.personaId), {
    message: "A persona is required when selecting a scan",
    path: ["personaId"],
  });

export const geoPersonaRunInputSchema = geoOrganizationInputSchema.extend({
  personaId: string().min(1),
});
