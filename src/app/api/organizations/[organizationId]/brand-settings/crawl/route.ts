import { generateObject } from "ai";
import { serve } from "@upstash/workflow/nextjs";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
// biome-ignore lint/performance/noNamespaceImport: Zod recommended way to import
import * as z from "zod";
import { db } from "@/lib/db/drizzle";
import { brandSettings } from "@/lib/db/schema";
import { openrouter } from "@/lib/openrouter";
import { redis } from "@/lib/redis";

type CrawlerStep = {
  id: string;
  name: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "error";
  error?: string;
};

type CrawlerStatus = {
  status: "idle" | "crawling" | "completed" | "error";
  currentStep: string | null;
  steps: CrawlerStep[];
  error: string | null;
  workflowRunId: string | null;
};

function getDefaultSteps(): CrawlerStep[] {
  return [
    {
      id: "validate",
      name: "Validating URL",
      description: "Checking if the website is accessible",
      status: "pending",
    },
    {
      id: "crawl",
      name: "Crawling Website",
      description: "Fetching and analyzing website content",
      status: "pending",
    },
    {
      id: "analyze",
      name: "Analyzing Brand",
      description: "AI is analyzing your brand identity",
      status: "pending",
    },
    {
      id: "save",
      name: "Saving Results",
      description: "Storing your brand profile",
      status: "pending",
    },
  ];
}

async function updateCrawlerStatus(
  organizationId: string,
  update: Partial<CrawlerStatus>
) {
  const statusKey = `brand-crawler:${organizationId}:status`;
  const current = (await redis.get<CrawlerStatus>(statusKey)) || {
    status: "idle",
    currentStep: null,
    steps: getDefaultSteps(),
    error: null,
    workflowRunId: null,
  };

  const updated = { ...current, ...update };
  await redis.set(statusKey, updated, { ex: 300 });
  return updated;
}

async function updateStepStatus(
  organizationId: string,
  stepId: string,
  status: CrawlerStep["status"],
  error?: string
) {
  const statusKey = `brand-crawler:${organizationId}:status`;
  const current = await redis.get<CrawlerStatus>(statusKey);
  if (!current) return;

  const steps = (Array.isArray(current.steps) ? current.steps : []).map(
    (step) => (step.id === stepId ? { ...step, status, error } : step)
  );

  await redis.set(
    statusKey,
    {
      ...current,
      currentStep: stepId,
      steps,
    },
    { ex: 300 }
  );
}

type WorkflowPayload = {
  organizationId: string;
  websiteUrl: string;
};

const brandSchema = z.object({
  companyName: z.string().describe("The name of the company or brand"),
  companyDescription: z
    .string()
    .describe(
      "A comprehensive description of what the company does, their values, and what sets them apart (2-4 sentences)"
    ),
  toneProfile: z
    .enum([
      "Professional",
      "Conversational",
      "Casual",
      "Technical",
      "Friendly",
      "Authoritative",
    ])
    .describe("The overall tone of the brand's communication"),
  customTone: z
    .string()
    .nullable()
    .describe(
      "Additional notes about the brand's unique voice or style, if applicable"
    ),
  audience: z
    .string()
    .describe(
      "A description of the target audience for this brand (1-2 sentences)"
    ),
});

