"use client";

import {
  onboardingWorkspaceFormFieldsSchema,
  onboardingWorkspaceFormSchema,
} from "@notra/schemas/dashboard/onboarding/workspace";
import { slugSchema } from "@notra/schemas/dashboard/organization";
import { AuthFormHeader } from "@notra/ui/components/shared/auth/auth-form-header";
import { CtaButton } from "@notra/ui/components/shared/cta-button";
import { Input } from "@notra/ui/components/ui/input";
import { Label } from "@notra/ui/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@notra/ui/components/ui/select";
import { Textarea } from "@notra/ui/components/ui/textarea";
import { useForm } from "@tanstack/react-form";
import { useDebouncedValue } from "@tanstack/react-pacer";
import { Loader2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { OnboardingEmailPrefs } from "@/components/onboarding/email-prefs";
import { OrgLogoField } from "@/components/onboarding/org-logo-field";
import { OnboardingProgress } from "@/components/onboarding/progress";
import { OnboardingStepViewTracker } from "@/components/onboarding/step-view-tracker";
import { ONBOARDING_STEPS } from "@/constants/analytics-events";
import { COMPANY_LOGO_DEBOUNCE_MS } from "@/constants/company-logo";
import {
  ONBOARDING_HEARD_ABOUT_NOTRA_OPTIONS,
  ONBOARDING_STEP_WORKSPACE,
} from "@/constants/onboarding";
import { useCompanyLogo } from "@/lib/hooks/use-onboarding";
import { extractDomain } from "@/lib/onboarding/company-logo";
import {
  readFileAsDataUrl,
  validateLogoFile,
} from "@/lib/onboarding/logo-file";
import { submitWorkspaceForm } from "@/lib/onboarding/submit-workspace-form";
import type { WorkspaceFormProps } from "@/types/onboarding";
import {
  getHeardAboutNotraLabel,
  isHeardAboutNotraSource,
} from "@/utils/onboarding";

const WEBSITE_PREFIX_REGEX = /^https?:\/\//i;

function slugify(value: string): string {
  return slugSchema.safeParse(value).data ?? "";
}

function getValidationMessage(error: unknown) {
  if (typeof error === "string") {
    return error;
  }

  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }

  return "Please check this field";
}

