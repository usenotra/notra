import { runBackgroundGen } from "@notra/ai/agents/background-gen";
import type {
  LinkedInAgentOptions,
  LinkedInAgentResult,
} from "@notra/ai/types/agents";

export async function generateLinkedInPost(
  options: LinkedInAgentOptions
): Promise<LinkedInAgentResult> {
  return runBackgroundGen({
    organizationId: options.organizationId,
    collectionId: options.collectionId,
    skillName: "linkedin",
    contentType: "linkedin_post",
    brandAgentType: "linkedin",
    contentLabel: "LinkedIn post",
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
