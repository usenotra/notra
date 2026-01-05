"use client";

import { Refresh01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useForm } from "@tanstack/react-form";
import { useAsyncDebouncedCallback } from "@tanstack/react-pacer";
import { useRef, useState } from "react";
import { toast } from "sonner";
import z from "zod";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
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
  if (status === "idle") {
    return "";
  }
  if (status === "completed") {
    return "saving";
  }
  if (status === "failed") {
    return "";
  }
  return ANALYSIS_STEPS[currentStep - 1]?.value ?? "";
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
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
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
          {ANALYSIS_STEPS.map((step, index) => (
            <StepperItem
              completed={progress.currentStep > index + 1}
              key={step.value}
              value={step.value}
            >
              <StepperTrigger>
                <StepperIndicator />
                <StepperTitle>{step.label}</StepperTitle>
              </StepperTrigger>
              <StepperSeparator />
            </StepperItem>
          ))}
        </StepperList>
      </Stepper>
    );
  }

  return (
    <>
      <div className="flex gap-3">
        <Input
          disabled={isPending}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !isPending) {
              handleAnalyze();
            }
          }}
          placeholder="https://example.com"
          type="url"
          value={url}
        />
        <Button disabled={isPending} onClick={handleAnalyze}>
          {isPending ? (
            <>
              <div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              <span>Analyzing</span>
            </>
          ) : (
            "Analyze"
          )}
        </Button>
      </div>
      {progress.status === "failed" && (
        <p className="text-center text-muted-foreground text-sm">
          Try again with a different URL
        </p>
      )}
    </>
  );
}

interface BrandFormProps {
  organizationId: string;
  initialData: {
    companyName: string;
    companyDescription: string;
    toneProfile: ToneProfile;
    customTone: string;
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
      await updateMutation.mutateAsync(values);
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

        <div className="space-y-8">
          <form.Field name="companyName">
            {(field) => (
              <div className="space-y-3 border-b pb-8">
                <Label className="font-medium text-base" htmlFor={field.name}>
                  Company name
                </Label>
                <Input
                  className="max-w-sm"
                  id={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Your company name"
                  value={field.state.value}
                />
              </div>
            )}
          </form.Field>

          <div className="space-y-3 border-b pb-8">
            <div>
              <Label className="font-medium text-base">Website</Label>
              <p className="text-muted-foreground text-sm">
                The website used to analyze your brand
              </p>
            </div>
            <div className="flex max-w-sm gap-2">
              <div className="flex-1 rounded-md border bg-muted/50 px-3 py-2 text-sm">
                {websiteUrl ? (
                  websiteUrl
                ) : (
                  <span className="text-muted-foreground">
                    No website configured
                  </span>
                )}
              </div>
              <Button
                disabled={isReanalyzing || !websiteUrl}
                onClick={onReanalyze}
                size="icon"
                variant="outline"
              >
                <HugeiconsIcon
                  className={isReanalyzing ? "animate-spin" : ""}
                  icon={Refresh01Icon}
                  size={16}
                />
                <span className="sr-only">Re-analyze website</span>
              </Button>
            </div>
          </div>

          <form.Field name="companyDescription">
            {(field) => (
              <div className="space-y-3 border-b pb-8">
                <div>
                  <Label className="font-medium text-base" htmlFor={field.name}>
                    Company description
                  </Label>
                  <p className="text-muted-foreground text-sm">
                    A short overview of your company
                  </p>
                </div>
                <Textarea
                  className="min-h-[160px] max-w-xl"
                  id={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Describe what your company does"
                  value={field.state.value}
                />
              </div>
            )}
          </form.Field>

          <form.Field name="toneProfile">
            {(field) => (
              <div className="space-y-3 border-b pb-8">
                <div>
                  <Label className="font-medium text-base">
                    Tone & Language
                  </Label>
                  <p className="text-muted-foreground text-sm">
                    How your brand speaks
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
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
                    </div>
                    <span className="text-sm">Tone Profile</span>
                  </div>
                  <Select
                    onValueChange={(value) => {
                      if (value) {
                        field.handleChange(value as ToneProfile);
                      }
                    }}
                    value={field.state.value}
                  >
                    <SelectTrigger className="max-w-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TONE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <form.Field name="customTone">
                    {(customToneField) => (
                      <>
                        <div className="flex items-center gap-2">
                          <div className="flex size-5 items-center justify-center rounded-full border-2 border-muted-foreground/30" />
                          <span className="text-muted-foreground text-sm">
                            Custom Tone
                          </span>
                        </div>
                        {customToneField.state.value && (
                          <Input
                            className="max-w-sm"
                            id={customToneField.name}
                            onBlur={customToneField.handleBlur}
                            onChange={(e) =>
                              customToneField.handleChange(e.target.value)
                            }
                            placeholder="Add custom tone notes"
                            value={customToneField.state.value}
                          />
                        )}
                      </>
                    )}
                  </form.Field>
                </div>
              </div>
            )}
          </form.Field>

          <form.Field name="audience">
            {(field) => (
              <div className="space-y-3 border-b pb-8">
                <div>
                  <Label className="font-medium text-base" htmlFor={field.name}>
                    Audience
                  </Label>
                  <p className="text-muted-foreground text-sm">
                    A description of the core audience you are writing for
                  </p>
                </div>
                <Textarea
                  className="min-h-[120px] max-w-xl"
                  id={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Describe your target audience"
                  value={field.state.value}
                />
              </div>
            )}
          </form.Field>
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
  const effectiveUrl = url || organization?.websiteUrl || "";

  const handleAnalyze = async () => {
    if (!effectiveUrl.trim()) {
      toast.error("Please enter a website URL");
      return;
    }

    const parseRes = z.url().safeParse(effectiveUrl);
    if (!parseRes.success) {
      toast.error("Please enter a valid website URL");
      return;
    }

    try {
      await analyzeMutation.mutateAsync(effectiveUrl);
      toast.success("Analysis started");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to start analysis"
      );
    }
  };

  const isAnalyzing =
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
          <div className="relative min-h-[500px]">
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
              <Card className="w-full max-w-md shadow-lg">
                <CardHeader className="text-center">
                  <CardTitle>
                    {getModalTitle(false, isAnalyzing, progress.status)}
                  </CardTitle>
                  <CardDescription>
                    {getModalDescription(
                      false,
                      isAnalyzing,
                      progress.status,
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
                    progress={progress}
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
