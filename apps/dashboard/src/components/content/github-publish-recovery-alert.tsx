"use client";

import { AlertCircleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@notra/ui/components/ui/alert";
import { useTranslations } from "next-intl";

import type { GitHubPublishRecoveryAlertProps } from "@/types/content/detail";

export function GitHubPublishRecoveryAlert({
  publishRecovery,
}: GitHubPublishRecoveryAlertProps) {
  const t = useTranslations("content.githubPublish");

  return (
    <Alert variant="destructive">
      <HugeiconsIcon icon={AlertCircleIcon} />
      <AlertTitle>{t(`recovery.${publishRecovery.code}.title`)}</AlertTitle>
      <AlertDescription>
        <p>{t(`recovery.${publishRecovery.code}.description`)}</p>
        {publishRecovery.publishingPaused ? <p>{t("pausedNote")}</p> : null}
      </AlertDescription>
    </Alert>
  );
}
