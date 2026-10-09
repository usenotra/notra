import { z } from "zod";

const IMAGE_PROMPT_MAX_LENGTH = 500;

export const reviseImageInputSchema = z.object({
  postId: z
    .string()
    .optional()
    .describe(
      "The image post to revise. Optional inside a content editor session, where the current image post is used automatically."
    ),
  prompt: z
    .string()
    .min(1)
    .max(IMAGE_PROMPT_MAX_LENGTH)
    .describe("The requested visual change"),
  title: z
    .string()
    .max(120)
    .optional()
    .describe("Optional updated title for the image post"),
  useRepository: z
    .boolean()
    .optional()
    .describe(
      "Diagrams only. Diagram edits normally take a few seconds and change the existing diagram directly. Set true only when the change needs new facts from the repository code (for example add the steps of a function the diagram does not show yet); this restores the sandbox and takes minutes."
    ),
});
