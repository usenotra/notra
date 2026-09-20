"use client";

import { normalizePublicWebsiteUrl } from "@notra/geo-core/schemas/url";
import { useHotkey } from "@tanstack/react-hotkeys";
import { useQueryState } from "nuqs";
import { useEffect, useReducer, useRef } from "react";
import { toast } from "sonner";
// biome-ignore lint/performance/noNamespaceImport: Zod recommended way of importing
import * as z from "zod";

import { useOrganizationsContext } from "@/components/providers/organization-provider";
import type { PageClientProps } from "@/types/brand-identity";
import {
  brandIdentityUiReducer,
  getEffectiveBrandAnalysisProgress,
  getInitialBrandIdentityUiState,
  isBrandAnalysisRunning,
} from "@/utils/brand-identity";
import {
  brandIdentityViewParser,
  brandIdentityVoiceParser,
} from "@/utils/brand-identity-search-params";
import {
  findSelectedBrandIdentity,
  readStoredBrandIdentityId,
  writeStoredBrandIdentityId,
} from "@/utils/brand-identity-selection";

import {
  useAnalyzeBrand,
  useBrandAnalysisProgress,
  useBrandSettings,
  useBrandVoiceAffectedTriggers,
  useDeleteBrandVoice,
  useSetDefaultBrandVoice,
} from "../../../../../lib/hooks/use-brand-analysis";
import { useRefreshBrandGuidelinesAction } from "../../../../../lib/hooks/use-brand-guidelines";
import { useReferences } from "../../../../../lib/hooks/use-brand-references";
import { useSitemaps } from "../../../../../lib/hooks/use-brand-sitemaps";
import { BrandIdentityWorkspace } from "./components/brand-identity-workspace";
import { EmptyBrandIdentityState } from "./components/empty-brand-identity-state";
import { BrandIdentityPageSkeleton } from "./skeleton";

function buildDeleteSuccessMessage(
  disabledSchedules: readonly unknown[] | null | undefined,
  disabledEvents: readonly unknown[] | null | undefined
): string {
  const disabledCount =
    (disabledSchedules?.length ?? 0) + (disabledEvents?.length ?? 0);
  if (disabledCount === 0) {
    return "Brand identity deleted";
  }
  const triggerText = disabledCount === 1 ? "trigger was" : "triggers were";
  return `Brand identity deleted. ${disabledCount} ${triggerText} disabled.`;
}

