import { buildBlogPostPrompt } from "@notra/ai/prompts/blog_post/shared";

export function getConversationalBlogPostPrompt(): string {
  return buildBlogPostPrompt();
}
