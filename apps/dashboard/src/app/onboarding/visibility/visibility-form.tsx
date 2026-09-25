"use client";

import { promptKey } from "@notra/geo-core/geo/prompt-key";
import { buildBrandTerms } from "@notra/geo-core/geo/suggestion-keywords";
import { normalizeWebsiteUrl } from "@notra/geo-core/utils/geo-website";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { AuthFormHeader } from "@notra/ui/components/shared/auth/auth-form-header";
import { CtaButton } from "@notra/ui/components/shared/cta-button";
import { Input } from "@notra/ui/components/ui/input";
import { Label } from "@notra/ui/components/ui/label";
import { Loader2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/button";
import { BrandReviewSkeleton } from "@/components/onboarding/brand-review-skeleton";
import { OnboardingProgress } from "@/components/onboarding/progress";
import { PromptChoiceRow } from "@/components/onboarding/prompt-choice-row";
import { OnboardingStepViewTracker } from "@/components/onboarding/step-view-tracker";
import { GeoProjectProvider } from "@/components/providers/geo-project-provider";
import { ONBOARDING_STEPS } from "@/constants/analytics-events";
import {
  ONBOARDING_FIELD_CLASS,
  ONBOARDING_STEP_VISIBILITY,
} from "@/constants/onboarding";
import { trackEvent } from "@/lib/analytics/posthog-client";
import {
  useGeoDiscoverWebsite,
  useGeoOnboardingBrand,
} from "@/lib/hooks/use-geo";
import type {
  VisibilityFormProps,
  VisibilityReviewProps,
} from "@/types/onboarding";
import { stripWebsitePrefix } from "@/utils/onboarding";
import {
  selectedVisibilityPrompts,
  toVisibilityBrandInput,
  uniqueVisibilityPrompts,
} from "@/utils/onboarding-brand";

function VisibilityReview({
  organizationId,
  websiteUrl,
  discovery,
  fallbackCompanyName,
  nextHref,
  skipHref,
}: VisibilityReviewProps) {
  const id = useId();
  const router = useRouter();
  const [companyName, setCompanyName] = useState(
    () => discovery?.companyName ?? fallbackCompanyName
  );
  const [droppedKeys, setDroppedKeys] = useState(() => new Set<string>());
  const save = useGeoOnboardingBrand(organizationId);
  const [isLeaving, setIsLeaving] = useState(false);
  const busy = save.isPending || isLeaving;
  const prompts = uniqueVisibilityPrompts(
    discovery?.prompts ?? [],
    buildBrandTerms({
      companyName,
      aliases: [...(discovery?.aliases ?? [])],
    })
  );
  const selectedPrompts = selectedVisibilityPrompts(prompts, droppedKeys);
  const canSubmit = companyName.trim().length > 0 && !busy;
  const websiteHost = stripWebsitePrefix(websiteUrl);

  const togglePrompt = (key: string) => {
    setDroppedKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleSubmit = () => {
    if (!canSubmit) {
      return;
    }
    const brandInput = toVisibilityBrandInput({
      companyName,
      aliases: discovery?.aliases ?? [],
      audienceType: discovery?.audienceType,
      prompts: selectedPrompts,
    });
    save.mutate(brandInput, {
      onSuccess: () => {
        trackEvent(POSTHOG_EVENTS.ONBOARDING_BRAND_SAVED, {
          alias_count: brandInput.aliases.length,
          audience_type: brandInput.audienceType ?? null,
          prompt_count: brandInput.prompts.length,
        });
        setIsLeaving(true);
        router.push(nextHref);
      },
    });
  };

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        handleSubmit();
      }}
    >
      <div className="grid gap-2">
        <Label htmlFor={`${id}-company`}>Brand name</Label>
        <Input
          aria-invalid={companyName.trim().length === 0}
          className={ONBOARDING_FIELD_CLASS}
          disabled={busy}
          id={`${id}-company`}
          onChange={(event) => setCompanyName(event.target.value)}
          placeholder="Acme"
          value={companyName}
        />
      </div>

      {prompts.length > 0 ? (
        <div className="grid gap-2">
          <p className="text-sm font-medium">
            {websiteHost ? `Questions from ${websiteHost}` : "Questions"}{" "}
            <span className="text-muted-foreground text-xs font-normal">
              ({selectedPrompts.length} of {prompts.length})
            </span>
          </p>
          <ul className="w-full max-w-full min-w-0 space-y-1.5 overflow-hidden">
            {prompts.map((entry) => {
              const key = promptKey(entry.prompt);
              return (
                <PromptChoiceRow
                  disabled={busy}
                  key={key}
                  onToggle={() => togglePrompt(key)}
                  prompt={entry.prompt}
                  selected={!droppedKeys.has(key)}
                />
              );
            })}
          </ul>
        </div>
      ) : null}

      <CtaButton className="w-full" disabled={!canSubmit} type="submit">
        {busy ? (
          <>
            <Loader2Icon className="size-4 animate-spin" />
            Saving
          </>
        ) : (
          "Continue"
        )}
      </CtaButton>

      <div className="text-center">
        <Button
          className="text-muted-foreground"
          disabled={busy}
          nativeButton={false}
          onClick={() =>
            trackEvent(POSTHOG_EVENTS.ONBOARDING_STEP_SKIPPED, {
              step: ONBOARDING_STEPS.VISIBILITY,
            })
          }
          render={<Link href={skipHref} />}
          size="sm"
          variant="link"
        >
          Skip this step
        </Button>
      </div>
    </form>
  );
}

