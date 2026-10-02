import { expect, test } from "bun:test";

import { sourceMetadataSchema } from "@notra/schemas/dashboard/content";
import {
  publishSocialPostBodySchema,
  scheduledSocialPostInputSchema,
  updateScheduledSocialPostInputSchema,
} from "@notra/schemas/dashboard/social-accounts";

const VIDEO_URL = "https://cdn.example.com/organization/org_1/clip.mp4";

test("accepts a post with one video, schedule time and external id", () => {
  const parsed = publishSocialPostBodySchema.safeParse({
    accountId: "acc_1",
    content: "Hello with video",
    mediaUrls: [VIDEO_URL],
    scheduledAt: new Date(Date.now() + 3600_000).toISOString(),
    externalId: "notra:post_1:acc_1",
    from: "editor",
  });
  expect(parsed.success).toBe(true);
});

test("rejects more than one video attachment", () => {
  const parsed = publishSocialPostBodySchema.safeParse({
    accountId: "acc_1",
    content: "Too many videos",
    mediaUrls: [VIDEO_URL, VIDEO_URL],
  });
  expect(parsed.success).toBe(false);
});

test("rejects non-URL media and non-datetime schedule input", () => {
  expect(
    publishSocialPostBodySchema.safeParse({
      accountId: "acc_1",
      content: "Bad url",
      mediaUrls: ["not-a-url"],
    }).success
  ).toBe(false);
  expect(
    publishSocialPostBodySchema.safeParse({
      accountId: "acc_1",
      content: "Bad time",
      scheduledAt: "tomorrow at noon",
    }).success
  ).toBe(false);
});

test("requires an external id when scheduling", () => {
  expect(
    publishSocialPostBodySchema.safeParse({
      accountId: "acc_1",
      content: "Scheduled without id",
      scheduledAt: new Date(Date.now() + 3600_000).toISOString(),
    }).success
  ).toBe(false);
});

test("scheduled update requires the expected external id", () => {
  expect(
    updateScheduledSocialPostInputSchema.safeParse({
      organizationId: "org_1",
      accountId: "acc_1",
      postId: "sp_1",
    }).success
  ).toBe(false);
  expect(
    updateScheduledSocialPostInputSchema.safeParse({
      organizationId: "org_1",
      accountId: "acc_1",
      postId: "sp_1",
      externalId: "notra:post_1:acc_1",
    }).success
  ).toBe(true);
});
test("scheduled update requires a post id and accepts partial edits", () => {
  expect(
    scheduledSocialPostInputSchema.safeParse({
      organizationId: "org_1",
      postId: "sp_1",
    }).success
  ).toBe(false);
  const parsed = updateScheduledSocialPostInputSchema.safeParse({
    organizationId: "org_1",
    accountId: "acc_1",
    postId: "sp_1",
    externalId: "notra:post_1:acc_1",
    scheduledAt: new Date(Date.now() + 7200_000).toISOString(),
  });
  expect(parsed.success).toBe(true);
});

test("draft metadata round-trips the video attachment and schedule ref", () => {
  const parsed = sourceMetadataSchema.safeParse({
    socialVideo: {
      key: "organization/org_1/content/abc.mp4",
      url: VIDEO_URL,
      mimeType: "video/mp4",
      size: 1024,
    },
    socialSchedule: {
      postId: "sp_1",
      accountId: "acc_1",
      platform: "linkedin",
      scheduledAt: new Date(Date.now() + 3600_000).toISOString(),
      status: "scheduled",
    },
  });
  expect(parsed.success).toBe(true);
});
