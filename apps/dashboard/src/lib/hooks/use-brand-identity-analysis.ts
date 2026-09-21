"use client";

import { normalizePublicWebsiteUrl } from "@notra/geo-core/schemas/url";
import { useRef } from "react";
import { toast } from "sonner";
import { url } from "zod";

import {
  useAnalyzeBrand,
  useBrandAnalysisProgress,
} from "@/lib/hooks/use-brand-analysis";

export function useBrandIdentityAnalysis(organizationId: string) {
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
    () => toast.success("Brand identity saved")
  );
  const analyzeMutation = useAnalyzeBrand(organizationId, startPolling);

  const triggerAnalysis = async (rawUrl: string, voiceId?: string) => {
    const trimmedUrl = rawUrl.trim();
    if (!trimmedUrl) {
      toast.error("Please enter a website URL");
      return;
    }

    const websiteUrl = normalizePublicWebsiteUrl(trimmedUrl);
    if (!url().safeParse(websiteUrl).success) {
      toast.error("Please enter a valid website URL");
      return;
    }

    try {
      lastToastError.current = null;
      await analyzeMutation.mutateAsync({ url: websiteUrl, voiceId });
      toast.success("Analysis started");
    } catch (error) {
      reportError(
        error instanceof Error ? error.message : "Failed to start analysis"
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
