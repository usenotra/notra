"use client";

import { Refresh01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useForm } from "@tanstack/react-form";
import { useAsyncDebouncedCallback } from "@tanstack/react-pacer";
import { Check, LoaderCircle, Minus } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
// biome-ignore lint/performance/noNamespaceImport: Zod recommended way to import
import * as z from "zod";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { TitleCard } from "@/components/title-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Stepper,
  StepperIndicator,
  StepperItem,
  StepperList,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
} from "@/components/ui/stepper";
import { Textarea } from "@/components/ui/textarea";
import {
  useAnalyzeBrand,
  useBrandAnalysisProgress,
  useBrandSettings,
  useUpdateBrandSettings,
} from "@/hooks/use-brand-analysis";
import type { ToneProfile } from "@/utils/schemas/brand";

const AUTO_SAVE_DELAY = 1500;

interface PageClientProps {
  organizationSlug: string;
}

const ANALYSIS_STEPS = [
  { value: "scraping", label: "Scraping" },
  { value: "extracting", label: "Extracting" },
  { value: "saving", label: "Saving" },
];

const TONE_OPTIONS: { value: ToneProfile; label: string }[] = [
  { value: "Conversational", label: "Conversational" },
  { value: "Professional", label: "Professional" },
  { value: "Casual", label: "Casual" },
  { value: "Formal", label: "Formal" },
];

function getStepperValue(status: string, currentStep: number): string {
  if (status === "idle" || status === "failed") {
    return "";
  }
  if (status === "completed") {
    return "saving";
  }
  const stepIndex = Math.max(0, currentStep - 1);
  return ANALYSIS_STEPS[stepIndex]?.value ?? ANALYSIS_STEPS[0]?.value ?? "";
}

function getModalTitle(
  isLoadingSettings: boolean,
  isAnalyzing: boolean,
  status: string
): string {
  if (isLoadingSettings) {
    return "Loading...";
  }
  if (isAnalyzing) {
    return "Analyzing Website";
  }
  if (status === "failed") {
    return "Analysis Failed";
  }
  return "Add Your Brand";
}

function getModalDescription(
  isLoadingSettings: boolean,
  isAnalyzing: boolean,
  status: string,
  error?: string
): string {
  if (isLoadingSettings) {
    return "Checking your brand settings";
  }
  if (isAnalyzing) {
    return "Please wait while we extract your brand information";
  }
  if (status === "failed") {
    return error ?? "Something went wrong";
  }
  return "Enter your website URL to automatically extract your brand identity";
}

interface ModalContentProps {
  isLoadingSettings: boolean;
  isAnalyzing: boolean;
  progress: { status: string; currentStep: number };
  url: string;
  setUrl: (url: string) => void;
  handleAnalyze: () => void;
  isPending: boolean;
}

type StepIconState = "pending" | "active" | "completed";

const STEP_ICONS: Record<StepIconState, () => React.ReactNode> = {
  completed: () => <Check className="size-4" strokeWidth={3} />,
  active: () => <LoaderCircle className="size-4 animate-spin" />,
  pending: () => (
    <Minus className="size-4 text-muted-foreground" strokeWidth={2} />
  ),
};

function getStepIconState(
  currentStep: number,
  stepNumber: number
): StepIconState {
  if (currentStep < stepNumber) {
    return "pending";
  }
  if (currentStep > stepNumber) {
    return "completed";
  }
  return "active";
}