export const { POST } = serve<WorkflowPayload>(
  async (context) => {
    const { organizationId, websiteUrl } = context.requestPayload;

    await context.run("step-validate", async () => {
      await updateStepStatus(organizationId, "validate", "in_progress");

      try {
        const url = new URL(websiteUrl);
        if (!["http:", "https:"].includes(url.protocol)) {
          throw new Error("Invalid URL protocol");
        }

        const response = await fetch(websiteUrl, {
          method: "HEAD",
          signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
          throw new Error(`Website returned status ${response.status}`);
        }

        await updateStepStatus(organizationId, "validate", "completed");
        return { success: true };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to validate URL";
        await updateStepStatus(
          organizationId,
          "validate",
          "error",
          errorMessage
        );
        await updateCrawlerStatus(organizationId, {
          status: "error",
          error: errorMessage,
        });
        throw error;
      }
    });

    const websiteContent = await context.run("step-crawl", async () => {
      await updateStepStatus(organizationId, "crawl", "in_progress");

      try {
        const response = await fetch(websiteUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (compatible; NotraBrandBot/1.0; +https://usenotra.com)",
          },
          signal: AbortSignal.timeout(30000),
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch website: ${response.status}`);
        }

        const html = await response.text();

        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        const title = titleMatch?.[1]?.trim() || "";

        const metaDescriptionMatch = html.match(
          /<meta[^>]*(?=[^>]*name=["']description["'])[^>]*content=["']([^"']+)["']/i
        );
        const metaDescription = metaDescriptionMatch?.[1]?.trim() || "";

        const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
        const bodyHtml = bodyMatch?.[1] || html;

        const textContent = bodyHtml
          .replace(/<script[\s\S]*?<\/script>/gi, "")
          .replace(/<style[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 10000);

        await updateStepStatus(organizationId, "crawl", "completed");

        return {
          title,
          metaDescription,
          textContent,
          url: websiteUrl,
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to crawl website";
        await updateStepStatus(organizationId, "crawl", "error", errorMessage);
        await updateCrawlerStatus(organizationId, {
          status: "error",
          error: errorMessage,
        });
        throw error;
      }
    });

    const brandAnalysis = await context.run("step-analyze", async () => {
      await updateStepStatus(organizationId, "analyze", "in_progress");

      try {
        const prompt = `Analyze the following website content and extract brand information.

Website URL: ${websiteContent.url}
Title: ${websiteContent.title}
Meta Description: ${websiteContent.metaDescription}

Website Content:
${websiteContent.textContent}

Based on this content, identify:
1. The company/brand name
2. A comprehensive description of what they do and their unique value proposition
3. The tone and style of their communication
4. Their target audience

Be specific and detailed in your analysis.`;

        const { object } = await generateObject({
          model: openrouter("google/gemini-3-flash-preview"),
          schema: brandSchema,
          prompt,
        });

        await updateStepStatus(organizationId, "analyze", "completed");

        return object;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to analyze brand";
        await updateStepStatus(
          organizationId,
          "analyze",
          "error",
          errorMessage
        );
        await updateCrawlerStatus(organizationId, {
          status: "error",
          error: errorMessage,
        });
        throw error;
      }
    });

    await context.run("step-save", async () => {
      await updateStepStatus(organizationId, "save", "in_progress");

      try {
        const existing = await db.query.brandSettings.findFirst({
          where: eq(brandSettings.organizationId, organizationId),
        });

        if (existing) {
          await db
            .update(brandSettings)
            .set({
              websiteUrl,
              companyName: brandAnalysis.companyName,
              companyDescription: brandAnalysis.companyDescription,
              toneProfile: brandAnalysis.toneProfile,
              customTone: brandAnalysis.customTone,
              audience: brandAnalysis.audience,
              crawlerStatus: "completed",
              crawlerLastRun: new Date(),
              crawlerError: null,
            })
            .where(eq(brandSettings.organizationId, organizationId));
        } else {
          await db.insert(brandSettings).values({
            id: nanoid(16),
            organizationId,
            websiteUrl,
            companyName: brandAnalysis.companyName,
            companyDescription: brandAnalysis.companyDescription,
            toneProfile: brandAnalysis.toneProfile,
            customTone: brandAnalysis.customTone,
            audience: brandAnalysis.audience,
            crawlerStatus: "completed",
            crawlerLastRun: new Date(),
            crawlerError: null,
          });
        }

        await updateStepStatus(organizationId, "save", "completed");
        await updateCrawlerStatus(organizationId, {
          status: "completed",
          error: null,
        });

        const lockKey = `brand-crawler:${organizationId}:lock`;
        await redis.del(lockKey);

        return { success: true };
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to save brand settings";
        await updateStepStatus(organizationId, "save", "error", errorMessage);
        await updateCrawlerStatus(organizationId, {
          status: "error",
          error: errorMessage,
        });
        throw error;
      }
    });
  },
  {
    baseUrl: process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    failureFunction: async ({ context }) => {
      const { organizationId } = context.requestPayload;
      await updateCrawlerStatus(organizationId, {
        status: "error",
        error: "Workflow failed unexpectedly",
      });
      const lockKey = `brand-crawler:${organizationId}:lock`;
      await redis.del(lockKey);
    },
  }
);
