"use client";

import {
  InformationCircleIcon,
  PlusSignIcon,
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
import { Input } from "@notra/ui/components/ui/input";
import { Label } from "@notra/ui/components/ui/label";
import { useMutation } from "@tanstack/react-query";
import { useId, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import { useSite } from "@/components/sites/site-context";
import { SitePreviewAccessControl } from "@/components/sites/site-preview-access-control";
import { useInvalidateSites } from "@/lib/hooks/use-sites";
import { dashboardOrpc } from "@/lib/orpc/query";
import type { SitePreviewBranchDialogProps } from "@/types/components/sites";
import { toErrorMessage } from "@/utils/error-message";

function PreviewBranchDialog({
  organizationId,
  siteId,
  open,
  onOpenChange,
}: SitePreviewBranchDialogProps) {
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

export function SiteDeploymentPreviewControls() {
  const { organizationId, siteId, detail } = useSite();
  const t = useTranslations("sites.previewsPage");
  const [branchDialogOpen, setBranchDialogOpen] = useState(false);
  const { site } = detail;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <SitePreviewAccessControl />
        <Button
          disabled={!site.previewsEnabled || site.status === "suspended"}
          onClick={() => setBranchDialogOpen(true)}
        >
          <HugeiconsIcon icon={PlusSignIcon} size={16} />
          {t("branchTitle")}
        </Button>
      </div>

      {site.previewsEnabled ? null : (
        <p className="text-muted-foreground flex flex-wrap items-center gap-x-1.5 text-sm">
          <HugeiconsIcon
            aria-hidden="true"
            className="size-4 shrink-0"
            icon={InformationCircleIcon}
            strokeWidth={1.5}
          />
          {t("disabled")}
        </p>
      )}

      <PreviewBranchDialog
        onOpenChange={setBranchDialogOpen}
        open={branchDialogOpen}
        organizationId={organizationId}
        siteId={siteId}
      />
    </>
  );
}
