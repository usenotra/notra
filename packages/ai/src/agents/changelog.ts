import { runBackgroundGen } from "@notra/ai/agents/background-gen";
import { CONTENT_AGENT_PROFILES } from "@notra/ai/constants/content-agents";
import type {
  ChangelogAgentOptions,
  ChangelogAgentResult,
} from "@notra/ai/types/agents";

export async function generateChangelog(
  options: ChangelogAgentOptions
): Promise<ChangelogAgentResult> {
  return runBackgroundGen({
    organizationId: options.organizationId,
    collectionId: options.collectionId,
    ...CONTENT_AGENT_PROFILES.changelog,
    voiceId: options.voiceId,
    repositories: options.repositories,
    linearIntegrations: options.linearIntegrations,
    promptInput: options.promptInput,
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
