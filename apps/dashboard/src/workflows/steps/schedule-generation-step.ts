import { getGitHubToolRepositoryContextByIntegrationId } from "@notra/ai/integrations/github";
import { getLinearToolContextByIntegrationId } from "@notra/ai/integrations/linear";
import { getValidToneProfile } from "@notra/ai/schemas/tone";
import type { PostSourceMetadata } from "@notra/db/schema";
import { flushPostHogServer } from "@notra/posthog/server";
import { createRequestLogger } from "evlog";

import { buildDataPointRestrictionInstructions } from "@/lib/workflows/on-demand/helpers";
import { generateScheduledContent } from "@/lib/workflows/schedule/handlers";
import { buildScheduleInstructions } from "@/lib/workflows/schedule/instructions";
import type { ContentGenerationResult } from "@/lib/workflows/schedule/types";
import { parseTriggerOutputConfig } from "@/lib/workflows/shared/parsing";
import type { ScheduleGenerationStepInput } from "@/types/workflows/schedule-generation";
import { formatTodayContext, resolveLookbackRange } from "@/utils/lookback";

export async function runScheduledGeneration(
  input: ScheduleGenerationStepInput
): Promise<ContentGenerationResult> {
  "use step";
  const {
    trigger,
    lookbackWindow,
    repositories,
    linearIntegrationRefs,
    brand,
    collectionId,
    generationUserId,
    manual,
    chargeAiCredits,
  } = input;

  const lookbackRange = resolveLookbackRange(lookbackWindow);
  const todayUtc = formatTodayContext(lookbackRange.end);
  const creationMode = manual ? "manual" : "automatic";

  const hasLinear = linearIntegrationRefs.length > 0;
  const dataPointSettings = {
    includePullRequests: true,
    includeCommits: true,
    includeReleases: true,
    includeLinearData: hasLinear,
  };

  const sourceTargetParts = repositories.map(
    (repository) =>
      `${repository.owner}/${repository.repo} (integrationId: ${repository.id})`
  );
  for (const ref of linearIntegrationRefs) {
    sourceTargetParts.push(
      `Linear${ref.teamName ? ` / ${ref.teamName}` : ""} (integrationId: ${ref.integrationId})`
    );
  }

  const restrictionInstructions =
    buildDataPointRestrictionInstructions(dataPointSettings);
  const scheduleInstructions = buildScheduleInstructions(
    parseTriggerOutputConfig(trigger.outputConfig)?.instructions
  );
  const customInstructions = [
    brand?.customInstructions?.trim() ?? "",
    scheduleInstructions ?? "",
    restrictionInstructions ?? "",
  ]
    .filter((value) => value.length > 0)
    .join("\n\n");

  const sourceMetadata: PostSourceMetadata = {
    triggerId: trigger.id,
    triggerSourceType: trigger.sourceType,
    repositories: repositories.map((repository) => ({
      owner: repository.owner,
      repo: repository.repo,
    })),
    lookbackWindow,
    lookbackRange: {
      start: lookbackRange.start.toISOString(),
      end: lookbackRange.end.toISOString(),
    },
    brandVoiceName: brand?.name,
    brandVoiceId: brand?.id,
  };

  const promptInput = {
    sourceTargets: sourceTargetParts.join(", "),
    todayUtc,
    lookbackLabel: lookbackRange.label,
    lookbackStartIso: lookbackRange.start.toISOString(),
    lookbackEndIso: lookbackRange.end.toISOString(),
    companyName: brand?.companyName ?? undefined,
    companyDescription: brand?.companyDescription ?? undefined,
    audience: brand?.audience ?? undefined,
    customInstructions: customInstructions || null,
    language: brand?.language ?? undefined,
    tone: getValidToneProfile(brand?.toneProfile, "Conversational"),
    customTone: brand?.customTone ?? undefined,
  };

  const repositoryParams = repositories.map((repository) => ({
    integrationId: repository.id,
    owner: repository.owner,
    repo: repository.repo,
    defaultBranch: repository.defaultBranch,
  }));

  const tone = getValidToneProfile(brand?.toneProfile, "Conversational");

  const log = createRequestLogger({
    method: "POST",
    path: "/api/workflows/schedule",
  });
  log.set({
    feature: "scheduled_content_generation",
    organizationId: trigger.organizationId,
    triggerId: trigger.id,
    outputType: trigger.outputType,
    manual,
  });

  try {
    return await generateScheduledContent(trigger.outputType, {
      organizationId: trigger.organizationId,
      userId: generationUserId,
      collectionId,
      chargeAiCredits,
      repositories: repositoryParams,
      linearIntegrations: linearIntegrationRefs,
      tone,
      promptInput,
      sourceMetadata,
      dataPointSettings,
      commitWindow: {
        since: lookbackRange.start.toISOString(),
        until: lookbackRange.end.toISOString(),
      },
      voiceId: brand?.id,
      autoPublish: trigger.autoPublish,
      resolveContext: getGitHubToolRepositoryContextByIntegrationId,
      resolveLinearContext: getLinearToolContextByIntegrationId,
      log,
      telemetryMetadata: {
        contentType: trigger.outputType,
        feature: "content_generation",
        generationMode: creationMode,
        organizationId: trigger.organizationId,
        routeName: "/api/workflows/schedule",
        triggerId: trigger.id,
        triggerName: trigger.name,
        triggerSourceType: trigger.sourceType,
        voiceId: brand?.id,
      },
    });
  } finally {
    log.emit();
    await flushPostHogServer();
  }
}

Object.assign(runScheduledGeneration, { maxRetries: 0 });
