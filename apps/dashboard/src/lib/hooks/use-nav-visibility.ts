"use client";

import { useFlag } from "@databuddy/sdk/react";
import { isDemoModeClient } from "@notra/utils/demo-mode";

import { SOCIAL_ANALYTICS_FLAG_KEY } from "@/constants/analytics";
import { IRIS_FLAG_KEY } from "@/constants/iris";
import type { NavVisibility } from "@/types/components/nav";

// The demo shows what a new workspace sees: flagged features stay off.
function isFlagVisibleInNav(flagOn: boolean): boolean {
  return (
    !isDemoModeClient() && (flagOn || process.env.NODE_ENV === "development")
  );
}

export function useNavVisibility(): NavVisibility {
  const irisFlag = useFlag(IRIS_FLAG_KEY);
  const analyticsFlag = useFlag(SOCIAL_ANALYTICS_FLAG_KEY);

  return {
    iris: isFlagVisibleInNav(irisFlag.on),
    analytics: isFlagVisibleInNav(analyticsFlag.on),
  };
}
