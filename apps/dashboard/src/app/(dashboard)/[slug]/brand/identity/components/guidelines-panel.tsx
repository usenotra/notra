"use client";

import { Refresh03Icon, SparklesIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { Loader2Icon } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { EmptyState } from "@/components/empty-state";
import { EmptyStateGuidelinesPreview } from "@/components/empty-state-preview";
import { GUIDELINES_SKELETON_KEYS } from "@/constants/brand-guideline-ui";
import {
  useBrandGuidelines,
  useRefreshBrandGuidelinesAction,
} from "@/lib/hooks/use-brand-guidelines";
import type { GuidelinesPanelProps } from "@/types/brand-identity";

import { GuidelinesActionButton } from "./guidelines-action-button";
import { GuidelinesAssetsSection } from "./guidelines-assets-section";
import { GuidelinesColorsSection } from "./guidelines-colors-section";
import { GuidelinesScreenshotsSection } from "./guidelines-screenshots-section";
import { GuidelinesStatusLine } from "./guidelines-status-line";
import { GuidelinesTokensSection } from "./guidelines-tokens-section";
import { GuidelinesTypographySection } from "./guidelines-typography-section";

export function GuidelinesPanel({
  organizationId,
  voiceId,
}: GuidelinesPanelProps) {
  const t = useTranslations("brand.guidelines.panel");
  const tCommon2 = useTranslations("common");
  const tBrandShared = useTranslations("brand.shared");
  const tCommon = useTranslations("common.actions");
  const { data, isError, isPending, refetch } = useBrandGuidelines(
    organizationId,
    voiceId
  );
  const refresh = useRefreshBrandGuidelinesAction(organizationId, voiceId);

  const isFailed = data?.guideline?.status === "failed";
  const isGenerating =
    data?.guideline?.status === "queued" ||
    data?.guideline?.status === "generating";
  const isRefreshBusy = refresh.isPending || isGenerating;
  const generationError = data?.guideline?.lastGenerationError;

  useEffect(() => {
    if (!isFailed) {
      return;
    }

    toast.error(t("generationFailed"), {
      description: generationError ?? t("generationFailedDescription"),
      id: "brand-guideline-generation-failed",
    });
  }, [isFailed, generationError, t]);

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
        actionLabel={tCommon("retry")}
        description={t("loadErrorDescription")}
        onActionClick={() => refetch()}
        title={t("loadErrorTitle")}
      />
    );
  }

  const { guideline, assets, colors, fonts, tokens, screenshots } = data;

  if (!guideline) {
    return (
      <EmptyState
        action={
          <GuidelinesActionButton
            busy={isRefreshBusy}
            busyLabel={tCommon2("labels.generating")}
            icon={SparklesIcon}
            label={t("generate")}
            onClick={refresh.refreshGuidelines}
          />
        }
        description={t("emptyDescription")}
        preview={<EmptyStateGuidelinesPreview />}
        title={t("emptyTitle")}
      />
    );
  }

  const hasData =
    assets.length > 0 ||
    colors.length > 0 ||
    fonts.length > 0 ||
    tokens.length > 0 ||
    screenshots.length > 0;

  if (isGenerating && !hasData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-muted-foreground flex items-center gap-2 text-sm">
            <Loader2Icon className="size-4 animate-spin" />
            {t("generatingGuidelines")}
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
      <GuidelinesStatusLine
        generating={isGenerating}
        lastGeneratedAt={guideline.lastGeneratedAt}
      />

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
            <GuidelinesActionButton
              busy={isRefreshBusy}
              busyLabel={tCommon2("labels.refreshing")}
              icon={Refresh03Icon}
              label={tBrandShared("refreshGuidelines")}
              onClick={refresh.refreshGuidelines}
            />
          }
          description={t("noAssetsDescription")}
          preview={<EmptyStateGuidelinesPreview />}
          title={t("noAssetsTitle")}
        />
      )}
    </div>
  );
}
