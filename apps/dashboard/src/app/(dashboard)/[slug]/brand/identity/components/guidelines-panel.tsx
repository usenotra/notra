"use client";

import { Refresh03Icon, SparklesIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { Loader2Icon } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";

import { Button } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import { EmptyStateGuidelinesPreview } from "@/components/empty-state-preview";
import { GUIDELINES_SKELETON_KEYS } from "@/constants/brand-guideline-ui";
import {
  useBrandGuidelines,
  useRefreshBrandGuidelinesAction,
} from "@/lib/hooks/use-brand-guidelines";
import type { GuidelinesPanelProps } from "@/types/brand-identity";
import { formatRelativeTime } from "@/utils/format";

import { GuidelinesAssetsSection } from "./guidelines-assets-section";
import { GuidelinesColorsSection } from "./guidelines-colors-section";
import { GuidelinesScreenshotsSection } from "./guidelines-screenshots-section";
import { GuidelinesSourcePdfSection } from "./guidelines-source-pdf-section";
import { GuidelinesTokensSection } from "./guidelines-tokens-section";
import { GuidelinesTypographySection } from "./guidelines-typography-section";

export function GuidelinesPanel({
  organizationId,
  voiceId,
}: GuidelinesPanelProps) {
  const { data, isError, isPending, refetch } = useBrandGuidelines(
    organizationId,
    voiceId
  );
  const refresh = useRefreshBrandGuidelinesAction(organizationId, voiceId);

  const isFailed = data?.guideline?.status === "failed";
  // `queued` is the initial/never-generated state (including PDF-only rows
  // created by attach). Only `generating` means a workflow is actively
  // running; polling and the generating UI key off this.
  const isGenerating = data?.guideline?.status === "generating";
  const isRefreshBusy = refresh.isPending || isGenerating;
  const generationError = data?.guideline?.lastGenerationError;

  useEffect(() => {
    if (!isFailed) {
      return;
    }

    toast.error("Guideline generation failed", {
      description:
        generationError ?? "Something went wrong while generating guidelines.",
      id: "brand-guideline-generation-failed",
    });
  }, [isFailed, generationError]);

  if (isPending) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-7 w-36" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {GUIDELINES_SKELETON_KEYS.map((key) => (
            <Skeleton className="h-44 w-full" key={key} />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <EmptyState
        actionIcon={<HugeiconsIcon className="size-4" icon={Refresh03Icon} />}
        actionLabel="Retry"
        description="We couldn't load this brand identity's guidelines."
        onActionClick={() => refetch()}
        title="Guidelines unavailable"
      />
    );
  }

  const { guideline, assets, colors, fonts, tokens, screenshots } = data;

  const sourcePdf = (
    <GuidelinesSourcePdfSection
      guideline={guideline}
      organizationId={organizationId}
      voiceId={voiceId}
    />
  );

  const hasData =
    assets.length > 0 ||
    colors.length > 0 ||
    fonts.length > 0 ||
    tokens.length > 0 ||
    screenshots.length > 0;

  // Never generated: no generated assets and no successful generation yet.
  // Covers both `guideline === null` and PDF-only `queued` rows so a PDF
  // upload alone keeps the "Generate Guidelines" empty state instead of the
  // "Guidelines are empty / Refresh" state.
  const neverGenerated = !hasData && !guideline?.lastGeneratedAt && !isFailed;

  if (!guideline || (neverGenerated && !isGenerating)) {
    return (
      <div className="space-y-6">
        {sourcePdf}
        <EmptyState
          action={
            <Button
              disabled={isRefreshBusy}
              onClick={refresh.refreshGuidelines}
            >
              {isRefreshBusy ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <HugeiconsIcon className="size-4" icon={SparklesIcon} />
              )}
              {isRefreshBusy ? "Generating…" : "Generate Guidelines"}
            </Button>
          }
          description="Brand guidelines have not been generated yet. Generate them to pull logos, colors, typography, and landing page screenshots from your website."
          preview={<EmptyStateGuidelinesPreview />}
          title="No guidelines yet"
        />
      </div>
    );
  }

  if (isGenerating && !hasData) {
    return (
      <div className="space-y-6">
        {sourcePdf}
        <div className="flex items-center justify-between gap-3">
          <p className="text-muted-foreground flex items-center gap-2 text-sm">
            <Loader2Icon className="size-4 animate-spin" />
            Generating guidelines…
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {GUIDELINES_SKELETON_KEYS.map((key) => (
            <Skeleton className="h-44 w-full" key={key} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {sourcePdf}
      {isGenerating ? (
        <p className="text-muted-foreground flex items-center justify-end gap-2 text-xs">
          <Loader2Icon className="size-3 animate-spin" />
          Updating guidelines…
        </p>
      ) : null}

      {guideline.lastGeneratedAt && !isGenerating ? (
        <p className="text-muted-foreground text-right text-xs">
          Updated {formatRelativeTime(new Date(guideline.lastGeneratedAt))}
        </p>
      ) : null}

      {hasData ? (
        <>
          <GuidelinesAssetsSection
            assets={assets}
            organizationId={organizationId}
            voiceId={voiceId}
          />
          <GuidelinesColorsSection
            colors={colors}
            organizationId={organizationId}
            voiceId={voiceId}
          />
          <GuidelinesTypographySection
            fonts={fonts}
            organizationId={organizationId}
            voiceId={voiceId}
          />
          <GuidelinesTokensSection
            organizationId={organizationId}
            tokens={tokens}
            voiceId={voiceId}
          />
          <GuidelinesScreenshotsSection
            organizationId={organizationId}
            screenshots={screenshots}
            voiceId={voiceId}
          />
        </>
      ) : null}

      {hasData ? null : (
        <EmptyState
          action={
            <Button
              disabled={isRefreshBusy}
              onClick={refresh.refreshGuidelines}
            >
              {isRefreshBusy ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <HugeiconsIcon className="size-4" icon={Refresh03Icon} />
              )}
              {isRefreshBusy ? "Refreshing…" : "Refresh Guidelines"}
            </Button>
          }
          description="No brand assets were detected for this identity yet. Refresh to pull the latest logos, colors, and screenshots."
          preview={<EmptyStateGuidelinesPreview />}
          title="Guidelines are empty"
        />
      )}
    </div>
  );
}
