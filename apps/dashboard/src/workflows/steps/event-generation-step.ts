import { getGitHubToolRepositoryContextByIntegrationId } from "@notra/ai/integrations/github";
import { getValidToneProfile } from "@notra/ai/schemas/tone";
import type { PostSourceMetadata } from "@notra/db/schema";
import { flushPostHogServer } from "@notra/posthog/server";

import { generateEventBasedContent } from "@/lib/workflows/event/handlers";
import type { EventGenerationStepInput } from "@/types/workflows/event-generation";
import type { EventGenerationResult } from "@/types/workflows/workflows";

export async function runEventGeneration(
  input: EventGenerationStepInput
): Promise<EventGenerationResult> {
  "use step";
  const {
    trigger,
    repository,
    brand,
    eventType,
    eventAction,
    eventData,
    chargeAiCredits,
  } = input;

  const sourceMetadata: PostSourceMetadata = {
    triggerId: trigger.id,
    triggerSourceType: "github_webhook",
    eventType,
    eventAction,
    repositories: [{ owner: repository.owner, repo: repository.name }],
    brandVoiceName: brand?.name,
    brandVoiceId: brand?.id,
  };

  const tone = getValidToneProfile(brand?.toneProfile, "Conversational");

  try {
    return await generateEventBasedContent({
      organizationId: trigger.organizationId,
      collectionId: input.collectionId,
      chargeAiCredits,
      triggerId: trigger.id,
      triggerName: trigger.name,
      eventType,
      eventAction,
      eventData,
      repositoryId: repository.id,
      repositoryOwner: repository.owner,
      repositoryName: repository.name,
      outputType: trigger.outputType,
      tone,
      brand: {
        companyName: brand?.companyName ?? undefined,
        companyDescription: brand?.companyDescription ?? undefined,
        audience: brand?.audience ?? undefined,
        customInstructions: brand?.customInstructions ?? null,
        language: brand?.language ?? undefined,
        customTone: brand?.customTone ?? undefined,
      },
      sourceMetadata,
      autoPublish: trigger.autoPublish,
      resolveContext: getGitHubToolRepositoryContextByIntegrationId,
      telemetryMetadata: {
        contentType: trigger.outputType,
        eventAction,
        eventType,
        feature: "content_generation",
        generationMode: "event",
        organizationId: trigger.organizationId,
        repositoryId: repository.id,
        routeName: "/api/workflows/event",
        triggerId: trigger.id,
        triggerName: trigger.name,
        triggerSourceType: "github_webhook",
        voiceId: brand?.id,
      },
    });
  } finally {
    await flushPostHogServer();
  }
}

Object.assign(runEventGeneration, { maxRetries: 0 });
