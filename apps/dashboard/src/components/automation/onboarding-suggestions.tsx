"use client";

import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import {
  ArrowRight01Icon,
  Cancel01Icon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { BrailleLoader } from "@notra/ui/components/shared/braille-loader";
import { TitleCard } from "@notra/ui/components/ui/title-card";
import {
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { SuggestionDetailsSheet } from "@/components/automation/suggestion-details-sheet";
import { Button } from "@/components/button";
import { EVE_ACCENT_COLOR } from "@/constants/onboarding-agent";
import { trackEvent } from "@/lib/analytics/posthog-client";
import {
  useDismissOnboardingSuggestion,
  useOnboardingAgentRun,
  useOnboardingSuggestions,
} from "@/lib/hooks/use-onboarding";
import type { OnboardingSuggestionsProps } from "@/types/components/onboarding-suggestions";
import { getOnboardingSuggestionEvidence } from "@/utils/onboarding-suggestions";

export function OnboardingSuggestions({
  organizationId,
  type,
  onCreate,
}: OnboardingSuggestionsProps) {
  const t = useTranslations("automation.suggestions");
  const tCommon = useTranslations("common");
  const { data: agentRun } = useOnboardingAgentRun(organizationId);
  const agentRunning = agentRun?.running ?? false;
  const { data: suggestions } = useOnboardingSuggestions(organizationId, {
    agentRunning,
  });
  const dismissMutation = useDismissOnboardingSuggestion();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedIdRef = useRef<string | null>(null);

  const dismissPendingId = dismissMutation.isPending
    ? (dismissMutation.variables?.suggestionId ?? null)
    : null;

  const dismissSuggestion = (suggestionId: string, onSuccess?: () => void) => {
    dismissMutation.mutate(
      { organizationId, suggestionId },
      {
        onError: () => toast.error(t("dismissFailed")),
        onSuccess: () => {
          trackEvent(POSTHOG_EVENTS.ONBOARDING_SUGGESTION_DISMISSED, {
            suggestion_id: suggestionId,
            suggestion_kind: type,
          });
          onSuccess?.();
        },
      }
    );
  };

  const createFromSuggestion = (suggestionId: string) => {
    trackEvent(POSTHOG_EVENTS.ONBOARDING_SUGGESTION_USED, {
      suggestion_id: suggestionId,
      suggestion_kind: type,
    });
    onCreate(suggestionId);
  };

  const matching = (suggestions ?? []).filter(
    (suggestion) => suggestion.type === type
  );

  if (matching.length === 0) {
    return null;
  }

  const selectedSuggestion = matching.find(
    (suggestion) => suggestion.id === selectedId
  );

  return (
    <TooltipProvider delay={400}>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <HugeiconsIcon
            className="text-muted-foreground size-4"
            icon={SparklesIcon}
          />
          <h2 className="text-sm font-medium">
            {tCommon("labels.suggestions")}
          </h2>
          {agentRunning && (
            <BrailleLoader
              ariaLabel={tCommon("states.loading")}
              className="text-xs"
            />
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {matching.map((suggestion) => {
            const evidence = getOnboardingSuggestionEvidence(suggestion.data);
            const openDetails = () => {
              selectedIdRef.current = suggestion.id;
              setSelectedId(suggestion.id);
              setDetailsOpen(true);
            };
            return (
              <TitleCard
                accentColor={EVE_ACCENT_COLOR}
                action={
                  <div className="flex items-center gap-1.5">
                    <Button
                      onClick={() => createFromSuggestion(suggestion.id)}
                      size="sm"
                    >
                      {tCommon("actions.create")}
                    </Button>
                    <BaseTooltip.Root>
                      <TooltipTrigger
                        render={
                          <Button
                            aria-label={t("dismissLabel", {
                              title: suggestion.title,
                            })}
                            disabled={dismissPendingId === suggestion.id}
                            onClick={() => dismissSuggestion(suggestion.id)}
                            size="icon-sm"
                            variant="ghost"
                          />
                        }
                      >
                        <HugeiconsIcon className="size-4" icon={Cancel01Icon} />
                      </TooltipTrigger>
                      <TooltipContent className="data-open:zoom-in-100 data-[side=top]:slide-in-from-bottom-0 data-[state=delayed-open]:zoom-in-100">
                        {t("dismissTooltip")}
                      </TooltipContent>
                    </BaseTooltip.Root>
                  </div>
                }
                className="h-full"
                contentClassName="relative"
                heading={
                  <BaseTooltip.Root>
                    <TooltipTrigger
                      render={<span className="block truncate" />}
                    >
                      {suggestion.title}
                    </TooltipTrigger>
                    <TooltipContent className="data-open:zoom-in-100 data-[side=top]:slide-in-from-bottom-0 data-[state=delayed-open]:zoom-in-100">
                      {suggestion.title}
                    </TooltipContent>
                  </BaseTooltip.Root>
                }
                icon={<HugeiconsIcon icon={SparklesIcon} />}
                key={suggestion.id}
              >
                <div className="space-y-1.5">
                  {suggestion.description ? (
                    <p className="text-muted-foreground line-clamp-3 text-sm">
                      {suggestion.description}
                    </p>
                  ) : null}
                  {evidence ? (
                    <p className="text-muted-foreground/70 line-clamp-2 text-xs">
                      {evidence}
                    </p>
                  ) : null}
                  <button
                    aria-label={t("viewDetails", { title: suggestion.title })}
                    className="peer focus-visible:ring-ring absolute inset-0 cursor-pointer rounded-t-lg focus-visible:ring-2"
                    onClick={openDetails}
                    type="button"
                  />
                  <span className="from-background via-background/90 text-foreground duration-normal pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 bg-gradient-to-t to-transparent pt-6 pb-2 text-sm font-medium opacity-0 transition-opacity peer-hover:opacity-100 peer-focus-visible:opacity-100">
                    {t("clickToExpand")}
                    <HugeiconsIcon className="size-4" icon={ArrowRight01Icon} />
                  </span>
                </div>
              </TitleCard>
            );
          })}
        </div>
      </div>

      {selectedSuggestion ? (
        <SuggestionDetailsSheet
          dismissing={dismissPendingId === selectedSuggestion.id}
          onCreate={() => {
            setDetailsOpen(false);
            createFromSuggestion(selectedSuggestion.id);
          }}
          onDismiss={() =>
            dismissSuggestion(selectedSuggestion.id, () => {
              if (selectedIdRef.current === selectedSuggestion.id) {
                setDetailsOpen(false);
              }
            })
          }
          onOpenChange={setDetailsOpen}
          open={detailsOpen}
          suggestion={{
            description: selectedSuggestion.description,
            evidence: getOnboardingSuggestionEvidence(selectedSuggestion.data),
            id: selectedSuggestion.id,
            title: selectedSuggestion.title,
            type: selectedSuggestion.type,
          }}
        />
      ) : null}
    </TooltipProvider>
  );
}
