import { FEATURES } from "@notra/ai/billing/features";

import { USAGE_FEATURE_LABELS, USAGE_FEATURE_ORDER } from "@/constants/billing";
import type {
  FeatureData,
  UsageAggregateRow,
  UsageBreakdownPoint,
} from "@/types/hooks/billing";
import {
  formatCount,
  formatDollars,
  formatFullDate,
  formatPercent,
} from "@/utils/format";

type BalanceRecord = {
  remaining?: number | null;
  granted?: number | null;
  unlimited?: boolean;
  nextResetAt?: number | null;
};

function formatFeatureName(id: string): string {
  return id.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function usageFeatureLabel(id: string): string {
  return USAGE_FEATURE_LABELS[id] ?? formatFeatureName(id);
}

function isLogRetentionFeature(featureId: string) {
  return (
    featureId === FEATURES.LOG_RETENTION_7_DAYS ||
    featureId === FEATURES.LOG_RETENTION_14_DAYS ||
    featureId === FEATURES.LOG_RETENTION_30_DAYS
  );
}

function isHiddenFromFeatureList(featureId: string) {
  return (
    featureId === FEATURES.AI_ANSWERS ||
    featureId === FEATURES.AI_CREDITS ||
    featureId === FEATURES.ZDR ||
    isLogRetentionFeature(featureId)
  );
}

function usageFeatureOrder(featureId: string) {
  const index = USAGE_FEATURE_ORDER.indexOf(featureId);
  return index === -1 ? USAGE_FEATURE_ORDER.length : index;
}

function hasRetentionEntitlement(feature: FeatureData | undefined) {
  return (
    feature?.unlimited === true ||
    (feature?.included ?? 0) > 0 ||
    (feature?.balance ?? 0) > 0
  );
}

export function isRetentionFeature(feature: FeatureData) {
  return isLogRetentionFeature(feature.id);
}

export function featuresFromBalances(
  balances: Record<string, BalanceRecord | null> | null | undefined
): FeatureData[] {
  if (!balances) {
    return [];
  }
  const features: FeatureData[] = [];
  for (const [id, feature] of Object.entries(balances)) {
    features.push({
      id,
      name: usageFeatureLabel(id),
      balance:
        typeof feature?.remaining === "number" ? feature.remaining : null,
      included: typeof feature?.granted === "number" ? feature.granted : null,
      unlimited: feature?.unlimited === true,
      nextResetAt:
        typeof feature?.nextResetAt === "number" ? feature.nextResetAt : null,
    });
  }
  return features;
}

export function limitedUsageFeatures(features: readonly FeatureData[]) {
  return features
    .filter(
      (feature) =>
        !feature.unlimited &&
        feature.included !== null &&
        !isHiddenFromFeatureList(feature.id)
    )
    .toSorted(
      (left, right) => usageFeatureOrder(left.id) - usageFeatureOrder(right.id)
    );
}

export function unlimitedUsageFeatures(features: readonly FeatureData[]) {
  return features
    .filter(
      (feature) => feature.unlimited && !isHiddenFromFeatureList(feature.id)
    )
    .toSorted(
      (left, right) => usageFeatureOrder(left.id) - usageFeatureOrder(right.id)
    );
}

export function usageRetentionDays(features: readonly FeatureData[]): number {
  const fourteen = features.find(
    (feature) => feature.id === FEATURES.LOG_RETENTION_14_DAYS
  );
  const thirty = features.find(
    (feature) => feature.id === FEATURES.LOG_RETENTION_30_DAYS
  );
  if (hasRetentionEntitlement(thirty)) {
    return 30;
  }
  if (hasRetentionEntitlement(fourteen)) {
    return 14;
  }
  return 7;
}

function remainingFooter(remaining: number, nextResetAt: number | null) {
  const remainingLabel = `${formatPercent(remaining)}% remaining`;
  if (nextResetAt === null) {
    return remainingLabel;
  }
  return `${remainingLabel} · Resets ${formatFullDate(nextResetAt)}`;
}

export function aiAnswersValue(feature: FeatureData) {
  if (feature.unlimited) {
    return "Unlimited";
  }
  if (feature.balance !== null) {
    return formatCount(feature.balance);
  }
  return "-";
}

export function aiAnswersHint(feature: FeatureData) {
  if (feature.unlimited || feature.included === null) {
    return undefined;
  }
  return `of ${formatCount(feature.included)} this cycle`;
}

export function aiAnswersFooter(feature: FeatureData, remaining: number) {
  if (feature.unlimited) {
    return "Included in your plan without a usage cap.";
  }
  return remainingFooter(remaining, feature.nextResetAt);
}

export function usageBreakdownPoints(
  rows: readonly UsageAggregateRow[] | null | undefined
): UsageBreakdownPoint[] {
  if (!rows?.length) {
    return [];
  }
  return rows.map((row) => {
    const value = row.values?.[FEATURES.AI_ANSWERS];
    return {
      date: row.period,
      ai_answers: typeof value === "number" ? value : 0,
    };
  });
}

export function creditsValue(feature: FeatureData) {
  return feature.balance !== null ? formatDollars(feature.balance) : "-";
}

export function remainingCountLabel(feature: FeatureData) {
  if (feature.balance !== null) {
    return `${formatCount(feature.balance)} of ${formatCount(feature.included ?? 0)} remaining`;
  }
  return `of ${formatCount(feature.included ?? 0)} remaining`;
}
