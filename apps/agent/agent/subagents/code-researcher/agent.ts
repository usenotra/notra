import { AGENT_DEFAULT_MODEL } from "@notra/ai/constants/models";
import { codeResearchBriefSchema } from "@notra/ai/schemas/code-research";
import { defineAgent } from "eve";

import { SONNET_5_CONTEXT_WINDOW_TOKENS } from "../../lib/constants/models";
import { createSessionAgentModel } from "../../lib/utils/session-model";

export default defineAgent({
  description:
    "Reads the organization's connected GitHub repository in a read-only sandbox to understand one product feature from its code: what it does for users, how they reach it, config, API or CLI surface, and limits. Pass one message with the feature description, the GitHub integrationId, and any known pull request number, branch, commit, or time window. Returns a structured feature brief, not prose.",
  model: createSessionAgentModel(
    AGENT_DEFAULT_MODEL,
    "content-code-researcher",
    SONNET_5_CONTEXT_WINDOW_TOKENS
  ),
  outputSchema: codeResearchBriefSchema,
});
