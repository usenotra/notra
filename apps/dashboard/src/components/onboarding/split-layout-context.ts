import { createContext } from "react";

import type { OnboardingLayoutContext } from "@/types/onboarding-layout";

/** Loaded once by the onboarding route and read by every step's layout. */
export const OnboardingSplitLayoutContext =
  createContext<OnboardingLayoutContext | null>(null);