export function VisibilityForm({
  organizationId,
  projectId,
  websiteUrl,
  companyName,
  nextHref,
  skipHref,
  inOnboardingFlow,
  progressHrefs,
}: VisibilityFormProps) {
  const id = useId();
  const [websiteInput, setWebsiteInput] = useState(() =>
    stripWebsitePrefix(websiteUrl)
  );
  const [analyzedUrl, setAnalyzedUrl] = useState(
    () => normalizeWebsiteUrl(websiteUrl) ?? null
  );
  const discover = useGeoDiscoverWebsite(organizationId, analyzedUrl);
  const isAnalyzing = analyzedUrl !== null && discover.isPending;
  const analyzedHost = analyzedUrl ? stripWebsitePrefix(analyzedUrl) : "";
  const discoveryStartedAtRef = useRef<number | null>(null);
  const discoveryTrackedUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (
      analyzedUrl &&
      discover.isPending &&
      discoveryStartedAtRef.current === null
    ) {
      discoveryStartedAtRef.current = Date.now();
    }
    if (
      !analyzedUrl ||
      discover.isPending ||
      discoveryTrackedUrlRef.current === analyzedUrl
    ) {
      return;
    }
    discoveryTrackedUrlRef.current = analyzedUrl;
    const durationMs =
      discoveryStartedAtRef.current === null
        ? undefined
        : Date.now() - discoveryStartedAtRef.current;
    if (discover.isError) {
      trackEvent(POSTHOG_EVENTS.WEBSITE_DISCOVERY_FAILED, {
        duration_ms: durationMs,
      });
      return;
    }
    trackEvent(POSTHOG_EVENTS.WEBSITE_DISCOVERED, {
      prompt_count_suggested: discover.data?.discovery?.prompts.length ?? 0,
      alias_count_suggested: discover.data?.discovery?.aliases.length ?? 0,
      duration_ms: durationMs,
    });
  }, [analyzedUrl, discover.isPending, discover.isError, discover.data]);

  const commitWebsite = () => {
    const normalized = normalizeWebsiteUrl(websiteInput);
    if (normalized && normalized !== analyzedUrl) {
      discoveryStartedAtRef.current = Date.now();
      setAnalyzedUrl(normalized);
    }
  };

  return (
    <GeoProjectProvider projectId={projectId}>
      <div className="flex w-full flex-col gap-5">
        <OnboardingStepViewTracker
          inOnboardingFlow={inOnboardingFlow}
          step={ONBOARDING_STEPS.VISIBILITY}
        />
        <div className="flex justify-center">
          <OnboardingProgress
            current={ONBOARDING_STEP_VISIBILITY}
            hrefs={progressHrefs}
          />
        </div>

        <AuthFormHeader
          description="We ask ChatGPT, Claude, Gemini and Perplexity what your buyers ask them, then check if you come up."
          title="See what AI says about you"
        />

        <div className="mt-2 space-y-5">
          <div className="grid gap-2">
            <Label htmlFor={`${id}-website`}>Website</Label>
            <div className="border-input focus-within:border-ring focus-within:ring-ring/50 flex h-11 w-full flex-row items-center overflow-hidden rounded-xl border transition-colors focus-within:ring-[3px]">
              <label
                className="border-input bg-muted/30 text-muted-foreground flex h-full items-center border-r px-3.5 text-sm"
                htmlFor={`${id}-website`}
              >
                https://
              </label>
              <input
                className="h-full flex-1 bg-transparent px-3.5 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isAnalyzing}
                id={`${id}-website`}
                onBlur={commitWebsite}
                onChange={(event) => setWebsiteInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    commitWebsite();
                  }
                }}
                placeholder="acme.com"
                type="text"
                value={websiteInput}
              />
              {isAnalyzing ? (
                <span className="text-muted-foreground flex h-full items-center px-3.5">
                  <Loader2Icon className="size-4 animate-spin" />
                </span>
              ) : null}
            </div>
            {isAnalyzing ? (
              <p className="text-muted-foreground text-xs">
                Reading {analyzedHost}. Takes about 20 seconds.
              </p>
            ) : null}
            {discover.isError ? (
              <p className="text-destructive text-sm">
                Could not read {analyzedHost}. Check the address, or just type
                your brand name below.
              </p>
            ) : null}
          </div>

          {isAnalyzing ? (
            <BrandReviewSkeleton />
          ) : (
            <VisibilityReview
              discovery={discover.data?.discovery ?? null}
              fallbackCompanyName={companyName ?? ""}
              key={`${analyzedUrl ?? ""}:${discover.status}`}
              nextHref={nextHref}
              organizationId={organizationId}
              skipHref={skipHref}
              websiteUrl={analyzedUrl ?? websiteUrl}
            />
          )}
        </div>
      </div>
    </GeoProjectProvider>
  );
}
