"use client";

import {
  Loading03Icon,
  Tick01Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@notra/ui/components/ui/button";
import { Label } from "@notra/ui/components/ui/label";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { cn } from "@notra/ui/lib/utils";
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
  const [url, setUrl] = useState("");
  const { startPolling } = useBrandAnalysisProgress(organizationId);
  const createMutation = useCreateBrandVoice(organizationId);
  const analyzeMutation = useAnalyzeBrand(organizationId, startPolling);

  const isSubmitting = createMutation.isPending || analyzeMutation.isPending;

  const handleSubmit = async () => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      toast.error("Please enter a website URL");
      return;
    }

    const websiteUrl = `https://${trimmedUrl}`;

    const parseRes = z.url().safeParse(websiteUrl);
    if (!parseRes.success) {
      toast.error("Please enter a valid website URL");
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
          toast.success("Brand identity created, analysis started");
        })
        .catch(() => {
          toast.error(
            "Brand identity created, but failed to start analysis. You can re-analyze from the identity settings."
          );
        });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to create brand identity"
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
          <p className="text-base font-semibold">No brand identity yet</p>
          <p className="text-muted-foreground text-xs">
            Drop in your website and we'll learn your tone and audience.
          </p>
        </div>
        <div className="space-y-2 text-left">
          <Label className="sr-only" htmlFor="identity-url">
            Website
          </Label>
          <div className="border-border focus-within:border-ring focus-within:ring-ring/50 flex w-full flex-row items-center rounded-md border transition-colors focus-within:ring-2">
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
          disabled={!url.trim() || isSubmitting}
          type="submit"
        >
          {isSubmitting ? (
            <>
              <HugeiconsIcon
                className="size-3.5 animate-spin"
                icon={Loading03Icon}
              />
              Creating...
            </>
          ) : (
            "Create brand identity"
          )}
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
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">
          Which brand identity should this use?
        </h2>
        <p className="text-muted-foreground text-sm">
          Select one or more brand identities, or skip to write for a general
          audience.
        </p>
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
                      ? "Default brand identity"
                      : "Brand identity"}
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
