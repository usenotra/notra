"use client";

import { Folder01Icon, GitBranchIcon } from "@hugeicons/core-free-icons";
import { PageHeading } from "@notra/ui/components/shared/page-heading";
import { Input } from "@notra/ui/components/ui/input";
import { Switch } from "@notra/ui/components/ui/switch";
import { TitleCard } from "@notra/ui/components/ui/title-card";
import { useMutation } from "@tanstack/react-query";
import { useId, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { useSite } from "@/components/sites/site-context";
import {
  SiteChoiceGroup,
  SiteSectionsFields,
} from "@/components/sites/site-form-fields";
import { SitePreviewAccessControl } from "@/components/sites/site-preview-access-control";
import { SiteSettingsDangerZone } from "@/components/sites/site-settings-danger-zone";
import { SiteSettingsRow } from "@/components/sites/site-settings-row";
import { SiteSettingsSaveBar } from "@/components/sites/site-settings-save-bar";
import { SiteSuggestInput } from "@/components/sites/site-suggest-input";
import { SITE_NAME_MAX_LENGTH } from "@/constants/sites-form";
import { useRepositorySuggestions } from "@/lib/hooks/use-repository-suggestions";
import { useSitePublishModeOptions } from "@/lib/hooks/use-site-publish-mode-options";
import { useSiteRootDirectoryToggle } from "@/lib/hooks/use-site-root-directory-toggle";
import { useInvalidateSites } from "@/lib/hooks/use-sites";
import { dashboardOrpc } from "@/lib/orpc/query";
import type { SiteSettingsFormProps } from "@/types/components/sites";
import type { SiteSettingsForm as SiteSettingsFormValues } from "@/types/sites";
import { toErrorMessage } from "@/utils/error-message";
import {
  siteSettingsFormFromSite,
  siteSettingsPatch,
} from "@/utils/site-settings";

export function SiteSettingsPage() {
  const { organizationId, organizationSlug, siteId, detail } = useSite();
  return (
    <SiteSettingsForm
      detail={detail}
      key={detail.site.id}
      organizationId={organizationId}
      organizationSlug={organizationSlug}
      siteId={siteId}
    />
  );
}

function SiteSettingsForm({
  organizationId,
  organizationSlug,
  siteId,
  detail,
}: SiteSettingsFormProps) {
  const t = useTranslations("sites.settings");
  const tPage = useTranslations("sites.settingsPage");
  const tNew = useTranslations("sites.new");
  const tSections = useTranslations("sites.sections");
  const id = useId();
  const invalidateSites = useInvalidateSites();
  const publishModeOptions = useSitePublishModeOptions();
  const { site } = detail;
  const [form, setForm] = useState<SiteSettingsFormValues>(() =>
    siteSettingsFormFromSite(site)
  );
  const suggestions = useRepositorySuggestions({
    organizationId,
    siteId,
    branch: form.productionBranch.trim(),
  });
  const patch = siteSettingsPatch(form, site);
  const dirty = Object.keys(patch).length > 0;
  const valid =
    form.name.trim().length > 0 &&
    form.productionBranch.trim().length > 0 &&
    (form.blogEnabled || form.changelogEnabled);

  const update = <K extends keyof SiteSettingsFormValues>(
    key: K,
    value: SiteSettingsFormValues[K]
  ) => setForm((current) => ({ ...current, [key]: value }));
  const subdirectory = useSiteRootDirectoryToggle(form.rootDirectory, (value) =>
    update("rootDirectory", value)
  );

  const saveMutation = useMutation({
    mutationFn: () =>
      dashboardOrpc.sites.update.call({ organizationId, siteId, ...patch }),
    onSuccess: async (result) => {
      setForm(siteSettingsFormFromSite(result.site));
      toast.success(result.rebuilding ? t("savedRebuilding") : t("saved"));
      await invalidateSites();
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, t("saveFailed")));
    },
  });

  return (
    <div className="space-y-6">
      <PageHeading description={tPage("description")} title={tPage("title")} />
      <form
        className="space-y-6"
        onSubmit={(event) => {
          event.preventDefault();
          if (dirty && valid && !saveMutation.isPending) {
            saveMutation.mutate();
          }
        }}
      >
        <TitleCard as="section" heading={t("general")} headingAs="h2">
          <div className="divide-border divide-y">
            <SiteSettingsRow htmlFor={`${id}-name`} label={tNew("name")}>
              <Input
                id={`${id}-name`}
                maxLength={SITE_NAME_MAX_LENGTH}
                onChange={(event) => update("name", event.target.value)}
                value={form.name}
              />
            </SiteSettingsRow>
            <SiteSettingsRow
              description={tNew("branchHint")}
              htmlFor={`${id}-branch`}
              label={tNew("branch")}
            >
              <SiteSuggestInput
                emptyLabel={tNew("noBranchMatch")}
                icon={GitBranchIcon}
                id={`${id}-branch`}
                onValueChange={(value) => update("productionBranch", value)}
                suggestions={suggestions.branches}
                value={form.productionBranch}
              />
            </SiteSettingsRow>
            <SiteSettingsRow
              description={tNew("subdirectoryHint")}
              htmlFor={`${id}-subdirectory`}
              label={tNew("subdirectory")}
            >
              <div className="flex lg:h-full lg:items-center">
                <Switch
                  checked={subdirectory.checked}
                  id={`${id}-subdirectory`}
                  onCheckedChange={subdirectory.onCheckedChange}
                />
              </div>
            </SiteSettingsRow>
            {subdirectory.checked ? (
              <SiteSettingsRow
                description={tNew("rootDirectoryPathHint")}
                htmlFor={`${id}-root`}
                label={tNew("rootDirectoryPath")}
              >
                <SiteSuggestInput
                  emptyLabel={tNew("noDirectoryMatch")}
                  icon={Folder01Icon}
                  id={`${id}-root`}
                  onValueChange={(value) => update("rootDirectory", value)}
                  placeholder={tNew("rootDirectoryPlaceholder")}
                  suggestions={suggestions.configDirectories.filter(Boolean)}
                  value={form.rootDirectory}
                />
              </SiteSettingsRow>
            ) : null}
          </div>
        </TitleCard>

        <TitleCard as="section" heading={t("content")} headingAs="h2">
          <SiteSettingsRow
            description={tPage("sectionsHint")}
            label={tSections("title")}
          >
            <SiteSectionsFields
              blogEnabled={form.blogEnabled}
              blogPath={form.blogPath}
              changelogEnabled={form.changelogEnabled}
              changelogPath={form.changelogPath}
              idPrefix={id}
              onBlogEnabledChange={(value) => update("blogEnabled", value)}
              onBlogPathChange={(value) => update("blogPath", value)}
              onChangelogEnabledChange={(value) =>
                update("changelogEnabled", value)
              }
              onChangelogPathChange={(value) => update("changelogPath", value)}
            />
          </SiteSettingsRow>
        </TitleCard>

        <TitleCard as="section" heading={t("previews")} headingAs="h2">
          <SiteSettingsRow
            description={t("previewsEnabledHint")}
            label={t("previewBuilds")}
          >
            <div className="flex">
              <SitePreviewAccessControl />
            </div>
          </SiteSettingsRow>
          <SiteSettingsRow
            description={t("previewCommentsHint")}
            htmlFor={`${id}-preview-comments`}
            label={t("previewComments")}
          >
            <div className="flex lg:h-full lg:items-center">
              <Switch
                aria-label={t("previewComments")}
                checked={form.previewCommentsEnabled}
                id={`${id}-preview-comments`}
                onCheckedChange={(value) =>
                  update("previewCommentsEnabled", value)
                }
              />
            </div>
          </SiteSettingsRow>
        </TitleCard>

        <TitleCard as="section" heading={t("publishing")} headingAs="h2">
          <SiteSettingsRow label={tNew("publishMode")}>
            <SiteChoiceGroup
              hideLabel
              label={tNew("publishMode")}
              onValueChange={(value) => update("publishMode", value)}
              options={publishModeOptions}
              value={form.publishMode}
            />
          </SiteSettingsRow>
        </TitleCard>

        {dirty ? (
          <SiteSettingsSaveBar
            canSave={valid}
            isSaving={saveMutation.isPending}
            onReset={() => setForm(siteSettingsFormFromSite(site))}
          />
        ) : null}
      </form>

      <SiteSettingsDangerZone
        organizationId={organizationId}
        organizationSlug={organizationSlug}
        site={site}
        siteId={siteId}
      />
    </div>
  );
}
