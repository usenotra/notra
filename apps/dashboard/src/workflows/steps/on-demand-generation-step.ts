import { getGitHubToolRepositoryContextByIntegrationId } from "@notra/ai/integrations/github";
import { getLinearToolContextByIntegrationId } from "@notra/ai/integrations/linear";
import { getValidToneProfile } from "@notra/ai/schemas/tone";
import type { PostSourceMetadata } from "@notra/db/schema";
import { flushPostHogServer } from "@notra/posthog/server";
import { createRequestLogger } from "evlog";

import {
  buildDataPointRestrictionInstructions,
  buildSelectedItemsInstructions,
  buildSelectionFilters,
  hasSelectedItemsOutsideTargets,
} from "@/lib/workflows/on-demand/helpers";
import { generateScheduledContent } from "@/lib/workflows/schedule/handlers";
import type { ContentGenerationResult } from "@/lib/workflows/schedule/types";
import type { OnDemandGenerationStepInput } from "@/types/workflows/on-demand-generation";
import { formatTodayContext, resolveLookbackRange } from "@/utils/lookback";

export async function runOnDemandGeneration(
  input: OnDemandGenerationStepInput
): Promise<ContentGenerationResult> {
  "use step";
  const { payload, repositories, brand, hasLinearSources, chargeAiCredits } =
    input;
  const {
    organizationId,
    userId,
    collectionId,
    runId,
    jobId,
    contentType,
    lookbackWindow,
    timezone,
    dataPoints,
    selectedItems,
    linearIntegrationIds,
    source,
  } = payload;

  const targetRepositoryIds = new Set(
    repositories.map((repository) => repository.id)
  );

  if (hasSelectedItemsOutsideTargets(selectedItems, targetRepositoryIds)) {
    return {
      status: "generation_failed",
      reason:
        "Selected items must belong to repositories included in this generation request.",
    };
  }

  const selectionFilters = buildSelectionFilters(
    selectedItems,
    targetRepositoryIds,
    dataPoints
  );

  const lookback = resolveLookbackRange(lookbackWindow, timezone);
  const todayUtc = formatTodayContext(lookback.end, timezone);

  const restrictionInstructions =
    buildDataPointRestrictionInstructions(dataPoints);
  const selectedItemsInstructions =
    buildSelectedItemsInstructions(selectedItems);
  const customInstructions = [
    brand?.customInstructions?.trim() || "",
    restrictionInstructions || "",
    selectedItemsInstructions || "",
  ]
    .filter((value) => value.length > 0)
    .join("\n\n");

  const sourceMetadata: PostSourceMetadata = {
    triggerId: "manual_on_demand",
    triggerSourceType: "manual",
    repositories: repositories.map((repository) => ({
      owner: repository.owner,
      repo: repository.repo,
    })),
    linearIntegrations: linearIntegrationIds?.map((integrationId) => ({
      integrationId,
    })),
    lookbackWindow,
    lookbackRange: {
      start: lookback.start.toISOString(),
      end: lookback.end.toISOString(),
    },
    brandVoiceName: brand?.name,
    brandVoiceId: brand?.id,
    selectedCommitShas: selectedItems?.commitShas?.length
      ? selectedItems.commitShas
      : undefined,
    selectedPullRequests: selectedItems?.pullRequestNumbers?.length
      ? selectedItems.pullRequestNumbers
      : undefined,
    selectedReleases: selectedItems?.releaseTagNames?.length
      ? selectedItems.releaseTagNames.filter(
          (
            item: string | { repositoryId: string; tagName: string }
          ): item is { repositoryId: string; tagName: string } =>
            typeof item !== "string"
        )
      : undefined,
    selectedLinearIssues: selectedItems?.linearIssueIds?.length
      ? selectedItems.linearIssueIds
      : undefined,
  };

  const sourceTargetParts = repositories.map(
    (repository) =>
      `${repository.owner}/${repository.repo} (integrationId: ${repository.id})`
  );
  const linearIntegrationRefs =
    hasLinearSources && linearIntegrationIds
      ? linearIntegrationIds.map((id) => ({ integrationId: id }))
      : [];
  for (const ref of linearIntegrationRefs) {
    sourceTargetParts.push(`Linear (integrationId: ${ref.integrationId})`);
  }

  const log = createRequestLogger({
    method: "POST",
    path: "/api/workflows/on-demand-content",
  });
  log.set({
    feature: "on_demand_content_generation",
    organizationId,
    contentType,
    runId,
    jobId: jobId ?? null,
  });

  try {
    return await generateScheduledContent(contentType, {
      organizationId,
      userId,
      collectionId,
      chargeAiCredits,
      repositories: repositories.map((repository) => ({
        integrationId: repository.id,
        owner: repository.owner,
        repo: repository.repo,
        defaultBranch: repository.defaultBranch,
      })),
      linearIntegrations: linearIntegrationRefs,
      tone: getValidToneProfile(brand?.toneProfile, "Conversational"),
      promptInput: {
        sourceTargets: sourceTargetParts.join(", "),
        todayUtc,
        lookbackLabel: lookback.label,
        lookbackStartIso: lookback.start.toISOString(),
        lookbackEndIso: lookback.end.toISOString(),
        companyName: brand?.companyName ?? undefined,
        companyDescription: brand?.companyDescription ?? undefined,
        audience: brand?.audience ?? undefined,
        customInstructions: customInstructions || null,
        language: brand?.language ?? undefined,
        tone: getValidToneProfile(brand?.toneProfile, "Conversational"),
        customTone: brand?.customTone ?? undefined,
      },
      sourceMetadata,
      dataPointSettings: dataPoints,
      selectionFilters,
      commitWindow: {
        since: lookback.start.toISOString(),
        until: lookback.end.toISOString(),
      },
      voiceId: brand?.id,
      resolveContext: getGitHubToolRepositoryContextByIntegrationId,
      resolveLinearContext: getLinearToolContextByIntegrationId,
      log,
      telemetryMetadata: {
        contentType,
        feature: "content_generation",
        generationMode: "manual",
        jobId,
        organizationId,
        routeName: "/api/workflows/on-demand-content",
        runId,
        source,
        triggerId: "manual_on_demand",
        voiceId: brand?.id,
      },
    });
  } finally {
    log.emit();
    await flushPostHogServer();
  }
}

Object.assign(runOnDemandGeneration, { maxRetries: 0 });