function ModalContent({
  isLoadingSettings,
  isAnalyzing,
  progress,
  url,
  setUrl,
  handleAnalyze,
  isPending,
}: ModalContentProps) {
  if (isLoadingSettings) {
    return (
      <div className="flex justify-center py-4">
        <LoaderCircle className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isAnalyzing) {
    return (
      <Stepper
        nonInteractive
        value={getStepperValue(progress.status, progress.currentStep)}
      >
        <StepperList>
          {ANALYSIS_STEPS.map((step, index) => {
            const stepNumber = index + 1;
            const iconState = getStepIconState(
              progress.currentStep,
              stepNumber
            );
            return (
              <StepperItem
                completed={progress.currentStep > stepNumber}
                key={step.value}
                value={step.value}
              >
                <StepperTrigger className="gap-2 px-2">
                  <StepperIndicator className="size-8">
                    {STEP_ICONS[iconState]()}
                  </StepperIndicator>
                  <StepperTitle className="text-sm">{step.label}</StepperTitle>
                </StepperTrigger>
                <StepperSeparator className="h-0.5" />
              </StepperItem>
            );
          })}
        </StepperList>
      </Stepper>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div
          className={`flex w-full flex-row items-center overflow-hidden rounded-lg border bg-background transition-all focus-within:ring-2 focus-within:ring-ring/20 ${progress.status === "failed" ? "border-destructive" : "border-input"}`}
        >
          <span className="flex h-10 items-center border-input border-r bg-muted/50 px-3 text-muted-foreground text-sm">
            https://
          </span>
          <input
            aria-label="Website URL"
            className="h-10 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground"
            disabled={isPending}
            id="brand-url-input"
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !isPending) {
                handleAnalyze();
              }
            }}
            placeholder="example.com"
            type="url"
            value={url}
          />
        </div>
        <Button
          className="h-10 px-6"
          disabled={isPending}
          onClick={handleAnalyze}
        >
          {isPending ? (
            <>
              <LoaderCircle className="size-4 animate-spin" />
              <span>Analyzing</span>
            </>
          ) : (
            "Analyze"
          )}
        </Button>
      </div>
      {progress.status === "failed" && (
        <p className="text-center text-destructive text-sm">
          Try again with a different URL
        </p>
      )}
    </div>
  );
}

interface BrandFormProps {
  organizationId: string;
  initialData: {
    companyName: string;
    companyDescription: string;
    toneProfile: ToneProfile;
    customTone: string;
    customInstructions: string;
    useCustomTone: boolean;
    audience: string;
  };
  websiteUrl: string | null | undefined;
  onReanalyze: () => void;
  isReanalyzing: boolean;
}

