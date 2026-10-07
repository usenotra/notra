import { expect, test } from "bun:test";

import {
  AI_CREDIT_LIMIT_MESSAGE,
  AI_GENERATION_PLAN_REQUIRED_MESSAGE,
  CONTENT_PLAN_REQUIRED_MESSAGE,
} from "../constants/content-billing";
import type { ContentBillingReservation } from "../types/billing";
import {
  describeContentBillingDenial,
  getContentBillingLimitLabel,
} from "./content-billing-messages";

test("pure billing messages preserve quota and entitlement wording", () => {
  const reservation: ContentBillingReservation = {
    allowed: false,
    mode: "plan_quota",
    reserved: false,
    lockId: null,
    useMarkup: false,
    reason: "quota_exhausted",
    featureId: "long_form_posts",
  };
  expect(getContentBillingLimitLabel(reservation)).toBe("long-form posts");
  expect(describeContentBillingDenial(reservation)).toBe(
    "You've used all the long-form posts included in your plan this month. Upgrade your plan or add AI credits to keep creating."
  );
  expect(
    getContentBillingLimitLabel({ ...reservation, featureId: "ai_credits" })
  ).toBeUndefined();
  expect(
    describeContentBillingDenial({
      ...reservation,
      reason: "no_entitlement",
      featureId: "ai_answers",
    })
  ).toBe(
    "Your plan doesn't include AI answers. Upgrade your plan or add AI credits to continue."
  );
  expect(
    describeContentBillingDenial({
      ...reservation,
      reason: "no_entitlement",
      featureId: null,
    })
  ).toBe(AI_GENERATION_PLAN_REQUIRED_MESSAGE);
  expect(
    describeContentBillingDenial({
      ...reservation,
      reason: "no_entitlement",
      featureId: "ai_credits",
    })
  ).toBe(CONTENT_PLAN_REQUIRED_MESSAGE);
  expect(
    describeContentBillingDenial({
      ...reservation,
      reason: "insufficient_ai_credits",
      featureId: "ai_credits",
    })
  ).toBe(AI_CREDIT_LIMIT_MESSAGE);
});
