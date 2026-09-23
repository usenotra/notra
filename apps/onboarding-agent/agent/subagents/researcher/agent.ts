import { defineAgent } from "eve";

import { GPT_5_5_CONTEXT_WINDOW_TOKENS } from "../../lib/constants/models";
import { researchBriefSchema } from "../../lib/schemas/research-brief";
import { createAgentModel } from "../../lib/utils/model";

export default defineAgent({
  description:
    "Fetches and condenses public company data: brand lookup, website pages, sitemap, web search, up to 50 tweets and owned-blog excerpts, and GitHub. Returns an evidence brief plus structured reference candidates, never raw pages.",
  model: createAgentModel("openai/gpt-5.5", "onboarding-researcher"),
  modelContextWindowTokens: GPT_5_5_CONTEXT_WINDOW_TOKENS,
  reasoning: "medium",
  outputSchema: researchBriefSchema,
});
