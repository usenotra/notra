import { GEO_PERSONA_MEMORY_KINDS } from "@notra/db/constants/geo-personas";
import { array, boolean, enum as enumType, object, string } from "zod";

import {
  GEO_PERSONA_MIN_COUNT,
  GEO_PERSONA_FIELD_MAX_LENGTH,
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
  memories: array(geoGeneratedPersonaMemorySchema).min(1),
});

export const geoPersonaGenerationSchema = object({
  personas: array(geoGeneratedPersonaSchema).min(GEO_PERSONA_MIN_COUNT),
});

export const geoPersonaRegenerationSchema = object({
  personas: array(geoGeneratedPersonaSchema).length(1),
});

export const geoPersonasGenerateInputSchema = geoOrganizationInputSchema.extend(
  {
    personaId: string().min(1).optional(),
  }
);

const editableList = array(string().trim().min(1).max(200)).max(6);

export const geoPersonaEditableDetailsSchema = object({
  name: string().trim().min(1).max(GEO_PERSONA_FIELD_MAX_LENGTH),
  role: string()
    .trim()
    .min(1)
    .max(200)
    .regex(/^\S+(?:\s+\S+)?$/, "Use at most two words"),
  company: string().trim().min(1).max(200),
  summary: string().trim().min(1).max(800),
  searchStyle: string().trim().min(1).max(800),
  profile: object({
    goals: editableList,
    painPoints: editableList,
    currentStack: editableList,
    buyingTriggers: editableList,
    objections: editableList,
  }),
});

export const geoPersonaUpdateInputSchema = geoOrganizationInputSchema.extend({
  personaId: string().min(1),
  enabled: boolean().optional(),
  details: geoPersonaEditableDetailsSchema.optional(),
});

export const geoPersonaDeleteInputSchema = geoOrganizationInputSchema.extend({
  personaId: string().min(1),
});

export const geoPersonaResultsInputSchema = geoOrganizationInputSchema.extend({
  personaId: string().min(1).optional(),
});

export const geoPersonaRunInputSchema = geoOrganizationInputSchema.extend({
  personaId: string().min(1),
});
