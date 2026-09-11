"use client";

import type { ToneProfile } from "@notra/ai/schemas/tone";
import { getValidLanguage } from "@notra/schemas/dashboard/brand";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@notra/ui/components/ui/alert";
import { useEffect } from "react";

import { PageContainer } from "@/components/layout/container";
import type {
  BrandFormInitialData,
  BrandIdentityWorkspaceProps,
} from "@/types/brand-identity";
import { sanitizeBrandUrlInput } from "@/utils/brand-identity";
import { formatRelativeTime } from "@/utils/format";

import { AddIdentityDialog } from "./add-identity-dialog";
import { AnalysisStepper } from "./analysis-stepper";
import { BrandIdentityHeader } from "./brand-identity-header";
import { BrandIdentityTabs } from "./brand-identity-tabs";
import { VoiceSelector } from "./voice-selector";

export function BrandIdentityWorkspace({
  activeTab,
  affectedEvents,
  affectedSchedules,
  analyzePending,
  deleteVoicePending,
  dispatchUi,
  effectiveProgress,
  guidelinesRefreshPending,
  handleAddIdentityOpenChange,
  handleDeleteVoice,
  handleReanalyze,
  handleSelectVoice,
  handleSetDefault,
  isAddIdentityOpen,
  isAnalyzing,
  isLoadingAffected,
  organizationId,
  onRefreshGuidelines,
  progressError,
  referenceCount,
  selectedVoice,
  setDefaultPending,
  setActiveTab,
  sitemapCount,
  startPolling,
  uiState,
  voices,
}: BrandIdentityWorkspaceProps) {
  useEffect(() => {
    if (
      activeTab !== "identity" ||
      uiState.isSaving ||
      !uiState.lastSavedAtMs
    ) {
      return;
    }

    const interval = window.setInterval(() => {
      dispatchUi({ type: "set-relative-time-now", now: Date.now() });
    }, 10_000);

    return () => {
      window.clearInterval(interval);
    };
  }, [activeTab, dispatchUi, uiState.isSaving, uiState.lastSavedAtMs]);

  const initialData: BrandFormInitialData = {
    name: selectedVoice.name,
    websiteUrl: selectedVoice.websiteUrl
      ? sanitizeBrandUrlInput(selectedVoice.websiteUrl)
      : "",
    companyName: selectedVoice.companyName ?? "",
    companyDescription: selectedVoice.companyDescription ?? "",
    toneProfile: (selectedVoice.toneProfile as ToneProfile) ?? "Professional",
    customTone: selectedVoice.customTone ?? "",
    customInstructions: selectedVoice.customInstructions ?? "",
    useCustomTone: Boolean(selectedVoice.customTone),
    audience: selectedVoice.audience ?? "",
    language: getValidLanguage(selectedVoice.language),
  };
  let saveStatusText = "Saved just now";

  if (uiState.isSaving) {
    saveStatusText = "Saving...";
  } else if (uiState.lastSavedAtMs) {
    saveStatusText = formatRelativeTime(
      new Date(uiState.lastSavedAtMs),
      uiState.relativeTimeNow
    );
  }

  return (
    <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-6 px-4 lg:px-6">
        <BrandIdentityHeader
          activeTab={activeTab}
          isRefreshingGuidelines={guidelinesRefreshPending}
          onAddIdentity={() =>
            dispatchUi({ type: "set-add-identity-open", open: true })
          }
          onAddReference={() =>
            dispatchUi({ type: "set-add-reference-open", open: true })
          }
          onAddSitemap={() =>
            dispatchUi({ type: "set-add-sitemap-open", open: true })
          }
          onRefreshGuidelines={onRefreshGuidelines}
        />

        <VoiceSelector
          activeVoiceId={selectedVoice.id}
          affectedEvents={affectedEvents}
          affectedSchedules={affectedSchedules}
          isDeleteDialogOpen={!!uiState.deleteTargetVoiceId}
          isDeleting={deleteVoicePending}
          isLoadingAffected={isLoadingAffected}
          isReanalyzing={analyzePending}
          isSettingDefault={setDefaultPending}
          onDelete={handleDeleteVoice}
          onDeleteDialogChange={(open) => {
            if (!open) {
              dispatchUi({
                type: "set-delete-target-voice-id",
                voiceId: null,
              });
            }
          }}
          onReanalyze={handleReanalyze}
          onRequestDelete={(voiceId) =>
            dispatchUi({ type: "set-delete-target-voice-id", voiceId })
          }
          onSelect={handleSelectVoice}
          onSetDefault={handleSetDefault}
          organizationId={organizationId}
          voices={voices}
        />

        <AddIdentityDialog
          onCreated={(voice) => handleSelectVoice(voice.id)}
          onOpenChange={handleAddIdentityOpenChange}
          open={isAddIdentityOpen}
          organizationId={organizationId}
          startPolling={startPolling}
        />

        {isAnalyzing || progressError ? (
          <Alert variant={progressError ? "destructive" : "default"}>
            <AlertTitle>
              {progressError
                ? "Brand analysis failed"
                : "Brand analysis is running"}
            </AlertTitle>
            <AlertDescription className="space-y-3">
              <p>
                {progressError
                  ? progressError
                  : "We are extracting the website details now. The form updates automatically as soon as the analysis finishes."}
              </p>
              {isAnalyzing ? (
                <AnalysisStepper progress={effectiveProgress} />
              ) : null}
            </AlertDescription>
          </Alert>
        ) : null}

        <BrandIdentityTabs
          activeTab={activeTab}
          addReferenceOpen={uiState.addReferenceOpen}
          addSitemapOpen={uiState.addSitemapOpen}
          initialData={initialData}
          onActiveTabChange={setActiveTab}
          onAddReferenceOpenChange={(open) =>
            dispatchUi({ type: "set-add-reference-open", open })
          }
          onAddSitemapOpenChange={(open) =>
            dispatchUi({ type: "set-add-sitemap-open", open })
          }
          onSavedAtChange={(savedAt) =>
            dispatchUi({
              type: "set-last-saved-at-ms",
              savedAtMs: savedAt.getTime(),
            })
          }
          onSavingChange={(isSaving) =>
            dispatchUi({ type: "set-is-saving", isSaving })
          }
          organizationId={organizationId}
          referenceCount={referenceCount}
          saveStatusText={saveStatusText}
          sitemapCount={sitemapCount}
          voiceId={selectedVoice.id}
          voiceWebsiteUrl={selectedVoice.websiteUrl}
        />
      </div>
    </PageContainer>
  );
}
