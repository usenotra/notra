import { AGENT_DEFAULT_MODEL } from "@notra/ai/constants/models";
import { contentWriterResultSchema } from "@notra/ai/schemas/content-writer-result";
import { defineAgent } from "eve";

import { SONNET_5_CONTEXT_WINDOW_TOKENS } from "../../lib/constants/models";
import { createAgentModel } from "../../lib/utils/model";

export default defineAgent({
  description:
    "Writes and saves content posts (changelog, blog post, tweet, LinkedIn post, investor update) from the organization's connected sources. Loads the organization's writing skills, studies brand references, gathers GitHub/Linear data, then saves the post to the database. Pass one message containing the content type, source instructions, and lookback context. Returns a structured created/skipped/failed result.",
  model: createAgentModel(AGENT_DEFAULT_MODEL, "content-writer-agent"),
  modelContextWindowTokens: SONNET_5_CONTEXT_WINDOW_TOKENS,
  outputSchema: contentWriterResultSchema,
});