function BrandForm({
  organizationId,
  initialData,
  websiteUrl,
  onReanalyze,
  isReanalyzing,
}: BrandFormProps) {
  const updateMutation = useUpdateBrandSettings(organizationId);
  const lastSavedData = useRef<string>(JSON.stringify(initialData));

  const debouncedSave = useAsyncDebouncedCallback(
    async (values: typeof initialData) => {
      const { useCustomTone: _, ...valuesToSave } = values;
      await updateMutation.mutateAsync(valuesToSave);
      lastSavedData.current = JSON.stringify(values);
      toast.success("Changes saved");
    },
    { wait: AUTO_SAVE_DELAY }
  );

  const form = useForm({
    defaultValues: initialData,
    onSubmit: async () => {
      // No-op: we use auto-save via onChange listener
    },
    listeners: {
      onChange: ({ formApi }) => {
        const currentValues = formApi.state.values;
        const currentData = JSON.stringify(currentValues);

        if (currentData === lastSavedData.current) {
          return;
        }

        if (currentValues.useCustomTone && !currentValues.customTone.trim()) {
          return;
        }

        debouncedSave(currentValues).catch((error) => {
          toast.error(
            error instanceof Error ? error.message : "Failed to save changes"
          );
        });
      },
    },
  });

  return (
    <div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-6 px-4 lg:px-6">
        <div className="space-y-1">
          <h1 className="font-bold text-3xl tracking-tight">Brand Identity</h1>
          <p className="text-muted-foreground">
            Configure your brand identity and tone of voice
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <TitleCard
            action={
              <Button
                disabled={isReanalyzing || !websiteUrl}
                onClick={onReanalyze}
                size="sm"
                variant="outline"
              >
                <HugeiconsIcon
                  className={isReanalyzing ? "animate-spin" : ""}
                  icon={Refresh01Icon}
                  size={16}
                />
                Re-analyze
              </Button>
            }
            heading="Company Profile"
          >
            <div className="space-y-6">
              <form.Field name="companyName">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Company name</Label>
                    <Input
                      id={field.name}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="Your company name"
                      value={field.state.value}
                    />
                  </div>
                )}
              </form.Field>

              <div className="space-y-2">
                <Label>Website</Label>
                <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm">
                  {websiteUrl ? (
                    websiteUrl
                  ) : (
                    <span className="text-muted-foreground">
                      No website configured
                    </span>
                  )}
                </div>
              </div>

              <form.Field name="companyDescription">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Description</Label>
                    <Textarea
                      className="min-h-[120px]"
                      id={field.name}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="A short overview of your company"
                      value={field.state.value}
                    />
                  </div>
                )}
              </form.Field>
            </div>
          </TitleCard>

          <TitleCard heading="Tone & Language">
            <form.Field name="useCustomTone">
              {(useCustomToneField) => (
                <div className="space-y-4">
                  <form.Field name="toneProfile">
                    {(toneProfileField) => (
                      <div className="space-y-3">
                        <button
                          className="flex cursor-pointer items-center gap-2"
                          onClick={() => {
                            useCustomToneField.handleChange(false);
                            form.setFieldValue("customTone", "");
                          }}
                          type="button"
                        >
                          <div
                            className={`flex size-5 items-center justify-center rounded-full ${
                              useCustomToneField.state.value
                                ? "border-2 border-muted-foreground/30"
                                : "bg-primary text-primary-foreground"
                            }`}
                          >
                            {!useCustomToneField.state.value && (
                              <svg
                                aria-hidden="true"
                                className="size-3"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={3}
                                viewBox="0 0 24 24"
                              >
                                <path
                                  d="M5 13l4 4L19 7"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            )}
                          </div>
                          <span
                            className={
                              useCustomToneField.state.value
                                ? "text-muted-foreground text-sm"
                                : "text-sm"
                            }
                          >
                            Tone Profile
                          </span>
                        </button>
                        <Select
                          disabled={useCustomToneField.state.value}
                          onValueChange={(value) => {
                            if (value) {
                              toneProfileField.handleChange(
                                value as ToneProfile
                              );
                            }
                          }}
                          value={toneProfileField.state.value}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TONE_OPTIONS.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </form.Field>

                  <div className="pt-4">
                    <form.Field name="customTone">
                      {(customToneField) => (
                        <div className="space-y-3">
                          <button
                            className="flex cursor-pointer items-center gap-2"
                            onClick={() =>
                              useCustomToneField.handleChange(true)
                            }
                            type="button"
                          >
                            <div
                              className={`flex size-5 items-center justify-center rounded-full ${
                                useCustomToneField.state.value
                                  ? "bg-primary text-primary-foreground"
                                  : "border-2 border-muted-foreground/30"
                              }`}
                            >
                              {useCustomToneField.state.value && (
                                <svg
                                  aria-hidden="true"
                                  className="size-3"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth={3}
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    d="M5 13l4 4L19 7"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              )}
                            </div>
                            <span
                              className={
                                useCustomToneField.state.value
                                  ? "text-sm"
                                  : "text-muted-foreground text-sm"
                              }
                            >
                              Custom Tone
                            </span>
                          </button>
                          <Input
                            disabled={!useCustomToneField.state.value}
                            id={customToneField.name}
                            onBlur={customToneField.handleBlur}
                            onChange={(e) =>
                              customToneField.handleChange(e.target.value)
                            }
                            placeholder="Add custom tone notes"
                            value={customToneField.state.value}
                          />
                        </div>
                      )}
                    </form.Field>
                  </div>
                </div>
              )}
            </form.Field>

            <div className="pt-4">
              <form.Field name="customInstructions">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Custom Instructions</Label>
                    <Textarea
                      className="min-h-[100px]"
                      id={field.name}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="Add any specific instructions for AI-generated content (e.g., avoid certain phrases, always mention specific features, etc.)"
                      value={field.state.value}
                    />
                  </div>
                )}
              </form.Field>
            </div>
          </TitleCard>

          <TitleCard className="lg:col-span-2" heading="Target Audience">
            <form.Field name="audience">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Who are you writing for?</Label>
                  <Textarea
                    className="min-h-[120px]"
                    id={field.name}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Describe your target audience - their interests, pain points, and what matters to them"
                    value={field.state.value}
                  />
                </div>
              )}
            </form.Field>
          </TitleCard>
        </div>
      </div>
    </div>
  );
}

