"use client";

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@notra/ui/components/shared/responsive-dialog";
import { Input } from "@notra/ui/components/ui/input";
import { Label } from "@notra/ui/components/ui/label";
import { Switch } from "@notra/ui/components/ui/switch";
import { TitleCard } from "@notra/ui/components/ui/title-card";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/button";
import { PageHeader } from "@/components/layout/page-header";
import { useSite } from "@/components/sites/site-context";
import { SiteDeleteDialog } from "@/components/sites/site-delete-dialog";
import {
  SiteChoiceGroup,
  SiteSectionsFields,
} from "@/components/sites/site-form-fields";
import {
  useSitePreviewVisibilityOptions,
  useSitePublishModeOptions,
} from "@/lib/hooks/use-site-choice-options";
import { useInvalidateSites } from "@/lib/hooks/use-sites";
import { dashboardOrpc } from "@/lib/orpc/query";
import { cn } from "@/lib/utils";
import type {
  SiteDetail,
  SiteSettingsForm as SiteSettingsFormValues,
} from "@/types/sites";
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
}: {
  organizationId: string;
  organizationSlug: string;
  siteId: string;
  detail: SiteDetail;
}) {
  const t = useTranslations("sites.settings");
  const tPage = useTranslations("sites.settingsPage");
  const tNew = useTranslations("sites.new");
  const tCommon = useTranslations("common");
  const id = useId();
  const invalidateSites = useInvalidateSites();
  const visibilityOptions = useSitePreviewVisibilityOptions();
  const publishModeOptions = useSitePublishModeOptions();
  const { site } = detail;
  const [form, setForm] = useState<SiteSettingsFormValues>(() =>
    siteSettingsFormFromSite(site)
  );
  const [offlineOpen, setOfflineOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const patch = siteSettingsPatch(form, site);
  const dirty = Object.keys(patch).length > 0;
  const valid =
    form.name.trim().length > 0 &&
    form.productionBranch.trim().length > 0 &&
    (form.blogEnabled || form.changelogEnabled);
  const suspended = site.status === "suspended";

  const update = <K extends keyof SiteSettingsFormValues>(
    key: K,
    value: SiteSettingsFormValues[K]
  ) => setForm((current) => ({ ...current, [key]: value }));

  const saveMutation = useMutation({
    mutationFn: () =>
      dashboardOrpc.sites.update.call({ organizationId, siteId, ...patch }),
    onSuccess: async (result) => {
      setForm(siteSettingsFormFromSite(result.site));
      if (result.rebuilding) {
        toast.success(t("savedRebuilding"));
      } else {
        toast.success(t("saved"));
      }
      await invalidateSites();
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, t("saveFailed")));
    },
  });

  const suspendMutation = useMutation({
    mutationFn: (next: boolean) =>
      dashboardOrpc.sites.setSuspended.call({
        organizationId,
        siteId,
        suspended: next,
      }),
    onSuccess: async (_result, next) => {
      toast.success(next ? t("offline.done") : t("offline.restored"));
      setOfflineOpen(false);
      await invalidateSites();
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, t("offline.failed")));
    },
  });

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader description={tPage("description")} title={tPage("title")} />
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
          <div className="grid gap-4 py-1 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor={`${id}-name`}>{tNew("name")}</Label>
              <Input
                id={`${id}-name`}
                maxLength={80}
                onChange={(event) => update("name", event.target.value)}
                value={form.name}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${id}-branch`}>{tNew("branch")}</Label>
              <Input
                aria-describedby={`${id}-branch-hint`}
                id={`${id}-branch`}
                onChange={(event) =>
                  update("productionBranch", event.target.value)
                }
                spellCheck={false}
                value={form.productionBranch}
              />
              <p
                className="text-muted-foreground text-xs"
                id={`${id}-branch-hint`}
              >
                {tNew("branchHint")}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${id}-root`}>{tNew("rootDirectory")}</Label>
              <Input
                aria-describedby={`${id}-root-hint`}
                id={`${id}-root`}
                onChange={(event) =>
                  update("rootDirectory", event.target.value)
                }
                placeholder={tNew("rootDirectoryPlaceholder")}
                spellCheck={false}
                value={form.rootDirectory}
              />
              <p
                className="text-muted-foreground text-xs"
                id={`${id}-root-hint`}
              >
                {tNew("rootDirectoryHint")}
              </p>
            </div>
          </div>
        </TitleCard>

        <TitleCard as="section" heading={t("content")} headingAs="h2">
          <div className="space-y-2 py-1">
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
            <p className="text-muted-foreground text-xs">{t("rebuildHint")}</p>
          </div>
        </TitleCard>

        <TitleCard as="section" heading={t("previews")} headingAs="h2">
          <div className="space-y-4 py-1">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-0.5">
                <label
                  className="text-sm font-medium"
                  htmlFor={`${id}-previews`}
                >
                  {t("previewsEnabled")}
                </label>
                <p className="text-muted-foreground text-xs">
                  {t("previewsEnabledHint")}
                </p>
              </div>
              <Switch
                checked={form.previewsEnabled}
                id={`${id}-previews`}
                onCheckedChange={(value) => update("previewsEnabled", value)}
              />
            </div>
            <SiteChoiceGroup
              disabled={!form.previewsEnabled}
              label={tNew("previewVisibility")}
              onValueChange={(value) => update("previewVisibility", value)}
              options={visibilityOptions}
              value={form.previewVisibility}
            />
          </div>
        </TitleCard>

        <TitleCard as="section" heading={t("publishing")} headingAs="h2">
          <div className="py-1">
            <SiteChoiceGroup
              label={tNew("publishMode")}
              onValueChange={(value) => update("publishMode", value)}
              options={publishModeOptions}
              value={form.publishMode}
            />
          </div>
        </TitleCard>

        {/* Appears only with unsaved changes and stays in reach while scrolling. */}
        {dirty ? (
          <div className="bg-background/90 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-xl border py-2 pr-2 pl-4 shadow-lg backdrop-blur duration-200">
            <p className="text-muted-foreground text-sm">{tPage("unsaved")}</p>
            <div className="flex items-center gap-2">
              <Button
                disabled={saveMutation.isPending}
                onClick={() => setForm(siteSettingsFormFromSite(site))}
                size="sm"
                type="button"
                variant="ghost"
              >
                {tCommon("actions.reset")}
              </Button>
              <Button
                disabled={!valid}
                loading={saveMutation.isPending}
                size="sm"
                type="submit"
              >
                {tCommon("actions.saveChanges")}
              </Button>
            </div>
          </div>
        ) : null}
      </form>

      <TitleCard
        as="section"
        className="border-destructive/50 bg-destructive/5"
        heading={t("dangerZone")}
        headingAs="h2"
      >
        <div className="divide-border divide-y">
          <div className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-1">
            <div className="min-w-0 space-y-0.5">
              <p className="text-sm font-medium">
                {suspended ? t("offline.restoreTitle") : t("offline.title")}
              </p>
              <p className="text-muted-foreground text-xs">
                {suspended
                  ? t("offline.restoreDescription")
                  : t("offline.description")}
              </p>
            </div>
            {suspended ? (
              <Button
                loading={suspendMutation.isPending}
                onClick={() => suspendMutation.mutate(false)}
                type="button"
                variant="outline"
              >
                {t("offline.restore")}
              </Button>
            ) : (
              <Button
                onClick={() => setOfflineOpen(true)}
                type="button"
                variant="outline"
              >
                {t("offline.action")}
              </Button>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 py-3 last:pb-1">
            <div className="min-w-0 space-y-0.5">
              <p className="text-sm font-medium">{t("delete.title")}</p>
              <p className="text-muted-foreground text-xs">
                {t("delete.summary")}
              </p>
            </div>
            <Button
              onClick={() => setDeleteOpen(true)}
              type="button"
              variant="destructive"
            >
              {t("delete.action")}
            </Button>
          </div>
        </div>
      </TitleCard>

      <ResponsiveDialog onOpenChange={setOfflineOpen} open={offlineOpen}>
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>
              {t("offline.confirmTitle")}
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              {t("offline.confirmDescription")}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <ResponsiveDialogFooter>
            <Button
              disabled={suspendMutation.isPending}
              onClick={() => setOfflineOpen(false)}
              type="button"
              variant="outline"
            >
              {tCommon("actions.cancel")}
            </Button>
            <Button
              loading={suspendMutation.isPending}
              onClick={() => suspendMutation.mutate(true)}
              type="button"
              variant="destructive"
            >
              {t("offline.action")}
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
      <SiteDeleteDialog
        onOpenChange={setDeleteOpen}
        open={deleteOpen}
        organizationId={organizationId}
        organizationSlug={organizationSlug}
        siteId={siteId}
        siteName={site.name}
      />
    </div>
  );
}
