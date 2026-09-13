import { runBackgroundGen } from "@notra/ai/agents/background-gen";
import type {
  BlogPostAgentOptions,
  BlogPostAgentResult,
} from "@notra/ai/types/agents";

export async function generateBlogPost(
  options: BlogPostAgentOptions
): Promise<BlogPostAgentResult> {
  return runBackgroundGen({
    organizationId: options.organizationId,
    collectionId: options.collectionId,
    skillName: "blog-post",
    contentType: "blog_post",
    brandAgentType: "blog",
    contentLabel: "blog post",
    voiceId: options.voiceId,
    repositories: options.repositories,
    linearIntegrations: options.linearIntegrations,
    promptInput: {
      ...options.promptInput,
      tone: options.promptInput.tone ?? options.tone ?? "Conversational",
    },
    sourceMetadata: options.sourceMetadata,
    dataPointSettings: options.dataPointSettings,
    selectionFilters: options.selectionFilters,
    commitWindow: options.commitWindow,
    autoPublish: options.autoPublish,
    resolveContext: options.resolveContext,
    resolveLinearContext: options.resolveLinearContext,
    log: options.log,
    telemetryMetadata: options.telemetryMetadata,
  });
}
