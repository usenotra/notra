"use client";

import {
  onboardingWorkspaceFormFieldsSchema,
  onboardingWorkspaceFormSchema,
} from "@notra/schemas/dashboard/onboarding/workspace";
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
import { useForm, useStore } from "@tanstack/react-form";
import { useDebouncedValue } from "@tanstack/react-pacer";
import { CheckIcon, Loader2Icon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

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
import { followServerRedirect } from "@/lib/framework/follow-server-redirect";
import { useHeardAboutLabels } from "@/lib/hooks/use-heard-about-labels";
import { extractDomain } from "@/lib/onboarding/company-logo";
import {
  MAX_LOGO_FILE_SIZE_MB,
  readFileAsDataUrl,
  validateLogoFile,
} from "@/lib/onboarding/logo-file";
import { skipOnboarding } from "@/lib/onboarding/skip";
import { submitWorkspaceForm } from "@/lib/onboarding/submit-workspace-form";
import type {
  OnboardingExistingOrg,
  WorkspaceFormField,
  WorkspaceFormProps,
  WorkspaceSlugCheck,
} from "@/types/onboarding";
import { getGoogleFaviconUrl } from "@/utils/brand";
import {
  isHeardAboutNotraSource,
  slugify,
  slugifyWhileTyping,
} from "@/utils/onboarding";

import { isWorkspaceSlugAvailable } from "./actions";

const WEBSITE_PREFIX_REGEX = /^https?:\/\//i;

export function WorkspaceForm({
  existingOrg,
  progressHrefs,
}: WorkspaceFormProps) {
  const t = useTranslations("onboarding.workspace");
  const tCommon = useTranslations("common");
  const heardAboutLabels = useHeardAboutLabels();
  const getHeardAboutLabel = (value: string | null | undefined) => {
    if (!value) {
      return null;
    }
    return isHeardAboutNotraSource(value) ? heardAboutLabels[value] : value;
  };
  const getValidationMessage = (field: WorkspaceFormField, error: unknown) => {
    if (typeof error === "string") {
      return error;
    }
    if (!(error && typeof error === "object")) {
      return t("validation.checkField");
    }
    const code = "code" in error ? error.code : undefined;
    if (field === "name" && code === "too_small") {
      return tCommon("messages.organizationNameTooShort");
    }
    if (field === "name" && code === "too_big") {
      return tCommon("messages.organizationNameTooLong");
    }
    if (field === "slug" && code === "too_small") {
      return tCommon("messages.organizationSlugTooShort");
    }
    if (field === "slug" && code === "too_big") {
      return tCommon("messages.organizationSlugTooLong");
    }
    if (field === "slug" && code === "custom") {
      return tCommon("messages.thisSlugIsReservedAnd");
    }
    if (field === "websiteUrl") {
      return t("validation.websiteInvalid");
    }
    if (field === "heardAboutNotraOther" && code === "custom") {
      return t("validation.heardAboutOtherRequired");
    }
    if ("message" in error) {
      return String(error.message);
    }
    return t("validation.checkField");
  };
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdOrg, setCreatedOrg] = useState<OnboardingExistingOrg>();
  const currentOrg = existingOrg ?? createdOrg;
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(
    existingOrg?.logo ?? null
  );
  const [websiteValue, setWebsiteValue] = useState("");
  const [debouncedWebsite] = useDebouncedValue(websiteValue, {
    wait: COMPANY_LOGO_DEBOUNCE_MS,
  });
  const companyDomain = extractDomain(debouncedWebsite);
  const fetchedLogoUrl = logoFile
    ? null
    : (getGoogleFaviconUrl(companyDomain) ?? null);
  const isResuming = !!currentOrg;

  const handleLogoSelect = async (file: File) => {
    const validationError = validateLogoFile(file);
    if (validationError) {
      toast.error(
        validationError === "tooLarge"
          ? t("logoTooLarge", { size: MAX_LOGO_FILE_SIZE_MB })
          : t("logoInvalidType")
      );
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setLogoFile(file);
      setLogoPreviewUrl(dataUrl);
    } catch {
      toast.error(t("logoReadFailed"));
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
        await submitWorkspaceForm({
          existingOrg: currentOrg,
          onOrganizationCreated: setCreatedOrg,
          logoFile,
          logoSourceUrl: null,
          value,
        });
        if (!value.websiteUrl.trim()) {
          // The GEO steps start from the brand the website analysis creates;
          // without a website they would send the user straight back here.
          await followServerRedirect(
            skipOnboarding(
              currentOrg?.slug ?? value.slug,
              ONBOARDING_STEPS.WORKSPACE
            )
          );
          return;
        }
        window.location.assign("/onboarding/visibility");
      } catch (err) {
        toast.error(
          err instanceof Error && err.message ? err.message : t("createFailed")
        );
        setIsSubmitting(false);
      }
    },
    onSubmitInvalid: ({ formApi }) => {
      const fields = [
        ["name", "name"],
        ["slug", "slug"],
        ["websiteUrl", "website"],
        ["heardAboutNotraSource", "heard-about-notra"],
        ["heardAboutNotraOther", "heard-about-notra-other"],
      ] as const;
      for (const [field, id] of fields) {
        if (formApi.state.fieldMeta[field]?.errors.length) {
          const input = document.getElementById(id);
          if (input instanceof HTMLElement && !input.hasAttribute("disabled")) {
            requestAnimationFrame(() => input.focus());
            break;
          }
        }
      }
    },
  });

  const slug = useStore(form.store, (state) => state.values.slug);
  const [slugCheck, setSlugCheck] = useState<WorkspaceSlugCheck | null>(null);
  const validSlug =
    !isResuming &&
    onboardingWorkspaceFormFieldsSchema.shape.slug.safeParse(slug).success;
  let slugStatus: WorkspaceSlugCheck["status"] | null = null;
  if (validSlug) {
    slugStatus = slugCheck?.slug === slug ? slugCheck.status : "checking";
  }

  useEffect(() => {
    if (!validSlug) {
      return;
    }

    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout>;
    const check = async (attempt: number) => {
      try {
        const available = await isWorkspaceSlugAvailable(slug);
        if (!cancelled) {
          setSlugCheck({
            slug,
            status: available ? "available" : "unavailable",
          });
        }
      } catch {
        if (cancelled) {
          return;
        }
        if (attempt < 2) {
          timeout = setTimeout(() => check(attempt + 1), 400 * 2 ** attempt);
        } else {
          setSlugCheck({ slug, status: "error" });
        }
      }
    };

    timeout = setTimeout(() => check(0), 400);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [slug, validSlug]);

  return (
    <div className="flex w-full flex-col gap-5">
      <OnboardingStepViewTracker
        isResuming={isResuming}
        step={ONBOARDING_STEPS.WORKSPACE}
      />
      <div className="flex justify-center">
        <OnboardingProgress
          current={ONBOARDING_STEP_WORKSPACE}
          hrefs={progressHrefs}
        />
      </div>

      <AuthFormHeader
        description={isResuming ? t("resumeDescription") : t("description")}
        title={isResuming ? t("resumeTitle") : t("title")}
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
              <Label htmlFor="name">{tCommon("labels.name")}</Label>
              <div className="flex items-center gap-2">
                <OrgLogoField
                  disabled={isSubmitting}
                  onSelect={handleLogoSelect}
                  previewUrl={logoPreviewUrl ?? fetchedLogoUrl}
                />
                <Input
                  aria-describedby={
                    field.state.meta.errors.length > 0
                      ? "name-error"
                      : undefined
                  }
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
                  placeholder={tCommon("labels.acmeInc")}
                  type="text"
                  value={field.state.value}
                />
              </div>
              {field.state.meta.errors.length > 0 ? (
                <p className="text-destructive text-sm" id="name-error">
                  {getValidationMessage(field.name, field.state.meta.errors[0])}
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
              <Label htmlFor="slug">{tCommon("labels.slug")}</Label>
              <div
                className={`focus-within:border-ring focus-within:ring-ring/50 relative flex h-11 min-h-11 w-full flex-row items-center overflow-hidden rounded-xl border transition-colors focus-within:ring-[3px] ${field.state.meta.errors.length > 0 ? "border-destructive" : "border-input"}`}
              >
                <label
                  className="border-input bg-muted/30 text-muted-foreground flex h-full items-center border-r px-3.5 text-sm"
                  htmlFor="slug"
                >
                  app.usenotra.com/
                </label>
                <input
                  autoCapitalize="none"
                  autoComplete="off"
                  autoCorrect="off"
                  aria-describedby={
                    field.state.meta.errors.length > 0
                      ? "slug-error"
                      : undefined
                  }
                  aria-invalid={field.state.meta.errors.length > 0}
                  className="h-full min-w-0 flex-1 bg-transparent py-0 pr-11 pl-3.5 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isSubmitting || isResuming}
                  id="slug"
                  onBlur={() => {
                    field.handleChange(slugify(field.state.value));
                    field.handleBlur();
                  }}
                  onChange={(e) =>
                    field.handleChange(slugifyWhileTyping(e.target.value))
                  }
                  placeholder={tCommon("labels.acmeIncSlug")}
                  spellCheck={false}
                  type="text"
                  value={field.state.value}
                />
                <span
                  aria-hidden={!slugStatus}
                  aria-label={
                    slugStatus ? t(`slugStatus.${slugStatus}`) : undefined
                  }
                  className="pointer-events-none absolute right-3.5 flex size-6 items-center justify-center"
                  role="status"
                >
                  <Loader2Icon
                    className={`text-muted-foreground duration-fast absolute size-4 animate-spin transition-opacity motion-reduce:animate-none motion-reduce:transition-none ${slugStatus === "checking" ? "opacity-100" : "opacity-0"}`}
                  />
                  <span
                    className={`bg-success/15 text-success duration-fast absolute flex size-6 items-center justify-center rounded-full transition-[opacity,transform] motion-reduce:transition-none ${slugStatus === "available" ? "scale-100 opacity-100" : "scale-75 opacity-0"}`}
                  >
                    <CheckIcon className="size-4" />
                  </span>
                  <span
                    className={`bg-destructive/10 text-destructive duration-fast absolute flex size-6 items-center justify-center rounded-full transition-[opacity,transform] motion-reduce:transition-none ${slugStatus === "unavailable" ? "scale-100 opacity-100" : "scale-75 opacity-0"}`}
                  >
                    <XIcon className="size-4" />
                  </span>
                  <XIcon
                    className={`text-muted-foreground duration-fast absolute size-4 transition-opacity motion-reduce:transition-none ${slugStatus === "error" ? "opacity-100" : "opacity-0"}`}
                  />
                </span>
              </div>
              {field.state.meta.errors.length > 0 ? (
                <p className="text-destructive text-sm" id="slug-error">
                  {getValidationMessage(field.name, field.state.meta.errors[0])}
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
              <Label htmlFor="website">{tCommon("labels.website")}</Label>
              <div
                className={`focus-within:border-ring focus-within:ring-ring/50 flex h-11 min-h-11 w-full flex-row items-center overflow-hidden rounded-xl border transition-colors focus-within:ring-[3px] ${field.state.meta.errors.length > 0 ? "border-destructive" : "border-input"}`}
              >
                <label
                  className="border-input bg-muted/30 text-muted-foreground flex h-full items-center border-r px-3.5 text-sm"
                  htmlFor="website"
                >
                  https://
                </label>
                <input
                  aria-describedby={
                    field.state.meta.errors.length > 0
                      ? "website-error"
                      : undefined
                  }
                  aria-invalid={field.state.meta.errors.length > 0}
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
                <p className="text-destructive text-sm" id="website-error">
                  {getValidationMessage(field.name, field.state.meta.errors[0])}
                </p>
              ) : null}
            </div>
          )}
        </form.Field>

        {isAttributionLocked ? null : (
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
                    {t("heardAbout")}{" "}
                    {field.state.value !== "other" ? (
                      <span className="text-muted-foreground text-xs">
                        {tCommon("labels.optional")}
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
                      aria-describedby={
                        field.state.meta.errors.length > 0
                          ? "heard-about-notra-error"
                          : undefined
                      }
                      aria-invalid={field.state.meta.errors.length > 0}
                      className="w-full rounded-xl px-3.5 data-[size=default]:h-11"
                      disabled={isSubmitting}
                      id="heard-about-notra"
                    >
                      <SelectValue placeholder={t("selectOption")}>
                        {(value) =>
                          getHeardAboutLabel(value) ?? t("selectOption")
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {ONBOARDING_HEARD_ABOUT_NOTRA_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {heardAboutLabels[option.value]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {field.state.meta.errors.length > 0 ? (
                    <p
                      className="text-destructive text-sm"
                      id="heard-about-notra-error"
                    >
                      {getValidationMessage(
                        field.name,
                        field.state.meta.errors[0]
                      )}
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
                            {t("tellUsWhere")}
                          </Label>
                          <Textarea
                            aria-describedby={
                              otherField.state.meta.errors.length > 0
                                ? "heard-about-notra-other-error"
                                : undefined
                            }
                            aria-invalid={
                              otherField.state.meta.errors.length > 0
                            }
                            className="resize-none focus-visible:ring-inset"
                            disabled={
                              isSubmitting || field.state.value !== "other"
                            }
                            id="heard-about-notra-other"
                            onBlur={otherField.handleBlur}
                            onChange={(e) =>
                              otherField.handleChange(e.target.value)
                            }
                            placeholder={t("tellUsWherePlaceholder")}
                            rows={3}
                            value={otherField.state.value}
                          />
                          {otherField.state.meta.errors.length > 0 ? (
                            <p
                              className="text-destructive text-sm"
                              id="heard-about-notra-other-error"
                            >
                              {getValidationMessage(
                                otherField.name,
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
        )}

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

        <CtaButton className="w-full" disabled={isSubmitting} type="submit">
          {isSubmitting ? (
            <>
              <Loader2Icon className="size-4 animate-spin" />
              {t("settingUp")}
            </>
          ) : (
            tCommon("actions.continue")
          )}
        </CtaButton>
      </form>
    </div>
  );
}
