import type { z } from "zod";

import type { personaGenerationJobSchema } from "@/schemas/persona-generation";

export type PersonaGenerationJob = z.infer<typeof personaGenerationJobSchema>;

export type PersonaGenerationRequest =
  | { personaId: string; promptsOnly?: true }
  | { brief: string }
  | void;