export default function PageClient({ organizationSlug }: PageClientProps) {
  const { getOrganization, activeOrganization } = useOrganizationsContext();
  const orgFromList = getOrganization(organizationSlug);
  const organization =
    activeOrganization?.slug === organizationSlug
      ? activeOrganization
      : orgFromList;
  const organizationId = organization?.id ?? "";

  const { data, isPending: isPendingSettings } =
    useBrandSettings(organizationId);
  const lastToastError = useRef<string | null>(null);
  const { progress, startPolling } = useBrandAnalysisProgress(
    organizationId,
    (message) => {
      if (lastToastError.current === message) {
        return;
      }
      lastToastError.current = message;
      toast.error(message);
    },
    () => {
      toast.success("Brand identity saved");
    }
  );
  const analyzeMutation = useAnalyzeBrand(organizationId, startPolling);
  const deleteVoiceMutation = useDeleteBrandVoice(organizationId);
  const setDefaultMutation = useSetDefaultBrandVoice(organizationId);
  const progressError =
    progress.status === "failed" ? progress.error : undefined;

  const voices = data?.voices ?? [];
  const [uiState, dispatchUi] = useReducer(
    brandIdentityUiReducer,
    undefined,
    getInitialBrandIdentityUiState
  );
  const [activeVoiceId, setActiveVoiceId] = useQueryState(
    "voice",
    brandIdentityVoiceParser
  );
  const [activeTab, setActiveTab] = useQueryState(
    "view",
    brandIdentityViewParser.withDefault("identity")
  );
  const [newIdentityParam, setNewIdentityParam] = useQueryState("new");
  const isAddIdentityOpen =
    uiState.addIdentityOpen || Boolean(newIdentityParam);

  const handleAddIdentityOpenChange = (open: boolean) => {
    dispatchUi({ type: "set-add-identity-open", open });
    if (!open && newIdentityParam) {
      setNewIdentityParam(null);
    }
  };

  useEffect(() => {
    if (organizationId) {
      dispatchUi({
        type: "set-stored-voice-id",
        voiceId: readStoredBrandIdentityId(organizationId),
      });
    }
  }, [organizationId]);

  useHotkey(
    "C",
    () => {
      if (activeTab === "identity") {
        dispatchUi({ type: "set-add-identity-open", open: true });
      } else if (activeTab === "references") {
        dispatchUi({ type: "set-add-reference-open", open: true });
      } else if (activeTab === "sitemap") {
        dispatchUi({ type: "set-add-sitemap-open", open: true });
      }
    },
    {
      enabled: !(
        isAddIdentityOpen ||
        uiState.addReferenceOpen ||
        uiState.addSitemapOpen
      ),
    }
  );

  const selectedVoice = findSelectedBrandIdentity(
    voices,
    activeVoiceId,
    uiState.storedVoiceId
  );

  const handleSelectVoice = (voiceId: string) => {
    writeStoredBrandIdentityId(organizationId, voiceId);
    dispatchUi({ type: "set-stored-voice-id", voiceId });
    setActiveVoiceId(voiceId);
  };

  const deleteTargetVoice = uiState.deleteTargetVoiceId
    ? voices.find((v) => v.id === uiState.deleteTargetVoiceId)
    : null;

  const { data: affectedData, isLoading: isLoadingAffected } =
    useBrandVoiceAffectedTriggers(
      organizationId,
      uiState.deleteTargetVoiceId ?? "",
      !!uiState.deleteTargetVoiceId &&
        !!deleteTargetVoice &&
        !deleteTargetVoice.isDefault
    );

  const { data: referencesData } = useReferences(
    organizationId,
    selectedVoice?.id ?? ""
  );
  const referenceCount = referencesData?.references.length ?? 0;

  const { data: sitemapsData } = useSitemaps(
    organizationId,
    selectedVoice?.id ?? ""
  );
  const sitemapCount = sitemapsData?.sitemaps.length ?? 0;

  const guidelinesRefresh = useRefreshBrandGuidelinesAction(
    organizationId,
    selectedVoice?.id ?? ""
  );

  const effectiveUrl = uiState.url.trim();

  useEffect(() => {
    if (!selectedVoice?.updatedAt) {
      dispatchUi({ type: "set-last-saved-at-ms", savedAtMs: null });
      return;
    }

    dispatchUi({
      type: "set-last-saved-at-ms",
      savedAtMs: new Date(selectedVoice.updatedAt).getTime(),
    });
  }, [selectedVoice]);

  const triggerAnalysis = async (rawUrl: string, voiceId?: string) => {
    let urlToAnalyze = rawUrl.trim();
    if (!urlToAnalyze) {
      toast.error("Please enter a website URL");
      return;
    }

    urlToAnalyze = normalizePublicWebsiteUrl(urlToAnalyze);

    const parseRes = z.url().safeParse(urlToAnalyze);
    if (!parseRes.success) {
      toast.error("Please enter a valid website URL");
      return;
    }

    try {
      lastToastError.current = null;
      await analyzeMutation.mutateAsync({ url: urlToAnalyze, voiceId });
      toast.success("Analysis started");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to start analysis";
      if (lastToastError.current !== message) {
        lastToastError.current = message;
        toast.error(message);
      }
    }
  };

  const handleInitialAnalyze = () => triggerAnalysis(effectiveUrl);

  const handleReanalyze = (voiceUrl: string) =>
    triggerAnalysis(voiceUrl, selectedVoice?.id);

  const handleDeleteVoice = async () => {
    if (!deleteTargetVoice || deleteTargetVoice.isDefault) {
      return;
    }

    try {
      const result = await deleteVoiceMutation.mutateAsync(
        deleteTargetVoice.id
      );
      if (activeVoiceId === deleteTargetVoice.id) {
        setActiveVoiceId(null);
      }
      dispatchUi({ type: "set-delete-target-voice-id", voiceId: null });

      toast.success(
        buildDeleteSuccessMessage(
          result.disabledSchedules,
          result.disabledEvents
        )
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to delete brand identity"
      );
    }
  };

  const handleSetDefault = async () => {
    if (!selectedVoice || selectedVoice.isDefault) {
      return;
    }

    try {
      await setDefaultMutation.mutateAsync(selectedVoice.id);
      toast.success("Default brand identity updated");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to set default"
      );
    }
  };

  const effectiveProgress = getEffectiveBrandAnalysisProgress(
    progress,
    analyzeMutation.isPending
  );
  const isAnalyzing = isBrandAnalysisRunning(
    progress,
    analyzeMutation.isPending
  );

  const hasVoices = voices.length > 0;

  if (!organizationId || (isPendingSettings && !data)) {
    return <BrandIdentityPageSkeleton />;
  }

  if (!hasVoices) {
    return (
      <EmptyBrandIdentityState
        effectiveProgress={effectiveProgress}
        handleInitialAnalyze={handleInitialAnalyze}
        isAnalyzing={isAnalyzing}
        isPending={analyzeMutation.isPending}
        progressError={progressError}
        setUrl={(url) => dispatchUi({ type: "set-url", url })}
        url={uiState.url}
      />
    );
  }

  if (!selectedVoice) {
    return null;
  }

  return (
    <BrandIdentityWorkspace
      activeTab={activeTab}
      affectedEvents={affectedData?.affectedEvents ?? []}
      affectedSchedules={affectedData?.affectedSchedules ?? []}
      analyzePending={analyzeMutation.isPending}
      deleteVoicePending={deleteVoiceMutation.isPending}
      dispatchUi={dispatchUi}
      effectiveProgress={effectiveProgress}
      guidelinesRefreshPending={guidelinesRefresh.isPending}
      handleAddIdentityOpenChange={handleAddIdentityOpenChange}
      handleDeleteVoice={handleDeleteVoice}
      handleReanalyze={handleReanalyze}
      handleSelectVoice={handleSelectVoice}
      handleSetDefault={handleSetDefault}
      isAddIdentityOpen={isAddIdentityOpen}
      isAnalyzing={isAnalyzing}
      isLoadingAffected={isLoadingAffected}
      onRefreshGuidelines={guidelinesRefresh.refreshGuidelines}
      organizationId={organizationId}
      progressError={progressError}
      referenceCount={referenceCount}
      selectedVoice={selectedVoice}
      setActiveTab={setActiveTab}
      setDefaultPending={setDefaultMutation.isPending}
      sitemapCount={sitemapCount}
      startPolling={startPolling}
      uiState={uiState}
      voices={voices}
    />
  );
}
