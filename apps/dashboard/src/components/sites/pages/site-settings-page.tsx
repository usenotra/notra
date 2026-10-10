"use client";

import {
  Analytics01Icon,
  ArrowUpRight01Icon,
  CodeIcon,
  Comment01Icon,
  FlashIcon,
  Folder01Icon,
  GitBranchIcon,
  GithubIcon,
  GitPullRequestIcon,
  Layers01Icon,
  SparklesIcon,
  Tag01Icon,
  ViewIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { ConfirmDialog } from "@notra/ui/components/shared/confirm-dialog";
import { PageHeading } from "@notra/ui/components/shared/page-heading";
import { Badge } from "@notra/ui/components/ui/badge";
import { Field, FieldError, FieldLabel } from "@notra/ui/components/ui/field";
import { Input } from "@notra/ui/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@notra/ui/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@notra/ui/components/ui/select";
import { Switch } from "@notra/ui/components/ui/switch";
import { useMutation } from "@tanstack/react-query";
import { useId, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { Button, buttonVariants } from "@/components/button";
import { useSite } from "@/components/sites/site-context";
import { SitePreviewAccessForm } from "@/components/sites/site-preview-access-control";
import { SiteSettingsDangerZone } from "@/components/sites/site-settings-danger-zone";
import { SiteSettingsEditor } from "@/components/sites/site-settings-editor";
import {
  SiteSettingsGroup,
  SiteSettingsHint,
  SiteSettingsItem,
  SiteSettingsList,
  SiteSettingsSwitchItem,
  SiteSettingsValue,
} from "@/components/sites/site-settings-item";
import { SiteSuggestInput } from "@/components/sites/site-suggest-input";
import {
  SiteVariablesSettings,
  useSiteVariablesCount,
} from "@/components/sites/site-variables-settings";
import { SITE_NAME_MAX_LENGTH } from "@/constants/sites-form";
import {
  useGitHubCallbackErrorToast,
  useResumeGitHubInstall,
} from "@/hooks/use-github-install-callbacks";
import { useRepositorySuggestions } from "@/lib/hooks/use-repository-suggestions";
import { useSitePublishModeOptions } from "@/lib/hooks/use-site-publish-mode-options";
import { useInvalidateSites } from "@/lib/hooks/use-sites";
import { useUpdateSiteSettings } from "@/lib/hooks/use-update-site-settings";
import { startGitHubInstall } from "@/lib/integrations/github/install";
import { dashboardOrpc } from "@/lib/orpc/query";
import type {
  SiteBranchFieldProps,
  SiteRootDirectoryFieldProps,
  SiteSectionFieldProps,
  SiteSettingsToggleProps,
} from "@/types/components/site-settings";
import type { SitePublishMode, SiteSettingsRowKey } from "@/types/sites";
import { toErrorMessage } from "@/utils/error-message";
import { githubRepositoryUrl, siteHref } from "@/utils/site-links";
import { sitePreviewAccessMode } from "@/utils/site-preview-access";

export function SiteSettingsPage() {
  const { organizationId, organizationSlug, siteId } = useSite();
  useGitHubCallbackErrorToast();
  useResumeGitHubInstall({
    callbackPath: siteHref(organizationSlug, siteId, "settings"),
    organizationId,
  });
  // Drafts belong to one site; switching sites must start from fresh state.
  return <SiteSettingsContent key={siteId} />;
}

function SiteSettingsContent() {
  const { organizationId, organizationSlug, siteId, detail } = useSite();
  const t = useTranslations("sites.settings");
  const tPage = useTranslations("sites.settingsPage");
  const tNew = useTranslations("sites.new");
  const tSections = useTranslations("sites.sections");
  const tPreview = useTranslations("sites.previewAccess");
  const tVariables = useTranslations("sites.variables");
  const variablesCount = useSiteVariablesCount();
  const [openRow, setOpenRow] = useState<SiteSettingsRowKey | null>(null);
  const { site } = detail;

  const row = (key: SiteSettingsRowKey) => ({
    open: openRow === key,
    onOpenChange: (open: boolean) => setOpenRow(open ? key : null),
  });
  // Only close the row that finished saving; another row may be open by now.
  const closeRow = (key: SiteSettingsRowKey) => () =>
    setOpenRow((current) => (current === key ? null : current));
  const previewMode = site.previewsEnabled
    ? sitePreviewAccessMode(site)
    : "off";

  return (
    <div className="space-y-8">
      <PageHeading description={tPage("description")} title={tPage("title")} />

      <SiteSettingsList>
        <SiteSettingsItem
          description={t("nameHint")}
          icon={Tag01Icon}
          title={tNew("name")}
          value={<SiteNameField />}
        />
        <SiteSettingsItem
          {...row("repository")}
          description={t("repositoryHint")}
          icon={GithubIcon}
          title={t("repository")}
          value={
            <SiteSettingsValue>
              {site.repository
                ? `${site.repository.owner}/${site.repository.name}`
                : t("noRepository")}
            </SiteSettingsValue>
          }
        >
          <RepositoryPanel />
        </SiteSettingsItem>
        <SiteSettingsItem
          {...row("branch")}
          description={tNew("branchHint")}
          icon={GitBranchIcon}
          title={tNew("branch")}
          value={
            <SiteSettingsValue mono>{site.productionBranch}</SiteSettingsValue>
          }
        >
          <SiteSettingsEditor
            isValid={(form) => form.productionBranch.trim().length > 0}
            onDone={closeRow("branch")}
          >
            {(form, update) => (
              <BranchField
                onChange={(value) => update("productionBranch", value)}
                value={form.productionBranch}
              />
            )}
          </SiteSettingsEditor>
        </SiteSettingsItem>
        <SiteSettingsItem
          {...row("rootDirectory")}
          description={t("rootDirectoryHint")}
          icon={Folder01Icon}
          title={t("rootDirectory")}
          value={
            <SiteSettingsValue mono>
              {site.rootDirectory ? `./${site.rootDirectory}` : "./"}
            </SiteSettingsValue>
          }
        >
          <SiteSettingsEditor onDone={closeRow("rootDirectory")}>
            {(form, update) => (
              <RootDirectoryField
                branch={form.productionBranch}
                onChange={(value) => update("rootDirectory", value)}
                value={form.rootDirectory}
              />
            )}
          </SiteSettingsEditor>
        </SiteSettingsItem>
        <SiteSettingsToggle
          description={t("smartDeploymentsHint")}
          field="smartDeployments"
          icon={FlashIcon}
          title={
            <span className="inline-flex items-center gap-2">
              {t("smartDeployments")}
              <Badge size="sm" variant="secondary">
                {t("beta")}
              </Badge>
            </span>
          }
        />
      </SiteSettingsList>

      <SiteSettingsGroup icon={Layers01Icon} title={t("contentGroup")}>
        <SiteSettingsList>
          <SiteSettingsItem
            {...row("sections")}
            description={t("sectionsRowHint")}
            icon={Layers01Icon}
            title={tSections("title")}
            value={
              <SiteSettingsValue mono>
                {[site.mounts.blog, site.mounts.changelog]
                  .filter(Boolean)
                  .join("  ·  ")}
              </SiteSettingsValue>
            }
          >
            <SiteSettingsEditor
              isValid={(form) => form.blogEnabled || form.changelogEnabled}
              onDone={closeRow("sections")}
            >
              {(form, update) => (
                <>
                  <SiteSectionField
                    enabled={form.blogEnabled}
                    onEnabledChange={(value) => update("blogEnabled", value)}
                    onPathChange={(value) => update("blogPath", value)}
                    path={form.blogPath}
                    title={tSections("blog")}
                  />
                  <SiteSectionField
                    enabled={form.changelogEnabled}
                    onEnabledChange={(value) =>
                      update("changelogEnabled", value)
                    }
                    onPathChange={(value) => update("changelogPath", value)}
                    path={form.changelogPath}
                    title={tSections("changelog")}
                  />
                  {form.blogEnabled || form.changelogEnabled ? (
                    <SiteSettingsHint>{tPage("sectionsHint")}</SiteSettingsHint>
                  ) : (
                    <FieldError>{tSections("atLeastOne")}</FieldError>
                  )}
                </>
              )}
            </SiteSettingsEditor>
          </SiteSettingsItem>
          <SiteSettingsItem
            description={t("publishModeHint")}
            icon={GitPullRequestIcon}
            title={tNew("publishMode")}
            value={<PublishModeSelect />}
          />
          <SiteSettingsItem
            {...row("variables")}
            description={t("variablesHint")}
            icon={CodeIcon}
            title={tVariables("title")}
            value={
              variablesCount === null ? null : (
                <SiteSettingsValue>
                  {t("variablesCount", { count: variablesCount })}
                </SiteSettingsValue>
              )
            }
          >
            <SiteVariablesSettings />
          </SiteSettingsItem>
        </SiteSettingsList>
      </SiteSettingsGroup>

      <SiteSettingsGroup icon={ViewIcon} title={t("previews")}>
        <SiteSettingsList>
          <SiteSettingsItem
            {...row("previewAccess")}
            description={t("previewsEnabledHint")}
            icon={ViewIcon}
            title={t("previewBuilds")}
            value={
              <SiteSettingsValue>
                {tPreview(`trigger.${previewMode}`)}
              </SiteSettingsValue>
            }
          >
            <div className="max-w-xl">
              <SitePreviewAccessForm onDone={closeRow("previewAccess")} />
            </div>
          </SiteSettingsItem>
          <SiteSettingsToggle
            description={t("previewCommentsHint")}
            field="previewCommentsEnabled"
            icon={Comment01Icon}
            title={t("previewComments")}
          />
        </SiteSettingsList>
      </SiteSettingsGroup>

      <SiteSettingsGroup icon={Analytics01Icon} title={t("visitors")}>
        <SiteSettingsList>
          <SiteAnalyticsToggle />
          <SiteSettingsToggle
            description={tPage("brandingHint")}
            field="showBranding"
            icon={SparklesIcon}
            title={tPage("brandingLabel")}
          />
        </SiteSettingsList>
      </SiteSettingsGroup>

      <SiteSettingsDangerZone
        organizationId={organizationId}
        organizationSlug={organizationSlug}
        site={site}
        siteId={siteId}
      />
    </div>
  );
}

function RepositoryPanel() {
  const t = useTranslations("sites.settings");
  const { organizationId, organizationSlug, siteId, detail } = useSite();
  const { repository } = detail.site;
  const [installing, setInstalling] = useState(false);
  const manageAccess = async () => {
    setInstalling(true);
    const result = await startGitHubInstall({
      organizationId,
      callbackPath: siteHref(organizationSlug, siteId, "settings"),
    });
    if (!result.started) {
      setInstalling(false);
      toast.error(
        result.reason === "install-start-failed" && result.message
          ? result.message
          : t("manageGitHubFailed")
      );
    }
  };
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-muted-foreground max-w-md text-sm text-pretty">
        {t("repositoryChangeHint")}
      </p>
      <div className="flex items-center gap-2">
        {repository ? (
          <a
            className={buttonVariants({ size: "sm", variant: "ghost" })}
            href={githubRepositoryUrl(repository)}
            rel="noopener noreferrer"
            target="_blank"
          >
            {t("openOnGitHub")}
            <HugeiconsIcon
              aria-hidden="true"
              data-icon="inline-end"
              icon={ArrowUpRight01Icon}
            />
          </a>
        ) : null}
        <Button
          loading={installing}
          onClick={manageAccess}
          size="sm"
          type="button"
          variant="outline"
        >
          <HugeiconsIcon
            aria-hidden="true"
            data-icon="inline-start"
            icon={GithubIcon}
          />
          {t("manageGitHub")}
        </Button>
      </div>
    </div>
  );
}

function BranchField({ value, onChange }: SiteBranchFieldProps) {
  const t = useTranslations("sites.settings");
  const tNew = useTranslations("sites.new");
  const { organizationId, siteId } = useSite();
  const id = useId();
  const suggestions = useRepositorySuggestions({
    organizationId,
    siteId,
    branch: value.trim(),
  });
  return (
    <Field>
      <FieldLabel htmlFor={id}>{tNew("branch")}</FieldLabel>
      <SiteSuggestInput
        emptyLabel={tNew("noBranchMatch")}
        icon={GitBranchIcon}
        id={id}
        onValueChange={onChange}
        suggestions={suggestions.branches}
        value={value}
      />
      <SiteSettingsHint>{t("branchFieldHint")}</SiteSettingsHint>
    </Field>
  );
}

function RootDirectoryField({
  value,
  branch,
  onChange,
}: SiteRootDirectoryFieldProps) {
  const t = useTranslations("sites.settings");
  const tNew = useTranslations("sites.new");
  const { organizationId, siteId } = useSite();
  const id = useId();
  const suggestions = useRepositorySuggestions({
    organizationId,
    siteId,
    branch: branch.trim(),
  });
  return (
    <Field>
      <FieldLabel htmlFor={id}>
        {t("rootDirectory")}
        <Badge size="sm" variant="outline">
          {t("optional")}
        </Badge>
      </FieldLabel>
      <SiteSuggestInput
        emptyLabel={tNew("noDirectoryMatch")}
        icon={Folder01Icon}
        id={id}
        onValueChange={onChange}
        placeholder={t("rootDirectoryPlaceholder")}
        suggestions={suggestions.configDirectories.filter(Boolean)}
        value={value}
      />
      <SiteSettingsHint>{t("rootDirectoryFieldHint")}</SiteSettingsHint>
    </Field>
  );
}

function SiteNameField() {
  const tNew = useTranslations("sites.new");
  const tCommon = useTranslations("common");
  const { site } = useSite().detail;
  const [draft, setDraft] = useState(site.name);
  const save = useUpdateSiteSettings();
  const next = draft.trim();
  const dirty = next.length > 0 && next !== site.name;
  return (
    <form
      className="w-full sm:w-64 sm:shrink-0"
      onSubmit={(event) => {
        event.preventDefault();
        if (dirty && !save.isPending) {
          save.mutate({ name: next });
        }
      }}
    >
      <InputGroup>
        <InputGroupInput
          aria-label={tNew("name")}
          readOnly={save.isPending}
          maxLength={SITE_NAME_MAX_LENGTH}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setDraft(site.name);
            }
          }}
          value={draft}
        />
        {dirty || save.isPending ? (
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              loading={save.isPending}
              onClick={() => {
                if (!save.isPending) {
                  save.mutate({ name: next });
                }
              }}
              variant="secondary"
            >
              {tCommon("actions.save")}
            </InputGroupButton>
          </InputGroupAddon>
        ) : null}
      </InputGroup>
    </form>
  );
}

