"use client";

import { publicWebsiteUrlSchema } from "@notra/geo-core/schemas/url";
import { useTranslations } from "next-intl";
import { useRef } from "react";
import { toast } from "sonner";

import {
  useAnalyzeBrand,
  useBrandAnalysisProgress,
} from "@/lib/hooks/use-brand-analysis";

export function useBrandIdentityAnalysis(organizationId: string) {
  const tToast = useTranslations("brand.toasts");
  const tCommon = useTranslations("common");
  const lastToastError = useRef<string | null>(null);
  const reportError = (message: string) => {
    if (lastToastError.current === message) {
      return;
    }
    lastToastError.current = message;
    toast.error(message);
  };
  const { progress, startPolling } = useBrandAnalysisProgress(
    organizationId,
    reportError,
    () => toast.success(tToast("identitySaved"))
  );
  const analyzeMutation = useAnalyzeBrand(organizationId, startPolling);

  const triggerAnalysis = async (rawUrl: string, voiceId?: string) => {
    const trimmedUrl = rawUrl.trim();
    if (!trimmedUrl) {
      toast.error(tCommon("messages.enterAWebsiteUrl"));
      return;
    }

    const websiteUrl = publicWebsiteUrlSchema.safeParse(trimmedUrl);
    if (!websiteUrl.success) {
      toast.error(tToast("urlInvalid"));
      return;
    }

    try {
      lastToastError.current = null;
      await analyzeMutation.mutateAsync({ url: websiteUrl.data, voiceId });
      toast.success(tToast("analysisStarted"));
    } catch (error) {
      reportError(
        error instanceof Error ? error.message : tToast("startAnalysisFailed")
      );
    }
  };

  const progressError =
    progress.status === "failed" ? progress.error : undefined;
  return {
    progress,
    progressError,
    startPolling,
    analyzeMutation,
    triggerAnalysis,
  };
}
