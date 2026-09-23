import { defineAgent } from "eve";

import { SONNET_5_CONTEXT_WINDOW_TOKENS } from "../../lib/constants/models";
import { skillEditsSchema } from "../../lib/schemas/skill-edits";
import { createAgentModel } from "../../lib/utils/model";

export default defineAgent({
  description:
    "Edits an organization's content skills in the Notra database based on researched brand evidence: tone, vocabulary, topics, and real writing samples.",
  model: createAgentModel(
    "anthropic/claude-sonnet-5",
    "onboarding-skill-editor"
  ),
  modelContextWindowTokens: SONNET_5_CONTEXT_WINDOW_TOKENS,
  outputSchema: skillEditsSchema,
});