function SiteSectionField({
  title,
  enabled,
  path,
  onEnabledChange,
  onPathChange,
}: SiteSectionFieldProps) {
  const tSections = useTranslations("sites.sections");
  const id = useId();
  return (
    <Field>
      <div className="flex items-center gap-2.5">
        <Switch
          checked={enabled}
          id={`${id}-enabled`}
          onCheckedChange={onEnabledChange}
          size="sm"
        />
        <FieldLabel htmlFor={`${id}-enabled`}>{title}</FieldLabel>
      </div>
      <Input
        aria-label={tSections("pathLabel", { section: title })}
        disabled={!enabled}
        onChange={(event) => onPathChange(event.target.value)}
        placeholder="/"
        value={path}
      />
    </Field>
  );
}

function PublishModeSelect() {
  const tNew = useTranslations("sites.new");
  const { site } = useSite().detail;
  const options = useSitePublishModeOptions();
  const save = useUpdateSiteSettings();
  const value =
    save.isPending && save.variables.publishMode
      ? save.variables.publishMode
      : site.publishMode;
  return (
    <Select
      disabled={save.isPending}
      onValueChange={(next: SitePublishMode | null) => {
        if (next && next !== site.publishMode) {
          save.mutate({ publishMode: next });
        }
      }}
      value={value}
    >
      <SelectTrigger aria-label={tNew("publishMode")} className="shrink-0">
        <SelectValue>
          {(current: SitePublishMode) =>
            options.find((option) => option.value === current)?.title
          }
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="end" alignItemWithTrigger={false} className="w-72">
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            <span className="flex flex-col">
              <span>{option.title}</span>
              <span className="text-muted-foreground text-xs">
                {option.description}
              </span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function SiteSettingsToggle({
  field,
  icon,
  title,
  description,
}: SiteSettingsToggleProps) {
  const { site } = useSite().detail;
  const save = useUpdateSiteSettings();
  const pending = save.isPending ? save.variables?.[field] : undefined;
  return (
    <SiteSettingsSwitchItem
      checked={pending ?? site[field]}
      description={description}
      disabled={save.isPending}
      icon={icon}
      onCheckedChange={(checked) => save.mutate({ [field]: checked })}
      title={title}
    />
  );
}

function SiteAnalyticsToggle() {
  const t = useTranslations("sites.settings");
  const { organizationId, siteId, detail } = useSite();
  const invalidateSites = useInvalidateSites();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const analyticsOn = detail.site.analyticsEnabled;
  const mutation = useMutation({
    mutationFn: (analyticsEnabled: boolean) =>
      dashboardOrpc.sites.update.call({
        organizationId,
        siteId,
        analyticsEnabled,
      }),
    onSuccess: async (_result, next) => {
      toast.success(next ? t("analytics.enabled") : t("analytics.done"));
      setConfirmOpen(false);
      await invalidateSites();
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, t("analytics.failed")));
    },
  });
  return (
    <>
      <SiteSettingsSwitchItem
        checked={analyticsOn}
        description={t("analyticsHint")}
        disabled={mutation.isPending}
        icon={Analytics01Icon}
        onCheckedChange={() => setConfirmOpen(true)}
        title={t("analyticsLabel")}
      />
      <ConfirmDialog
        confirmLabel={
          analyticsOn ? t("analytics.action") : t("analytics.enable")
        }
        description={
          analyticsOn
            ? t("analytics.confirmDescription")
            : t("analytics.enableConfirmDescription")
        }
        variant={analyticsOn ? "destructive" : "default"}
        onConfirm={() => mutation.mutate(!analyticsOn)}
        onOpenChange={setConfirmOpen}
        open={confirmOpen}
        pending={mutation.isPending}
        title={
          analyticsOn
            ? t("analytics.confirmTitle")
            : t("analytics.enableConfirmTitle")
        }
      />
    </>
  );
}
