"use client";

import { RainbowIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { useEffect, useRef } from "react";
import { useTranslations } from "use-intl";

import { trackEvent } from "@/lib/analytics/posthog-client";

export function IrisUnavailableState() {
  const t = useTranslations("iris.unavailable");
  const viewedRef = useRef(false);

  useEffect(() => {
    if (viewedRef.current) {
      return;
    }
    viewedRef.current = true;
    trackEvent(POSTHOG_EVENTS.IRIS_UNAVAILABLE_VIEWED);
  }, []);

  return (
    <div className="border-border mx-auto flex w-full max-w-xl flex-col items-center gap-3 rounded-xl border p-8 text-center">
      <span className="border-border inline-flex size-11 items-center justify-center rounded-2xl border">
        <HugeiconsIcon className="size-5" icon={RainbowIcon} />
      </span>
      <h1 className="text-xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="text-muted-foreground text-sm text-balance">
        {t("description")}
      </p>
    </div>
  );
}
