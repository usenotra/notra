"use client";

import { Folder01Icon, GitBranchIcon } from "@hugeicons/core-free-icons";
import {
  isReservedSiteSlug,
  slugifySiteName,
} from "@notra/sites-core/utils/hosts";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@notra/ui/components/ui/field";
import { Input } from "@notra/ui/components/ui/input";
import { Switch } from "@notra/ui/components/ui/switch";
import { m } from "motion/react";
import { useTranslations } from "use-intl";

import { SiteAddressInput } from "@/components/sites/site-address-input";
import { SiteCreateSectionFields } from "@/components/sites/site-create-section-fields";
import { SiteCreateStarter } from "@/components/sites/site-create-starter";
import { SiteSuggestInput } from "@/components/sites/site-suggest-input";
import { SITE_CREATE_ROW_VARIANTS } from "@/constants/site-create";
import { SITE_NAME_MAX_LENGTH } from "@/constants/sites-form";
import { useSiteRootDirectoryToggle } from "@/lib/hooks/use-site-root-directory-toggle";
import type { SiteCreateSourceFieldsProps } from "@/types/components/sites";

export function SiteCreateSourceFields({
  idPrefix: id,
  organizationId,
  hostingDomain,
  form,
  onChange: update,
  repository,
  slugInvalid,
  errors,
  starterPullRequestUrl,
  onStarterPullRequestOpened,
  suggestions,
  sections,
}: SiteCreateSourceFieldsProps) {
  const t = useTranslations("sites.new");
  const slug = form.slug.trim().toLowerCase();
  const slugInvalidMessage = isReservedSiteSlug(slug)
    ? t("addressReserved", { slug })
    : t("addressInvalid");
  const slugMessage = errors.slug ?? (slugInvalid ? slugInvalidMessage : null);
  const subdirectory = useSiteRootDirectoryToggle(form.rootDirectory, (value) =>
    update("rootDirectory", value)
  );

  return (
    <>
      <m.div
        className="grid gap-4 sm:grid-cols-2"
        variants={SITE_CREATE_ROW_VARIANTS}
      >
        <Field data-invalid={errors.name ? true : undefined}>
          <FieldLabel htmlFor={`${id}-name`}>{t("name")}</FieldLabel>
          <Input
            aria-describedby={errors.name ? `${id}-name-error` : undefined}
            aria-invalid={errors.name ? true : undefined}
            autoComplete="off"
            id={`${id}-name`}
            maxLength={SITE_NAME_MAX_LENGTH}
            onChange={(event) => update("name", event.target.value)}
            placeholder={t("namePlaceholder")}
            required
            value={form.name}
          />
          <FieldError id={`${id}-name-error`}>{errors.name}</FieldError>
        </Field>
        <Field data-invalid={slugMessage ? true : undefined}>
          <FieldLabel htmlFor={`${id}-slug`}>{t("address")}</FieldLabel>
          <SiteAddressInput
            describedBy={`${id}-slug-hint`}
            hostingDomain={hostingDomain}
            id={`${id}-slug`}
            invalid={Boolean(slugMessage)}
            onValueChange={(value) => update("slug", value)}
            placeholder={slugifySiteName(form.name) || "acme"}
            value={form.slug}
          />
          <FieldError id={`${id}-slug-hint`}>{slugMessage}</FieldError>
        </Field>
      </m.div>
      <m.div
        className="flex flex-col gap-4"
        variants={SITE_CREATE_ROW_VARIANTS}
      >
        <Field>
          <FieldLabel htmlFor={`${id}-branch`}>{t("branch")}</FieldLabel>
          <SiteSuggestInput
            emptyLabel={t("noBranchMatch")}
            icon={GitBranchIcon}
            id={`${id}-branch`}
            onValueChange={(value) => update("branch", value)}
            placeholder={repository?.defaultBranch ?? "main"}
            suggestions={suggestions.branches}
            value={form.branch}
          />
        </Field>
        <Field orientation="horizontal">
          <FieldContent>
            <FieldLabel htmlFor={`${id}-subdirectory`}>
              {t("subdirectory")}
            </FieldLabel>
            <FieldDescription>{t("subdirectoryHint")}</FieldDescription>
          </FieldContent>
          <Switch
            checked={subdirectory.checked}
            id={`${id}-subdirectory`}
            onCheckedChange={subdirectory.onCheckedChange}
          />
        </Field>
        {subdirectory.checked ? (
          <Field
            className="animate-in fade-in motion-safe:slide-in-from-top-1 duration-200"
            data-invalid={errors.rootDirectory ? true : undefined}
          >
            <FieldLabel htmlFor={`${id}-root`}>
              {t("rootDirectoryPath")}
            </FieldLabel>
            <SiteSuggestInput
              describedBy={
                errors.rootDirectory ? `${id}-root-error` : `${id}-root-hint`
              }
              emptyLabel={t("noDirectoryMatch")}
              icon={Folder01Icon}
              id={`${id}-root`}
              invalid={Boolean(errors.rootDirectory)}
              onValueChange={(value) => update("rootDirectory", value)}
              placeholder={t("rootDirectoryPlaceholder")}
              suggestions={suggestions.configDirectories.filter(Boolean)}
              value={form.rootDirectory}
            />
            {errors.rootDirectory ? (
              <FieldError id={`${id}-root-error`}>
                {errors.rootDirectory}
              </FieldError>
            ) : (
              <FieldDescription id={`${id}-root-hint`}>
                {t("rootDirectoryPathHint")}
              </FieldDescription>
            )}
          </Field>
        ) : null}
      </m.div>
      {form.repositoryId ? (
        <SiteCreateStarter
          branch={form.branch}
          onPullRequestOpened={onStarterPullRequestOpened}
          organizationId={organizationId}
          pullRequestUrl={starterPullRequestUrl}
          repositoryId={form.repositoryId}
          rootDirectory={form.rootDirectory}
        />
      ) : null}
      <m.div variants={SITE_CREATE_ROW_VARIANTS}>
        <SiteCreateSectionFields
          error={errors.sections}
          idPrefix={id}
          onBlogPathChange={(value) => update("blogPath", value)}
          onChangelogPathChange={(value) => update("changelogPath", value)}
          plan={sections}
        />
      </m.div>
    </>
  );
}
