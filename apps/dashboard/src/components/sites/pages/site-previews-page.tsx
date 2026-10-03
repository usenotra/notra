"use client";

import {
  GitBranchIcon,
  GitPullRequestIcon,
  Globe02Icon,
  InformationCircleIcon,
  PlusSignIcon,
  SquareLock02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@notra/ui/components/shared/responsive-dialog";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@notra/ui/components/ui/empty";
import { Input } from "@notra/ui/components/ui/input";
import { Label } from "@notra/ui/components/ui/label";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useId, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/button";
import { PageHeader } from "@/components/layout/page-header";
import { useSite } from "@/components/sites/site-context";
import { SitePreviewsTable } from "@/components/sites/site-previews-table";
import { SITE_SHARE_LINK_DAYS } from "@/constants/sites";
import { useInvalidateSites } from "@/lib/hooks/use-sites";
import { dashboardOrpc } from "@/lib/orpc/query";
import type { SiteScope } from "@/types/sites";
import { toErrorMessage } from "@/utils/error-message";
import { siteHref } from "@/utils/site-links";
import { sitePreviewRows } from "@/utils/site-previews";

function PreviewBranchDialog({
  organizationId,
  siteId,
  open,
  onOpenChange,
}: SiteScope & { open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useTranslations("sites.previewsPage");
  const tCommon = useTranslations("common");
  const id = useId();
  const invalidateSites = useInvalidateSites();
  const [branch, setBranch] = useState("");
  const trimmedBranch = branch.trim();

  const createMutation = useMutation({
    mutationFn: (name: string) =>
      dashboardOrpc.sites.previews.createForBranch.call({
        organizationId,
        siteId,
        branch: name,
      }),
    onSuccess: async (result) => {
      toast.success(t("created", { key: result.previewKey }));
      setBranch("");
      onOpenChange(false);
      await invalidateSites();
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, t("createFailed")));
    },
  });

  return (
    <ResponsiveDialog onOpenChange={onOpenChange} open={open}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{t("branchTitle")}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {t("branchDescription")}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <form
          className="space-y-2"
          id={`${id}-form`}
          onSubmit={(event) => {
            event.preventDefault();
            if (trimmedBranch && !createMutation.isPending) {
              createMutation.mutate(trimmedBranch);
            }
          }}
        >
          <Label htmlFor={`${id}-branch`}>{t("branchLabel")}</Label>
          <Input
            autoComplete="off"
            autoFocus
            id={`${id}-branch`}
            onChange={(event) => setBranch(event.target.value)}
            placeholder={t("branchPlaceholder")}
            spellCheck={false}
            value={branch}
          />
        </form>
        <ResponsiveDialogFooter>
          <Button
            disabled={createMutation.isPending}
            onClick={() => onOpenChange(false)}
            type="button"
            variant="outline"
          >
            {tCommon("actions.cancel")}
          </Button>
          <Button
            disabled={!trimmedBranch}
            form={`${id}-form`}
            loading={createMutation.isPending}
            type="submit"
          >
            {t("createPreview")}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

export function SitePreviewsPage() {
  const { organizationId, organizationSlug, siteId, detail } = useSite();
  const t = useTranslations("sites.previewsPage");
  const [branchDialogOpen, setBranchDialogOpen] = useState(false);
  const { site } = detail;
  const rows = sitePreviewRows(detail);
  const settingsHref = siteHref(organizationSlug, siteId, "settings");
  const isProtected = site.previewVisibility === "protected";

  return (
    <>
      <PageHeader
        description={
          <>
            {t("description")}{" "}
            <Link
              className="text-foreground decoration-foreground/25 hover:decoration-foreground inline-flex items-center gap-1 align-bottom font-medium underline underline-offset-4 transition-colors"
              href={settingsHref}
            >
              <HugeiconsIcon
                aria-hidden="true"
                className="size-3.5"
                icon={isProtected ? SquareLock02Icon : Globe02Icon}
                strokeWidth={1.5}
              />
              {isProtected
                ? t("accessProtected", { days: SITE_SHARE_LINK_DAYS })
                : t("accessPublic")}
            </Link>
          </>
        }
        title={t("title")}
      >
        <Button
          disabled={!site.previewsEnabled}
          onClick={() => setBranchDialogOpen(true)}
        >
          <HugeiconsIcon icon={PlusSignIcon} size={16} />
          {t("branchTitle")}
        </Button>
      </PageHeader>

      {site.previewsEnabled ? null : (
        <p className="text-muted-foreground flex flex-wrap items-center gap-x-1.5 text-sm">
          <HugeiconsIcon
            aria-hidden="true"
            className="size-4 shrink-0"
            icon={InformationCircleIcon}
            strokeWidth={1.5}
          />
          {t("disabled")}
          <Link
            className="text-foreground decoration-foreground/25 hover:decoration-foreground font-medium underline underline-offset-4 transition-colors duration-150"
            href={settingsHref}
          >
            {t("turnOn")}
          </Link>
        </p>
      )}

      <SitePreviewsTable
        emptyState={
          <div className="text-foreground w-full">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <HugeiconsIcon icon={GitPullRequestIcon} strokeWidth={1.5} />
                </EmptyMedia>
                <EmptyTitle>{t("emptyTitle")}</EmptyTitle>
                <EmptyDescription>{t("emptyDescription")}</EmptyDescription>
              </EmptyHeader>
              {site.previewsEnabled ? (
                <EmptyContent>
                  <Button
                    onClick={() => setBranchDialogOpen(true)}
                    size="sm"
                    variant="outline"
                  >
                    <HugeiconsIcon
                      icon={GitBranchIcon}
                      size={14}
                      strokeWidth={1.5}
                    />
                    {t("branchTitle")}
                  </Button>
                </EmptyContent>
              ) : null}
            </Empty>
          </div>
        }
        organizationId={organizationId}
        organizationSlug={organizationSlug}
        repository={site.repository}
        rows={rows}
        siteId={siteId}
      />

      <PreviewBranchDialog
        onOpenChange={setBranchDialogOpen}
        open={branchDialogOpen}
        organizationId={organizationId}
        siteId={siteId}
      />
    </>
  );
}
