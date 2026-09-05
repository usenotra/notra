import { GEO_PERSONA_MEMORY_KINDS } from "@notra/db/constants/geo-personas";
import { array, boolean, enum as enumType, object, string } from "zod";

import { GEO_PERSONA_PROFILE_LIST_MIN } from "../constants/geo-personas";
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
  name: requiredText,
  role: requiredText,
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
  personas: array(geoGeneratedPersonaSchema).min(1),
});

export const geoPersonasGenerateInputSchema = geoOrganizationInputSchema;

export const geoPersonaUpdateInputSchema = geoOrganizationInputSchema.extend({
  personaId: string().min(1),
  enabled: boolean().optional(),
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