export default function PageClient({ organizationSlug }: PageClientProps) {
  const { getOrganization, activeOrganization } = useOrganizationsContext();
  const orgFromList = getOrganization(organizationSlug);
  const organization =
    activeOrganization?.slug === organizationSlug
      ? activeOrganization
      : orgFromList;
  const organizationId = organization?.id ?? "";

  const { data, isLoading: isLoadingSettings } =
    useBrandSettings(organizationId);
  const { progress } = useBrandAnalysisProgress(organizationId);
  const analyzeMutation = useAnalyzeBrand(organizationId);

  const [url, setUrl] = useState("");
  const effectiveUrl = url.trim() || organization?.websiteUrl || "";

  const handleAnalyze = async () => {
    if (!effectiveUrl) {
      toast.error("Please enter a website URL");
      return;
    }

    let urlToAnalyze = effectiveUrl;
    if (!effectiveUrl.startsWith("https://")) {
      urlToAnalyze = `https://${effectiveUrl}`;
    }

    const parseRes = z.url().safeParse(urlToAnalyze);
    if (!parseRes.success) {
      toast.error("Please enter a valid website URL");
      return;
    }

    try {
      await analyzeMutation.mutateAsync(urlToAnalyze);
      toast.success("Analysis started");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to start analysis"
      );
    }
  };

  const effectiveProgress =
    analyzeMutation.isPending && progress.status === "idle"
      ? {
          status: "scraping" as const,
          currentStep: 1,
          totalSteps: 3,
        }
      : progress;

  const isAnalyzing =
    analyzeMutation.isPending ||
    progress.status === "scraping" ||
    progress.status === "extracting" ||
    progress.status === "saving";

  const hasSettings = !!data?.settings;

  // Show skeleton during initial loading
  if (!organizationId || (isLoadingSettings && !data)) {
    return (
      <div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="w-full space-y-6 px-4 lg:px-6">
          <div className="space-y-1">
            <h1 className="font-bold text-3xl tracking-tight">
              Brand Identity
            </h1>
            <p className="text-muted-foreground">
              Configure your brand identity and tone of voice
            </p>
          </div>

          <div className="space-y-8">
            <div className="space-y-3 border-b pb-8">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-10 max-w-sm" />
            </div>
            <div className="space-y-3 border-b pb-8">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-10 max-w-sm" />
            </div>
            <div className="space-y-3 border-b pb-8">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-40 max-w-xl" />
            </div>
            <div className="space-y-3 border-b pb-8">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 max-w-xs" />
            </div>
            <div className="space-y-3 border-b pb-8">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-32 max-w-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show setup modal when no settings or analyzing
  if (!hasSettings || isAnalyzing) {
    return (
      <div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="w-full px-4 lg:px-6">
          <div className="relative min-h-125">
            <div className="pointer-events-none blur-sm">
              <div className="mb-6 space-y-1">
                <h1 className="font-bold text-3xl tracking-tight">
                  Brand Identity
                </h1>
                <p className="text-muted-foreground">
                  Configure your brand identity and tone of voice
                </p>
              </div>
              <div className="space-y-8">
                <div className="h-16 w-80 rounded-lg border bg-muted/20" />
                <div className="h-16 w-80 rounded-lg border bg-muted/20" />
                <div className="h-32 w-full max-w-xl rounded-lg border bg-muted/20" />
                <div className="h-24 w-80 rounded-lg border bg-muted/20" />
              </div>
            </div>

            <div className="absolute inset-0 flex items-center justify-center">
              <Card className="w-full max-w-md border-border/50 shadow-xs">
                <CardHeader className="text-center">
                  <CardTitle>
                    {getModalTitle(
                      false,
                      isAnalyzing,
                      effectiveProgress.status
                    )}
                  </CardTitle>
                  <CardDescription>
                    {getModalDescription(
                      false,
                      isAnalyzing,
                      effectiveProgress.status,
                      progress.error
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ModalContent
                    handleAnalyze={handleAnalyze}
                    isAnalyzing={isAnalyzing}
                    isLoadingSettings={false}
                    isPending={analyzeMutation.isPending}
                    progress={effectiveProgress}
                    setUrl={setUrl}
                    url={effectiveUrl}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render form with data from query - form is only rendered when data exists
  const settings = data.settings;
  if (!settings) {
    return null;
  }

  const initialData = {
    companyName: settings.companyName ?? "",
    companyDescription: settings.companyDescription ?? "",
    toneProfile: (settings.toneProfile as ToneProfile) ?? "Professional",
    customTone: settings.customTone ?? "",
    customInstructions: settings.customInstructions ?? "",
    useCustomTone: Boolean(settings.customTone),
    audience: settings.audience ?? "",
  };

  return (
    <BrandForm
      initialData={initialData}
      isReanalyzing={analyzeMutation.isPending}
      key={organizationId}
      onReanalyze={handleAnalyze}
      organizationId={organizationId}
      websiteUrl={organization?.websiteUrl}
    />
  );
}
