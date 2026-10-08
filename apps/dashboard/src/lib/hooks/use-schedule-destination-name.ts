"use client";

import { useTranslations } from "use-intl";

import { SOCIAL_PLATFORM_LABELS } from "@/constants/social-connect";
import type { ScheduleDestinationMarkProps } from "@/types/content/schedule";

/** A destination's display name: the network (X, LinkedIn) for social. */
export function useScheduleDestinationName() {
  const t = useTranslations("content.calendar.schedule");
  return ({ destination, socialPlatform }: ScheduleDestinationMarkProps) =>
    destination === "social" && socialPlatform
      ? SOCIAL_PLATFORM_LABELS[socialPlatform]
      : t(`destinations.${destination}`);
}
