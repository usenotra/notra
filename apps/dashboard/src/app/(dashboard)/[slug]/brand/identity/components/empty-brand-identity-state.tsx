"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@notra/ui/components/ui/card";
import { useTranslations } from "next-intl";

import { PageContainer } from "@/components/layout/container";
import { getModalState } from "@/utils/brand-identity";

import { ModalContent } from "./modal-content";

interface EmptyBrandIdentityStateProps {
  effectiveProgress: {
    status: string;
    currentStep: number;
  };
  handleInitialAnalyze: () => void;
  isAnalyzing: boolean;
  isPending: boolean;
  progressError?: string;
  setUrl: (url: string) => void;
  url: string;
}

export function EmptyBrandIdentityState({
  effectiveProgress,
  handleInitialAnalyze,
  isAnalyzing,
  isPending,
  progressError,
  setUrl,
  url,
}: EmptyBrandIdentityStateProps) {
  const t = useTranslations("brand.identity");
  const tCommon = useTranslations("common");
  const modalState = getModalState(
    false,
    isAnalyzing,
    effectiveProgress.status
  );
  const modalTitle =
    modalState === "loading"
      ? tCommon("labels.loading")
      : t(`modal.${modalState}.title`);
  let modalDescription = progressError;
  if (!(modalState === "failed" && progressError)) {
    modalDescription =
      modalState === "failed"
        ? tCommon("states.error")
        : t(`modal.${modalState}.description`);
  }
  return (
    <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full px-4 lg:px-6">
        <div className="relative min-h-125">
          <div className="pointer-events-none blur-sm">
            <div className="mb-6 space-y-1">
              <h1 className="text-3xl font-bold tracking-tight">
                {tCommon("labels.brandIdentity")}
              </h1>
              <p className="text-muted-foreground">
                {t("header.tabs.identity.description")}
              </p>
            </div>
            <div className="space-y-8">
              <div className="bg-muted/20 h-16 w-80 rounded-lg border" />
              <div className="bg-muted/20 h-16 w-80 rounded-lg border" />
              <div className="bg-muted/20 h-32 w-full max-w-xl rounded-lg border" />
              <div className="bg-muted/20 h-24 w-80 rounded-lg border" />
            </div>
          </div>

          <div className="absolute inset-0 flex items-center justify-center">
            <Card className="border-border/50 w-full max-w-md shadow-xs">
              <CardHeader className="text-center">
                <CardTitle>{modalTitle}</CardTitle>
                <CardDescription>{modalDescription}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ModalContent
                  handleAnalyze={handleInitialAnalyze}
                  inlineError={progressError}
                  isAnalyzing={isAnalyzing}
                  isPending={isPending}
                  isPendingSettings={false}
                  progress={effectiveProgress}
                  setUrl={setUrl}
                  url={url}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
