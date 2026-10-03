"use client";

import { Tick01Icon, UserGroupIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@notra/ui/components/ui/button";
import { Label } from "@notra/ui/components/ui/label";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { cn } from "@notra/ui/lib/utils";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
// biome-ignore lint/performance/noNamespaceImport: Zod recommended way of importing
import * as z from "zod";

import {
  useAnalyzeBrand,
  useBrandAnalysisProgress,
  useCreateBrandVoice,
} from "@/lib/hooks/use-brand-analysis";
import type { BrandIdentitiesStepProps } from "@/types/content/create";

const HTTP_PREFIX_RE = /^https?:\/\//i;
const WWW_PREFIX_RE = /^www\./;

function sanitizeUrlInput(input: string): string {
  return input.replace(HTTP_PREFIX_RE, "").trim();
}

interface InlineCreateFormProps {
  organizationId: string;
}

function deriveNameFromUrl(websiteUrl: string): string {
  try {
    const host = new URL(websiteUrl).hostname.replace(WWW_PREFIX_RE, "");
    return host || "Default";
  } catch {
    return "Default";
  }
}

function InlineCreateForm({ organizationId }: InlineCreateFormProps) {
  const t = useTranslations("content.create.stepIdentities");
  const tCommon = useTranslations("common");
  const [url, setUrl] = useState("");
  const { startPolling } = useBrandAnalysisProgress(organizationId);
  const createMutation = useCreateBrandVoice(organizationId);
  const analyzeMutation = useAnalyzeBrand(organizationId, startPolling);

  const isSubmitting = createMutation.isPending || analyzeMutation.isPending;

  const handleSubmit = async () => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      toast.error(tCommon("messages.enterAWebsiteUrl"));
      return;
    }

    const websiteUrl = `https://${trimmedUrl}`;

    const parseRes = z.url().safeParse(websiteUrl);
    if (!parseRes.success) {
      toast.error(tCommon("messages.enterAValidWebsite"));
      return;
    }

    try {
      const result = await createMutation.mutateAsync({
        name: deriveNameFromUrl(websiteUrl),
        websiteUrl,
      });
      setUrl("");
      analyzeMutation
        .mutateAsync({ url: websiteUrl, voiceId: result.voice.id })
        .then(() => {
          toast.success(
            tCommon("messages.brandIdentityCreatedAnalysisStarted")
          );
        })
        .catch(() => {
          toast.error(tCommon("messages.brandIdentityCreatedButFailed"));
        });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : tCommon("messages.failedToCreateBrandIdentity")
      );
    }
  };

  return (
    <div className="flex min-h-[20rem] items-center justify-center">
      <form
        className="w-full max-w-md space-y-5 text-center"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <div className="space-y-1">
          <p className="text-base font-semibold">{t("emptyTitle")}</p>
          <p className="text-muted-foreground text-xs">
            {t("emptyDescription")}
          </p>
        </div>
        <div className="space-y-2 text-left">
          <Label className="sr-only" htmlFor="identity-url">
            {tCommon("labels.website")}
          </Label>
          <div className="border-border focus-within:border-ring focus-within:ring-ring/50 flex w-full flex-row items-center rounded-lg border transition-colors focus-within:ring-2">
            <label
              className="border-border text-muted-foreground border-r px-2.5 py-2 text-sm"
              htmlFor="identity-url"
            >
              https://
            </label>
            <input
              autoFocus
              className="min-w-0 flex-1 bg-transparent px-2.5 py-2 text-sm outline-none"
              id="identity-url"
              onChange={(e) => setUrl(sanitizeUrlInput(e.target.value))}
              placeholder="example.com"
              type="text"
              value={url}
            />
          </div>
        </div>
        <Button
          className="w-full justify-center"
          disabled={!url.trim()}
          loading={isSubmitting}
          type="submit"
        >
          {t("createButton")}
        </Button>
      </form>
    </div>
  );
}

export function StepBrandIdentities({
  voices,
  selected,
  onToggle,
  isLoading,
  organizationId,
}: BrandIdentitiesStepProps) {
  const t = useTranslations("content.create.stepIdentities");
  const tCommon = useTranslations("common");
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">{t("title")}</h2>
        <p className="text-muted-foreground text-sm">{t("description")}</p>
      </div>

      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      )}

      {!isLoading && voices.length === 0 && (
        <InlineCreateForm organizationId={organizationId} />
      )}

      {!isLoading && voices.length > 0 && (
        <div className="space-y-2">
          {voices.map((voice) => {
            const isSelected = selected.includes(voice.id);
            return (
              <button
                aria-pressed={isSelected}
                className={cn(
                  "bg-card flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left transition-colors",
                  "hover:border-foreground/20",
                  isSelected
                    ? "border-foreground/40 ring-foreground/10 ring-2"
                    : "border-border"
                )}
                key={voice.id}
                onClick={() => onToggle(voice.id)}
                type="button"
              >
                <div
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                    isSelected
                      ? "border-foreground bg-foreground text-background"
                      : "border-muted-foreground/30"
                  )}
                >
                  {isSelected && (
                    <HugeiconsIcon className="size-3" icon={Tick01Icon} />
                  )}
                </div>
                <div className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-md">
                  <HugeiconsIcon
                    className="text-muted-foreground size-4"
                    icon={UserGroupIcon}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{voice.name}</p>
                  <p className="text-muted-foreground truncate text-xs">
                    {voice.isDefault
                      ? t("defaultIdentity")
                      : tCommon("labels.brandIdentity")}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
