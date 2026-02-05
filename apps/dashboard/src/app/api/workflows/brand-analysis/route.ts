import { SdkError } from "@mendable/firecrawl-js";
import { db } from "@notra/db/drizzle";
import { brandSettings, organizations } from "@notra/db/schema";
import type { WorkflowContext } from "@upstash/workflow";
import { serve } from "@upstash/workflow/nextjs";
import { generateText, Output } from "ai";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getFirecrawlClient } from "@/lib/firecrawl";
import { openrouter } from "@/lib/openrouter";
import { redis } from "@/lib/redis";
import { getBaseUrl } from "@/lib/triggers/qstash";
import { brandSettingsSchema } from "@/utils/schemas/brand";

const PROGRESS_TTL = 300;

type ProgressStatus =
  | "idle"
  | "scraping"
  | "extracting"
  | "saving"
  | "completed"
  | "failed";

interface ProgressData {
  status: ProgressStatus;
  currentStep: number;
  totalSteps: number;
  error?: string;
}

interface ErrorDetail {
  code: string;
  path: string[];
  message: string;
}

interface BrandInfo {
  companyName: string;
  companyDescription: string;
  toneProfile: string;
  customTone?: string | null;
  audience: string;
}

const brandAnalysisPayloadSchema = z.object({
  organizationId: z.string().min(1),
  url: z.string().url(),
});

type BrandAnalysisPayload = z.infer<typeof brandAnalysisPayloadSchema>;

type ScrapingResult =
  | { success: true; content: string }
  | { success: false; error: string; fatal: boolean };

type ExtractionResult =
  | { success: true; brandInfo: BrandInfo }
  | { success: false; error: string };

const STEP_COUNT = 3;

async function setProgress(organizationId: string, data: ProgressData) {
  if (!redis) return;
  await redis.set(`brand:progress:${organizationId}`, data, {
    ex: PROGRESS_TTL,
  });
}

export const { POST } = serve<BrandAnalysisPayload>(
  async (context: WorkflowContext<BrandAnalysisPayload>) => {
    const parseResult = brandAnalysisPayloadSchema.safeParse(
      context.requestPayload
    );
    if (!parseResult.success) {
      console.error(
        "[Brand Analysis] Invalid payload:",
        parseResult.error.flatten()
      );
      await context.cancel();
      return;
    }
    const { organizationId, url } = parseResult.data;

    // Step 1: Scrape website
    await context.run("set-progress-scraping", async () => {
      await setProgress(organizationId, {
        status: "scraping",
        currentStep: 1,
        totalSteps: STEP_COUNT,
      });
    });

    const scrapingResult = await context.run<ScrapingResult>(
      "scrape-website",
      async () => {
        try {
          const firecrawl = getFirecrawlClient();
          const result = await firecrawl.scrape(url, {
            formats: ["markdown"],
            onlyMainContent: true,
          });

          return { success: true, content: result.markdown ?? "" };
        } catch (error) {
          console.error("Error scraping website:", error);

          if (error instanceof SdkError) {
            for (const detail of error.details as ErrorDetail[]) {
              if (detail.message === "Invalid URL") {
                return { success: false, error: "Invalid URL", fatal: true };
              }
            }
            return {
              success: false,
              error: error.message || "Failed to scrape website",
              fatal: false,
            };
          }

          return {
            success: false,
            error: "Unknown error attempting to scrape website",
            fatal: false,
          };
        }
      }
    );

    if (!scrapingResult.success) {
      await context.run("set-progress-failed-scraping", async () => {
        await setProgress(organizationId, {
          status: "failed",
          currentStep: 1,
          totalSteps: STEP_COUNT,
          error: scrapingResult.error,
        });
      });
      await context.cancel();
      return;
    }

    // Step 2: Extract brand info
    await context.run("set-progress-extracting", async () => {
      await setProgress(organizationId, {
        status: "extracting",
        currentStep: 2,
        totalSteps: STEP_COUNT,
      });
    });

    const extractionResult = await context.run<ExtractionResult>(
      "extract-brand-info",
      async () => {
        try {
          const { output } = await generateText({
            model: openrouter("google/gemini-2.0-flash-001"),
            output: Output.object({ schema: brandSettingsSchema }),
            prompt: `Analyze this website content and extract brand identity information.

Website content:
${scrapingResult.content}

Extract the following information:
1. companyName: The name of the company
2. companyDescription: A comprehensive description of what the company does, their mission, and what makes them unique (2-4 sentences)
3. toneProfile: The tone of their communication - choose one of: "Conversational", "Professional", "Casual", "Formal"
4. audience: A description of their target audience (1-2 sentences)`,
            system: `You are a brand analyst expert. Your job is to analyze website content and extract key brand identity information. Be thorough but concise. Focus on understanding the company's essence, values, and how they communicate.`,
          });

          return { success: true, brandInfo: output as BrandInfo };
        } catch (error) {
          console.error("Error extracting brand info:", error);
          return {
            success: false,
            error:
              error instanceof Error
                ? error.message
                : "Failed to extract brand information",
          };
        }
      }
    );

    if (!extractionResult.success) {
      await context.run("set-progress-failed-extracting", async () => {
        await setProgress(organizationId, {
          status: "failed",
          currentStep: 2,
          totalSteps: STEP_COUNT,
          error: extractionResult.error,
        });
      });
      await context.cancel();
      return;
    }

    // Step 3: Save to database
    await context.run("set-progress-saving", async () => {
      await setProgress(organizationId, {
        status: "saving",
        currentStep: 3,
        totalSteps: STEP_COUNT,
      });
    });

    await context.run("save-to-database", async () => {
      const brandInfo = extractionResult.brandInfo;

      await db
        .update(organizations)
        .set({ websiteUrl: url })
        .where(eq(organizations.id, organizationId));

      const existing = await db.query.brandSettings.findFirst({
        where: eq(brandSettings.organizationId, organizationId),
      });

      if (existing) {
        await db
          .update(brandSettings)
          .set({
            companyName: brandInfo.companyName,
            companyDescription: brandInfo.companyDescription,
            toneProfile: brandInfo.toneProfile,
            customTone: brandInfo.customTone ?? null,
            audience: brandInfo.audience,
          })
          .where(eq(brandSettings.organizationId, organizationId));
      } else {
        await db.insert(brandSettings).values({
          id: crypto.randomUUID(),
          organizationId,
          companyName: brandInfo.companyName,
          companyDescription: brandInfo.companyDescription,
          toneProfile: brandInfo.toneProfile,
          customTone: brandInfo.customTone ?? null,
          audience: brandInfo.audience,
        });
      }
    });

    // Mark as completed
    await context.run("set-progress-completed", async () => {
      await setProgress(organizationId, {
        status: "completed",
        currentStep: 3,
        totalSteps: STEP_COUNT,
      });
    });

    return { success: true, brandInfo: extractionResult.brandInfo };
  },
  {
    baseUrl: getBaseUrl(),
    failureFunction: async ({ context, failStatus, failResponse }) => {
      const { organizationId } = context.requestPayload;

      // Set failed progress on workflow failure
      if (redis) {
        await redis.set(
          `brand:progress:${organizationId}`,
          {
            status: "failed",
            currentStep: 0,
            totalSteps: STEP_COUNT,
            error: "Workflow failed unexpectedly",
          },
          { ex: PROGRESS_TTL }
        );
      }

      console.error(
        `[Brand Analysis] Workflow failed for organization ${organizationId}:`,
        { status: failStatus, response: failResponse }
      );
    },
  }
);
