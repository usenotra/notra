import { FEATURES } from "../billing/features";
import type { ContentType } from "../schemas/content";
import type {
  ContentQuotaFeatureId,
  ContentQuotaLabel,
} from "../types/billing";

export const CONTENT_QUOTA_FEATURES: Record<
  ContentType,
  ContentQuotaFeatureId
> = {
  changelog: FEATURES.LONG_FORM_POSTS,
  blog_post: FEATURES.LONG_FORM_POSTS,
  investor_update: FEATURES.LONG_FORM_POSTS,
  twitter_post: FEATURES.SOCIAL_POSTS,
  linkedin_post: FEATURES.SOCIAL_POSTS,
  image: FEATURES.IMAGE_GENERATIONS,
};

export const METERED_CONTENT_QUOTA_FEATURES: Set<ContentQuotaFeatureId> =
  new Set([
    FEATURES.LONG_FORM_POSTS,
    FEATURES.IMAGE_GENERATIONS,
    FEATURES.AI_ANSWERS,
  ]);

export const CONTENT_QUOTA_LABELS: Record<
  ContentQuotaFeatureId,
  ContentQuotaLabel
> = {
  long_form_posts: { singular: "long-form post", plural: "long-form posts" },
  social_posts: { singular: "social post", plural: "social posts" },
  image_generations: {
    singular: "image generation",
    plural: "image generations",
  },
  ai_answers: { singular: "AI answer", plural: "AI answers" },
};

export const CONTENT_BILLING_LOCK_PREFIX = "content-billing";
export const CONTENT_BILLING_LOCK_TTL_MS = 60 * 60 * 1000;

export const AI_CREDIT_LIMIT_MESSAGE = "AI credit limit reached";
export const CONTENT_PLAN_REQUIRED_MESSAGE =
  "Your plan doesn't include this content type. Upgrade your plan or add AI credits to create it.";
export const AI_GENERATION_PLAN_REQUIRED_MESSAGE =
  "Your plan doesn't include AI generation. Upgrade your plan or add AI credits to continue.";
