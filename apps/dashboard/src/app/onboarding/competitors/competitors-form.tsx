"use client";

import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { GEO_MAX_COMPETITORS } from "@notra/geo-core/constants/geo";
import type { GeoCompetitor } from "@notra/geo-core/types/geo";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { AuthFormHeader } from "@notra/ui/components/shared/auth/auth-form-header";
import { CtaButton } from "@notra/ui/components/shared/cta-button";
import { Label } from "@notra/ui/components/ui/label";
import { ORPCError } from "@orpc/client";
import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import { CompetitorBrandLogo } from "@/components/onboarding/competitor-brand-logo";
import { CompetitorChoiceRow } from "@/components/onboarding/competitor-choice-row";
import { CompetitorSearch } from "@/components/onboarding/competitor-search";
import { CompetitorSuggestionsSkeleton } from "@/components/onboarding/competitor-suggestions-skeleton";
import { OnboardingProgress } from "@/components/onboarding/progress";
import { OnboardingStepViewTracker } from "@/components/onboarding/step-view-tracker";
import { GeoProjectProvider } from "@/components/providers/geo-project-provider";
import {
  ONBOARDING_STEPS,
  SUGGESTION_OUTCOMES,
} from "@/constants/analytics-events";
import {
  ONBOARDING_STEP_COMPETITORS,
  ONBOARDING_VISIBLE_SUGGESTIONS,
} from "@/constants/onboarding";
import { trackEvent } from "@/lib/analytics/posthog-client";
import {
  useGeoCompetitorSuggestions,
  useGeoStartScan,
} from "@/lib/hooks/use-geo";
import { useGeoCompetitorsDb } from "@/lib/hooks/use-geo-db";
import { useHasGeoFeature } from "@/lib/hooks/use-plan";
import { useRouter } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import type { SuggestionOutcome } from "@/types/analytics/events";
import type {
  CompetitorsFormProps,
  CompetitorsPickerProps,
} from "@/types/onboarding";
import {
  createCompetitor,
  findCompetitor,
} from "@/utils/onboarding-competitors";

/**
 * A scan billing refuses up front is no reason to block onboarding; the
 * mutation's toast already explains it.
 */
function leaveOnPaymentRequired(leave: () => void) {
  return (error: unknown) => {
    if (error instanceof ORPCError && error.code === "PAYMENT_REQUIRED") {
      leave();
    }
  };
}

