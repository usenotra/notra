import { Spinner } from "@notra/ui/components/ui/spinner";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import type { ModalContentProps } from "@/types/brand-identity";

import { AnalysisStepper } from "./analysis-stepper";

export function ModalContent({
  isPendingSettings,
  isAnalyzing,
  progress,
  url,
  setUrl,
  handleAnalyze,
  isPending,
  inlineError,
}: ModalContentProps) {
  const t = useTranslations("brand.identity.analyze");
  const tCommon = useTranslations("common");
  if (isPendingSettings) {
    return (
      <div className="flex justify-center py-4">
        <Spinner className="text-primary size-8" />
      </div>
    );
  }

  if (isAnalyzing) {
    return <AnalysisStepper progress={progress} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div
          className={`bg-background focus-within:ring-ring/20 flex w-full flex-row items-center overflow-hidden rounded-lg border transition-all focus-within:ring-2 ${progress.status === "failed" ? "border-destructive" : "border-input"}`}
        >
          <span className="border-input bg-muted/50 text-muted-foreground flex h-10 items-center border-r px-3 text-sm">
            https://
          </span>
          <input
            aria-label={t("websiteUrl")}
            className="placeholder:text-muted-foreground h-10 flex-1 bg-transparent px-3 text-sm outline-none"
            disabled={isPending}
            id="brand-url-input"
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !isPending) {
                handleAnalyze();
              }
            }}
            placeholder="example.com"
            type="text"
            value={url}
          />
        </div>
        <Button
          className="h-10 px-6"
          loading={isPending}
          onClick={handleAnalyze}
        >
          {tCommon("labels.analyze")}
        </Button>
      </div>
      {(inlineError || progress.status === "failed") && (
        <p className="text-destructive text-center text-sm">
          {inlineError ?? t("tryDifferentUrl")}
        </p>
      )}
    </div>
  );
}
