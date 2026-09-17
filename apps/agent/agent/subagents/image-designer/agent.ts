import { imageDesignerResultSchema } from "@notra/ai/schemas/image-designer-result";
import { defineAgent } from "eve";

import {
  IMAGE_DESIGNER_MODEL_ID,
  SONNET_4_6_CONTEXT_WINDOW_TOKENS,
} from "../../lib/constants/models";
import { createAgentModel } from "../../lib/utils/model";

export default defineAgent({
  description:
    "Creates and revises 1200x630 marketing images from a connected GitHub repository using a sandboxed design agent. Pass one message containing the integrationId, branch, mode (prompt, pr, or commit) with its value, any brand identity id, the requested title, and for revisions the postId of the existing image. Generation takes 3 to 8 minutes. Returns a structured result with the saved post id and image URL.",
  model: createAgentModel(IMAGE_DESIGNER_MODEL_ID),
  modelContextWindowTokens: SONNET_4_6_CONTEXT_WINDOW_TOKENS,
  outputSchema: imageDesignerResultSchema,
});