function CompetitorsPicker({
  organizationId,
  domain,
  nextHref,
}: CompetitorsPickerProps) {
  const t = useTranslations("onboarding.competitors");
  const tCommon = useTranslations("common");
  const id = useId();
  const router = useRouter();
  const suggestions = useGeoCompetitorSuggestions(organizationId, domain);
  const { competitors, saveCompetitor, removeCompetitor } =
    useGeoCompetitorsDb(organizationId);
  const startScan = useGeoStartScan(organizationId);
  const { isLocked: geoLocked } = useHasGeoFeature();
  const submitLabel = geoLocked
    ? tCommon("actions.continue")
    : t("startTracking");
  const [isLeaving, setIsLeaving] = useState(false);
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);
  const busy = startScan.isPending || isLeaving;
  const atLimit = competitors.length >= GEO_MAX_COMPETITORS;
  const suggested = suggestions.data?.competitors ?? [];
  const visibleSuggestions = showAllSuggestions
    ? suggested
    : suggested.slice(0, ONBOARDING_VISIBLE_SUGGESTIONS);
  const hiddenSuggestionCount = suggested.length - visibleSuggestions.length;
  const remainingSuggestions = suggested.filter(
    (entry) => !findCompetitor(competitors, entry.domain, entry.name)
  );
  const suggestionsTrackedRef = useRef(false);

  useEffect(() => {
    if (!domain || suggestions.isPending || suggestionsTrackedRef.current) {
      return;
    }
    suggestionsTrackedRef.current = true;
    let outcome: SuggestionOutcome = SUGGESTION_OUTCOMES.OK;
    if (suggestions.isError) {
      outcome = SUGGESTION_OUTCOMES.ERROR;
    } else if (suggested.length === 0) {
      outcome = SUGGESTION_OUTCOMES.EMPTY;
    }
    trackEvent(POSTHOG_EVENTS.COMPETITOR_SUGGESTIONS_LOADED, {
      suggestion_count: suggested.length,
      outcome,
    });
  }, [domain, suggestions.isPending, suggestions.isError, suggested.length]);

  const add = (name: string, competitorDomain: string | null) => {
    if (atLimit || findCompetitor(competitors, competitorDomain, name)) {
      return;
    }
    saveCompetitor(createCompetitor(name, competitorDomain));
  };

  const remove = (competitor: GeoCompetitor) => {
    removeCompetitor(competitor.id);
  };

  const addAllSuggestions = () => {
    const availableSlots = GEO_MAX_COMPETITORS - competitors.length;
    for (const entry of remainingSuggestions.slice(0, availableSlots)) {
      add(entry.name, entry.domain);
    }
  };

  const launch = () => {
    trackEvent(POSTHOG_EVENTS.ONBOARDING_COMPETITORS_SUBMITTED, {
      competitor_count: competitors.length,
      added_all: suggested.length > 0 && remainingSuggestions.length === 0,
      started_scan: !geoLocked,
    });
    const leave = () => {
      setIsLeaving(true);
      router.push(nextHref);
    };
    if (geoLocked) {
      leave();
      return;
    }
    startScan.mutate("onboarding", {
      onSuccess: leave,
      onError: leaveOnPaymentRequired(leave),
    });
  };

  return (
    <form
      className="mt-2 space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        launch();
      }}
    >
      <div className="grid gap-2">
        <Label htmlFor={`${id}-search`}>{t("addBrand")}</Label>
        <CompetitorSearch
          disabled={busy || atLimit}
          onAdd={(result) => add(result.name, result.domain)}
          organizationId={organizationId}
          ownDomain={domain}
          selected={competitors}
        />
      </div>

      {competitors.length > 0 ? (
        <div className="grid gap-2">
          <p className="text-sm font-medium">
            {t.rich("yourCompetitors", {
              count: competitors.length,
              max: GEO_MAX_COMPETITORS,
              muted: (chunks) => (
                <span className="text-muted-foreground text-xs font-normal">
                  {chunks}
                </span>
              ),
            })}
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {competitors.map((entry) => (
              <li
                className="border-input flex items-center gap-1.5 rounded-full border py-1 pr-1 pl-1.5 text-sm"
                key={entry.id}
              >
                <CompetitorBrandLogo
                  className="size-5 rounded-full"
                  domain={entry.domain}
                  logo={null}
                  name={entry.name}
                />
                <span className="max-w-40 truncate">{entry.name}</span>
                <button
                  aria-label={tCommon("labels.removeName", {
                    name: entry.name,
                  })}
                  className="text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer rounded-full p-0.5 disabled:cursor-not-allowed"
                  disabled={busy}
                  onClick={() => remove(entry)}
                  type="button"
                >
                  <HugeiconsIcon icon={Cancel01Icon} size={12} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {domain ? (
        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-3">
            <p className="truncate text-sm font-medium">
              {t("suggestedFor", { domain })}
            </p>
            {remainingSuggestions.length > 1 ? (
              <Button
                className="text-muted-foreground h-auto px-0"
                disabled={busy || atLimit}
                onClick={addAllSuggestions}
                size="sm"
                type="button"
                variant="ghost"
              >
                {t("addAll")}
              </Button>
            ) : null}
          </div>
          {suggestions.data?.field ? (
            <p className="text-muted-foreground -mt-1 text-xs">
              {t("otherCompaniesIn", { field: suggestions.data.field })}
            </p>
          ) : null}
          {suggestions.isPending ? <CompetitorSuggestionsSkeleton /> : null}
          {suggestions.isError ? (
            <div className="flex items-center justify-between gap-3">
              <p className="text-muted-foreground min-w-0 text-xs wrap-anywhere">
                {t("suggestionsFailed", { domain })}
              </p>
              <Button
                className="h-auto shrink-0 px-0"
                disabled={busy || suggestions.isFetching}
                onClick={() => {
                  suggestions.refetch();
                }}
                size="sm"
                type="button"
                variant="ghost"
              >
                {suggestions.isFetching
                  ? t("tryingAgain")
                  : tCommon("actions.tryAgain")}
              </Button>
            </div>
          ) : null}
          {suggestions.isSuccess && suggested.length === 0 ? (
            <p className="text-muted-foreground text-xs wrap-anywhere">
              {t("noSuggestions", { domain })}
            </p>
          ) : null}
          {suggested.length > 0 ? (
            <ul className="w-full max-w-full min-w-0 space-y-1.5 overflow-hidden">
              {visibleSuggestions.map((entry) => {
                const existing = findCompetitor(
                  competitors,
                  entry.domain,
                  entry.name
                );
                return (
                  <CompetitorChoiceRow
                    description={entry.description}
                    disabled={busy || (atLimit && !existing)}
                    domain={entry.domain}
                    key={entry.domain ?? entry.name}
                    name={entry.name}
                    onToggle={() =>
                      existing
                        ? remove(existing)
                        : add(entry.name, entry.domain)
                    }
                    selected={existing !== undefined}
                  />
                );
              })}
            </ul>
          ) : null}
          {hiddenSuggestionCount > 0 ? (
            <Button
              className="w-full"
              disabled={busy}
              onClick={() => setShowAllSuggestions(true)}
              size="sm"
              type="button"
              variant="ghost"
            >
              {t("showMore", { count: hiddenSuggestionCount })}
            </Button>
          ) : null}
        </div>
      ) : null}

      <CtaButton className="w-full" loading={busy} type="submit">
        {submitLabel}
      </CtaButton>
    </form>
  );
}

export function CompetitorsForm({
  organizationId,
  projectId,
  domain,
  companyName,
  nextHref,
  inOnboardingFlow,
  progressHrefs,
}: CompetitorsFormProps) {
  const t = useTranslations("onboarding.competitors");
  return (
    <GeoProjectProvider projectId={projectId}>
      <div className="flex w-full flex-col gap-5">
        <OnboardingStepViewTracker
          inOnboardingFlow={inOnboardingFlow}
          step={ONBOARDING_STEPS.COMPETITORS}
        />
        <div className="flex justify-center">
          <OnboardingProgress
            current={ONBOARDING_STEP_COMPETITORS}
            hrefs={progressHrefs}
          />
        </div>

        <AuthFormHeader
          description={
            companyName
              ? t("description", { companyName })
              : t("descriptionFallback")
          }
          title={t("title")}
        />

        <CompetitorsPicker
          domain={domain}
          nextHref={nextHref}
          organizationId={organizationId}
        />
      </div>
    </GeoProjectProvider>
  );
}
