import { FEATURES } from "../billing/features";
import {
  AI_CREDIT_LIMIT_MESSAGE,
  AI_GENERATION_PLAN_REQUIRED_MESSAGE,
  CONTENT_PLAN_REQUIRED_MESSAGE,
  CONTENT_QUOTA_LABELS,
} from "../constants/content-billing";
import type { ContentBillingReservation } from "../types/billing";

export function getContentBillingLimitLabel(
  reservation: ContentBillingReservation
): string | undefined {
  if (reservation.reason !== "quota_exhausted") {
    return undefined;
  }
  const featureId = reservation.featureId;
  if (!featureId || featureId === FEATURES.AI_CREDITS) {
    return undefined;
  }
  return CONTENT_QUOTA_LABELS[featureId].plural;
}

export function describeContentBillingDenial(
  reservation: ContentBillingReservation
): string {
  if (reservation.reason === "quota_exhausted") {
    const label = getContentBillingLimitLabel(reservation) ?? "posts";
    return `You've used all the ${label} included in your plan this month. Upgrade your plan or add AI credits to keep creating.`;
  }
  if (reservation.reason === "no_entitlement") {
    const featureId = reservation.featureId;
    if (featureId && featureId !== FEATURES.AI_CREDITS) {
      return `Your plan doesn't include ${CONTENT_QUOTA_LABELS[featureId].plural}. Upgrade your plan or add AI credits to continue.`;
    }
    if (!featureId) {
      return AI_GENERATION_PLAN_REQUIRED_MESSAGE;
    }
    return CONTENT_PLAN_REQUIRED_MESSAGE;
  }
  return AI_CREDIT_LIMIT_MESSAGE;
}