export function WorkspaceForm({ existingOrg }: WorkspaceFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(
    existingOrg?.logo ?? null
  );
  const [websiteValue, setWebsiteValue] = useState("");
  const [debouncedWebsite] = useDebouncedValue(websiteValue, {
    wait: COMPANY_LOGO_DEBOUNCE_MS,
  });
  const companyDomain = extractDomain(debouncedWebsite);
  const { data: companyLogo, isFetching: isCompanyLogoLoading } =
    useCompanyLogo(logoFile ? null : companyDomain);
  const fetchedLogoUrl = logoFile ? null : (companyLogo?.url ?? null);
  const isResuming = !!existingOrg;

  const handleLogoSelect = async (file: File) => {
    const validationError = validateLogoFile(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setLogoFile(file);
      setLogoPreviewUrl(dataUrl);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not read the selected image."
      );
    }
  };
  const existingSource = existingOrg?.heardAboutNotraSource;
  const initialSource = isHeardAboutNotraSource(existingSource)
    ? existingSource
    : "";
  const isAttributionLocked = Boolean(
    existingSource || existingOrg?.heardAboutNotraOther
  );

  const form = useForm({
    defaultValues: {
      heardAboutNotraOther: existingOrg?.heardAboutNotraOther ?? "",
      heardAboutNotraSource: initialSource,
      name: existingOrg?.name ?? "",
      slug: existingOrg?.slug ?? "",
      websiteUrl: "",
      dailySummary: existingOrg?.dailySummary ?? true,
      marketingEmails: existingOrg?.marketingEmails ?? true,
    },
    validators: {
      onSubmit: onboardingWorkspaceFormSchema,
    },
    onSubmit: async ({ value }) => {
      setIsSubmitting(true);

      try {
        const submittedDomain = extractDomain(value.websiteUrl);
        const matchesSubmittedDomain =
          !!submittedDomain && submittedDomain === companyDomain;

        await submitWorkspaceForm({
          existingOrg,
          logoFile,
          logoSourceUrl: matchesSubmittedDomain ? fetchedLogoUrl : null,
          value,
        });
        window.location.assign("/onboarding/visibility");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to create workspace"
        );
        setIsSubmitting(false);
      }
    },
  });

  return (
    <div className="flex w-full flex-col gap-5">
      <OnboardingStepViewTracker
        isResuming={isResuming}
        step={ONBOARDING_STEPS.WORKSPACE}
      />
      <div className="flex justify-center">
        <OnboardingProgress current={ONBOARDING_STEP_WORKSPACE} />
      </div>

      <AuthFormHeader
        description={
          isResuming
            ? "Your workspace is ready. Add your website and we'll pick up your brand voice."
            : "Add your website and we'll pick up your brand voice from it."
        }
        title={
          isResuming
            ? "Finish setting up your workspace"
            : "Set up your workspace"
        }
      />

      <form
        className="mt-2 space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        <form.Field
          name="name"
          validators={{
            onChange: onboardingWorkspaceFormFieldsSchema.shape.name,
          }}
        >
          {(field) => (
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <div className="flex items-center gap-2">
                <OrgLogoField
                  disabled={isSubmitting}
                  isLoading={isCompanyLogoLoading}
                  onSelect={handleLogoSelect}
                  previewUrl={logoPreviewUrl ?? fetchedLogoUrl}
                />
                <Input
                  aria-invalid={field.state.meta.errors.length > 0}
                  autoFocus={!isResuming}
                  className="h-11 rounded-xl px-3.5"
                  disabled={isSubmitting || isResuming}
                  id="name"
                  onBlur={field.handleBlur}
                  onChange={(e) => {
                    field.handleChange(e.target.value);
                    const currentSlug = form.getFieldValue("slug");
                    if (
                      !currentSlug ||
                      currentSlug === slugify(field.state.value)
                    ) {
                      form.setFieldValue("slug", slugify(e.target.value));
                    }
                  }}
                  placeholder="Acme Inc"
                  type="text"
                  value={field.state.value}
                />
              </div>
              {field.state.meta.errors.length > 0 ? (
                <p className="text-destructive text-sm">
                  {getValidationMessage(field.state.meta.errors[0])}
                </p>
              ) : null}
            </div>
          )}
        </form.Field>

        <form.Field
          name="slug"
          validators={{
            onChange: onboardingWorkspaceFormFieldsSchema.shape.slug,
          }}
        >
          {(field) => (
            <div className="grid gap-2">
              <Label htmlFor="slug">Slug</Label>
              <div
                className={`focus-within:border-ring focus-within:ring-ring/50 flex h-11 w-full flex-row items-center overflow-hidden rounded-xl border transition-colors focus-within:ring-[3px] ${field.state.meta.errors.length > 0 ? "border-destructive" : "border-input"}`}
              >
                <label
                  className="border-input bg-muted/30 text-muted-foreground flex h-full items-center border-r px-3.5 text-sm"
                  htmlFor="slug"
                >
                  app.usenotra.com/
                </label>
                <input
                  className="h-full flex-1 bg-transparent px-3.5 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isSubmitting || isResuming}
                  id="slug"
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(slugify(e.target.value))}
                  placeholder="acme-inc"
                  type="text"
                  value={field.state.value}
                />
              </div>
              {field.state.meta.errors.length > 0 ? (
                <p className="text-destructive text-sm">
                  {getValidationMessage(field.state.meta.errors[0])}
                </p>
              ) : null}
            </div>
          )}
        </form.Field>

        <form.Field
          name="websiteUrl"
          validators={{
            onSubmit: onboardingWorkspaceFormFieldsSchema.shape.websiteUrl,
          }}
        >
          {(field) => (
            <div className="grid gap-2">
              <Label htmlFor="website">Website</Label>
              <div
                className={`focus-within:border-ring focus-within:ring-ring/50 flex h-11 w-full flex-row items-center overflow-hidden rounded-xl border transition-colors focus-within:ring-[3px] ${field.state.meta.errors.length > 0 ? "border-destructive" : "border-input"}`}
              >
                <label
                  className="border-input bg-muted/30 text-muted-foreground flex h-full items-center border-r px-3.5 text-sm"
                  htmlFor="website"
                >
                  https://
                </label>
                <input
                  autoFocus={isResuming}
                  className="h-full flex-1 bg-transparent px-3.5 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isSubmitting}
                  id="website"
                  onBlur={field.handleBlur}
                  onChange={(e) => {
                    field.handleChange(e.target.value);
                    setWebsiteValue(e.target.value);
                  }}
                  placeholder="acme.com"
                  type="text"
                  value={field.state.value.replace(WEBSITE_PREFIX_REGEX, "")}
                />
              </div>
              {field.state.meta.errors.length > 0 ? (
                <p className="text-destructive text-sm">
                  {getValidationMessage(field.state.meta.errors[0])}
                </p>
              ) : null}
            </div>
          )}
        </form.Field>

        <form.Field
          name="heardAboutNotraSource"
          validators={{
            onChange:
              onboardingWorkspaceFormFieldsSchema.shape.heardAboutNotraSource,
          }}
        >
          {(field) => (
            <div>
              <div className="grid gap-2">
                <Label htmlFor="heard-about-notra">
                  Where did you hear about Notra?{" "}
                  {field.state.value !== "other" ? (
                    <span className="text-muted-foreground text-xs">
                      (optional)
                    </span>
                  ) : null}
                </Label>
                <Select
                  onValueChange={(value) => {
                    if (!isHeardAboutNotraSource(value)) {
                      return;
                    }

                    field.handleChange(value);
                    if (value !== "other") {
                      form.setFieldValue("heardAboutNotraOther", "");
                    }
                  }}
                  value={field.state.value}
                >
                  <SelectTrigger
                    aria-invalid={field.state.meta.errors.length > 0}
                    className="w-full rounded-xl px-3.5 data-[size=default]:h-11"
                    disabled={isSubmitting || isAttributionLocked}
                    id="heard-about-notra"
                  >
                    <SelectValue placeholder="Select an option">
                      {(value) =>
                        getHeardAboutNotraLabel(value) ?? "Select an option"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {ONBOARDING_HEARD_ABOUT_NOTRA_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {field.state.meta.errors.length > 0 ? (
                  <p className="text-destructive text-sm">
                    {getValidationMessage(field.state.meta.errors[0])}
                  </p>
                ) : null}
              </div>

              <div
                aria-hidden={field.state.value !== "other"}
                className={`duration-normal grid transition-[grid-template-rows,opacity] ease-out motion-reduce:transition-none ${field.state.value === "other" ? "grid-rows-[1fr] opacity-100" : "pointer-events-none grid-rows-[0fr] opacity-0"}`}
              >
                <div className="min-h-0 overflow-hidden">
                  <form.Field
                    name="heardAboutNotraOther"
                    validators={{
                      onChange:
                        onboardingWorkspaceFormFieldsSchema.shape
                          .heardAboutNotraOther,
                    }}
                  >
                    {(otherField) => (
                      <div className="grid gap-2 pt-5">
                        <Label htmlFor="heard-about-notra-other">
                          Tell us where
                        </Label>
                        <Textarea
                          aria-invalid={otherField.state.meta.errors.length > 0}
                          className="resize-none focus-visible:ring-inset"
                          disabled={
                            isSubmitting ||
                            isAttributionLocked ||
                            field.state.value !== "other"
                          }
                          id="heard-about-notra-other"
                          onBlur={otherField.handleBlur}
                          onChange={(e) =>
                            otherField.handleChange(e.target.value)
                          }
                          placeholder="Podcast, community, friend, etc."
                          rows={3}
                          value={otherField.state.value}
                        />
                        {otherField.state.meta.errors.length > 0 ? (
                          <p className="text-destructive text-sm">
                            {getValidationMessage(
                              otherField.state.meta.errors[0]
                            )}
                          </p>
                        ) : null}
                      </div>
                    )}
                  </form.Field>
                </div>
              </div>
            </div>
          )}
        </form.Field>

        <form.Field name="dailySummary">
          {(dailyField) => (
            <form.Field name="marketingEmails">
              {(marketingField) => (
                <OnboardingEmailPrefs
                  dailySummary={dailyField.state.value}
                  disabled={isSubmitting}
                  marketingEmails={marketingField.state.value}
                  onDailySummaryChange={dailyField.handleChange}
                  onMarketingEmailsChange={marketingField.handleChange}
                />
              )}
            </form.Field>
          )}
        </form.Field>

        <form.Subscribe selector={(state) => [state.canSubmit]}>
          {([canSubmit]) => (
            <CtaButton
              className="w-full"
              disabled={!canSubmit || isSubmitting}
              type="submit"
            >
              {isSubmitting ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" />
                  Setting up...
                </>
              ) : (
                "Continue"
              )}
            </CtaButton>
          )}
        </form.Subscribe>
      </form>
    </div>
  );
}
