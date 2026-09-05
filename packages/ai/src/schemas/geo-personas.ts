import { GEO_PERSONA_MEMORY_KINDS } from "@notra/db/constants/geo-personas";
import { boolean, enum as enumType, object, string } from "zod";

import {
  GEO_PERSONA_MEMORY_QUERY_MAX_LENGTH,
  GEO_PERSONA_MESSAGE_MAX_LENGTH,
  GEO_PERSONA_REASONING_MAX_LENGTH,
} from "../constants/geo-personas";

export const listPersonaMemoriesInputSchema = object({
  kind: enumType(GEO_PERSONA_MEMORY_KINDS)
    .optional()
    .describe("Only return memories of this kind. Omit for everything."),
});

export const searchPersonaMemoriesInputSchema = object({
  query: string()
    .trim()
    .min(1)
    .max(GEO_PERSONA_MEMORY_QUERY_MAX_LENGTH)
    .describe("What you are trying to remember, in plain words."),
});

export const personaNextTurnOutputSchema = object({
  reasoning: string()
    .max(GEO_PERSONA_REASONING_MAX_LENGTH)
    .describe(
      "One or two sentences on why you ask this next, or why you stop."
    ),
  done: boolean().describe(
    "True when you have what you need and would stop chatting."
  ),
  message: string()
    .max(GEO_PERSONA_MESSAGE_MAX_LENGTH)
    .describe("The exact next message you type. Empty when done."),
});
