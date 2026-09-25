import { z } from "zod";

export const getSocialAnalyticsOverviewInputSchema = z.object({});

export const getTopPostsInputSchema = z.object({
  limit: z
    .number()
    .int()
    .min(1)
    .max(25)
    .default(10)
    .describe("Maximum number of posts to return, ranked by engagement."),
});

export const getEngagementTimeseriesInputSchema = z.object({
  days: z
    .number()
    .int()
    .min(1)
    .max(365)
    .default(30)
    .describe("Number of trailing days to include."),
});

export const getPostingPerformanceInputSchema = z.object({
  days: z
    .number()
    .int()
    .min(1)
    .max(365)
    .default(90)
    .describe("Number of trailing days to include."),
});

export const getGeoOverviewInputSchema = z.object({
  projectId: z
    .string()
    .min(1)
    .optional()
    .describe(
      "GEO project ID. Defaults to the oldest project in this organization."
    ),
  days: z
    .number()
    .int()
    .min(1)
    .max(365)
    .default(30)
    .describe("Number of trailing days to include."),
});

export const getAbTestsInputSchema = z.object({});

export const createAbTestInputSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(120)
    .describe("Short descriptive name for the experiment."),
  hypothesis: z
    .string()
    .max(500)
    .optional()
    .describe("What you expect to learn and why."),
  variantAPostId: z
    .string()
    .min(1)
    .describe("Platform post id of variant A (from get_top_posts)."),
  variantBPostId: z
    .string()
    .min(1)
    .describe("Platform post id of variant B (from get_top_posts)."),
  metric: z
    .enum(["engagement", "impressions", "likes"])
    .default("engagement")
    .describe("Metric the variants compete on."),
  provider: z
    .enum(["twitter", "linkedin"])
    .default("twitter")
    .describe("Platform both posts belong to."),
});
