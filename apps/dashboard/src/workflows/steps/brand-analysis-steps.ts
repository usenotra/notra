import { SUPPORTED_LANGUAGES } from "@notra/ai/constants/languages";
import { gateway } from "@notra/ai/gateway";
import { withGatewayAutomaticCaching } from "@notra/ai/provider-options";
import type { ContextDevScrapingResult } from "@notra/ai/types/context-dev";
import { scrapeWebsiteForBrandAnalysis } from "@notra/ai/utils/context-dev";
import { buildExperimentalTelemetry } from "@notra/ai/utils/tcc";
import { db } from "@notra/db/drizzle";
import { brandSettings } from "@notra/db/schema";
import { flushPostHogServer } from "@notra/posthog/server";
import {
  brandSettingsSchema,
  getValidLanguage,
} from "@notra/schemas/dashboard/brand";
import { generateText, Output } from "ai";
import { and, eq } from "drizzle-orm";
import { createRequestLogger } from "evlog";
import { createAILogger } from "evlog/ai";

import { WORKFLOW_ANALYTICS_NAMES } from "@/constants/workflow-analytics";
import { trackBrandAnalysisOutcomeAndFlush } from "@/lib/analytics/workflow-lifecycle";
import {
  setJobProgress,
  setProgress,
} from "@/lib/workflows/brand-analysis/progress";
import {
  isFinalStepAttempt,
  reportStepError,
} from "@/lib/workflows/step-errors";
import type { ExtractionResult } from "@/types/brand-analysis";
import type {
  BrandAnalysisProgressInput,
  ExtractBrandInfoInput,
  SaveBrandSettingsInput,
} from "@/types/workflows/brand-analysis";
import { updateDefaultBrandSettings } from "@/utils/brand-settings";

export async function setBrandAnalysisProgress(
  input: BrandAnalysisProgressInput
): Promise<void> {
  "use step";
  await setProgress(input.organizationId, input.progress);
  await setJobProgress(input.jobId, input.progress);
  await trackBrandAnalysisOutcomeAndFlush(input);
}

export async function scrapeBrandWebsite(
  url: string
): Promise<ContextDevScrapingResult> {
  "use step";
  return await scrapeWebsiteForBrandAnalysis(url);
}

export async function extractBrandInfo(
  input: ExtractBrandInfoInput
): Promise<ExtractionResult> {
  "use step";
  const log = createRequestLogger({
    method: "POST",
    path: "/api/workflows/brand-analysis",
  });
  const ai = createAILogger(log);
  try {
    const { output } = await generateText({
      model: ai.wrap(
        gateway("anthropic/claude-sonnet-4.6", {
          organizationId: input.organizationId,
        })
      ),
      output: Output.object({ schema: brandSettingsSchema }),
      prompt: `Analyze this website content and extract brand identity information.

Website content:
${input.content}

Extract the following information:
1. companyName: The name of the company
2. companyDescription: A comprehensive description of what the company does, their mission, and what makes them unique (2-4 sentences)
3. toneProfile: The tone of their communication - choose one of: "Conversational", "Professional", "Casual", "Formal"
4. audience: A description of their target audience (1-2 sentences)
5. language: The primary language of the website content. Must be one of: ${SUPPORTED_LANGUAGES.join(", ")}`,
      system:
        "You are a brand analyst expert. Your job is to analyze website content and extract key brand identity information. Be thorough but concise. Focus on understanding the company's essence, values, and how they communicate.",
      providerOptions: withGatewayAutomaticCaching(undefined, {
        modelId: "anthropic/claude-sonnet-4.6",
      }),
      experimental_telemetry: buildExperimentalTelemetry({
        feature: "brand_analysis",
        jobId: input.jobId,
        organizationId: input.organizationId,
        routeName: "/api/workflows/brand-analysis",
        voiceId: input.voiceId,
      }),
    });

    return { success: true, brandInfo: output };
  } catch (error) {
    console.error("Error extracting brand info:", error);
    await reportStepError(error, {
      workflow: WORKFLOW_ANALYTICS_NAMES.BRAND_ANALYSIS,
      step: "extractBrandInfo",
      organizationId: input.organizationId,
    });
    if (!isFinalStepAttempt()) {
      throw error;
    }
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to extract brand information",
    };
  } finally {
    log.emit();
    await flushPostHogServer();
  }
}

export async function saveBrandSettingsFromAnalysis(
  input: SaveBrandSettingsInput
): Promise<void> {
  "use step";
  const validatedLanguage = getValidLanguage(input.brandInfo.language);
  const brandData = {
    websiteUrl: input.url,
    companyName: input.brandInfo.companyName,
    companyDescription: input.brandInfo.companyDescription,
    toneProfile: input.brandInfo.toneProfile,
    customTone: input.brandInfo.customTone ?? null,
    audience: input.brandInfo.audience,
    language: validatedLanguage,
  };

  if (input.voiceId) {
    const target = await db.query.brandSettings.findFirst({
      where: and(
        eq(brandSettings.id, input.voiceId),
        eq(brandSettings.organizationId, input.organizationId)
      ),
    });

    if (target) {
      await db
        .update(brandSettings)
        .set(brandData)
        .where(eq(brandSettings.id, input.voiceId));
      return;
    }
  }

  await updateDefaultBrandSettings(input.organizationId, brandData);
}
