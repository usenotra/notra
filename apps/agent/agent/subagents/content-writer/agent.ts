import { contentWriterResultSchema } from "@notra/ai/schemas/content-writer-result";
import { defineAgent } from "eve";

import {
  CONTENT_WRITER_MODEL_ID,
  GPT_6_SOL_CONTEXT_WINDOW_TOKENS,
} from "../../lib/constants/models";
import { createSessionAgentModel } from "../../lib/utils/session-model";

export default defineAgent({
  description:
    "Writes and saves content posts (changelog, blog post, tweet, LinkedIn post, investor update) from the organization's connected sources. Loads the organization's writing skills, studies brand references, gathers GitHub/Linear data, then saves the post to the database. Pass one message containing the content type, source instructions, lookback context, and any code research brief verbatim. Returns a structured created/skipped/failed result.",
  model: createSessionAgentModel(
    CONTENT_WRITER_MODEL_ID,
    "content-writer-agent",
    GPT_6_SOL_CONTEXT_WINDOW_TOKENS
  ),
  outputSchema: contentWriterResultSchema,
});
