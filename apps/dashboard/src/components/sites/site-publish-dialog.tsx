"use client";

import { GitCommitIcon, GitPullRequestIcon } from "@hugeicons/core-free-icons";
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
import { SitePublishChange } from "@/components/sites/editor/site-publish-change";
import { SiteChoiceGroup } from "@/components/sites/site-form-fields";
import { SITE_PUBLISH_MESSAGE_MAX_LENGTH } from "@/constants/site-publish";
import { dashboardOrpc } from "@/lib/orpc/query";
import type { SitePublishDialogProps } from "@/types/components/sites";
import type { SitePublishMode } from "@/types/sites";
import { toErrorMessage } from "@/utils/error-message";
import { publishConflictPaths, siteDraftChange } from "@/utils/site-editor";

export function SitePublishDialog({
  organizationId,
  siteId,
  open,
  onOpenChange,
  site,
  draftCount,
  drafts,
  sourcePaths,
  onPublished,
  onConflict,
  unsaved = false,
  pullRequestOnly = false,
  initialMessage = "",
}: SitePublishDialogProps) {
  const t = useTranslations("sites.publish");
  const tModes = useTranslations("sites.publishModes");
  const tCommon = useTranslations("common");
  const tChanges = useTranslations("sites.editorPage.publishDialog");
  const id = useId();
  const directAllowed = !pullRequestOnly && site.publishMode === "direct";
  const [message, setMessage] = useState(initialMessage);
  const [mode, setMode] = useState<SitePublishMode>(
    directAllowed ? "direct" : "pull_request"
  );
  const effectiveMode = directAllowed ? mode : "pull_request";
  const trimmed = message.trim();
  const canPublish = trimmed.length > 0 && draftCount > 0 && !unsaved;

  const publishMutation = useMutation({
    mutationFn: () =>
      dashboardOrpc.sites.editor.publish.call({
        organizationId,
        siteId,
        message: trimmed,
        mode: effectiveMode,
      }),
    onSuccess: (result) => {
      setMessage("");
      onOpenChange(false);
      onPublished();
      const pullRequestUrl = result.pullRequestUrl;
      if (result.mode === "pull_request" && pullRequestUrl) {
        toast.success(t("pullRequestOpened"), {
          action: {
            label: t("viewPullRequest"),
            onClick: () =>
              window.open(pullRequestUrl, "_blank", "noopener,noreferrer"),
          },
        });
        return;
      }
      toast.success(t("committed"));
    },
    onError: (error) => {
      const paths = publishConflictPaths(error);
      if (paths && paths.length > 0) {
        onOpenChange(false);
        onConflict(paths);
        return;
      }
      toast.error(toErrorMessage(error, t("failed")));
    },
  });

  return (
    <ResponsiveDialog
      onOpenChange={(next) => {
        if (!publishMutation.isPending) {
          onOpenChange(next);
        }
      }}
      open={open}
    >
      <ResponsiveDialogContent className="flex max-h-[85svh] flex-col overflow-hidden sm:max-w-2xl">
        <ResponsiveDialogHeader className="shrink-0">
          <ResponsiveDialogTitle>
            {pullRequestOnly ? t("openPullRequest") : t("title")}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {t(
              pullRequestOnly ? "pullRequestReviewDescription" : "description",
              {
                count: draftCount,
              }
            )}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <form
          className="min-h-0 min-w-0 space-y-4 overflow-y-auto"
          id={`${id}-form`}
          onSubmit={(event) => {
            event.preventDefault();
            if (canPublish && !publishMutation.isPending) {
              publishMutation.mutate();
            }
          }}
        >
          {drafts.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">{tChanges("changes")}</p>
              <div className="divide-border max-h-[45dvh] divide-y overflow-y-auto overscroll-contain rounded-lg border">
                {drafts.map((draft, index) => (
                  <SitePublishChange
                    change={siteDraftChange(draft, sourcePaths)}
                    defaultOpen={index === 0}
                    key={draft.path}
                    organizationId={organizationId}
                    path={draft.path}
                    siteId={siteId}
                  />
                ))}
              </div>
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor={`${id}-message`}>{t("message")}</Label>
            <Input
              autoComplete="off"
              id={`${id}-message`}
              maxLength={SITE_PUBLISH_MESSAGE_MAX_LENGTH}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={t("messagePlaceholder")}
              value={message}
            />
          </div>
          {pullRequestOnly ? (
            <p className="text-muted-foreground text-sm">
              {t("pullRequestDescription", { branch: site.productionBranch })}
            </p>
          ) : (
            <SiteChoiceGroup
              label={t("mode")}
              onValueChange={setMode}
              options={[
                {
                  value: "pull_request",
                  title: tModes("pull_request.title"),
                  description: t("pullRequestDescription", {
                    branch: site.productionBranch,
                  }),
                },
                {
                  value: "direct",
                  title: tModes("direct.title"),
                  description: directAllowed
                    ? t("directDescription", { branch: site.productionBranch })
                    : t("directDisabled"),
                  disabled: !directAllowed,
                },
              ]}
              value={effectiveMode}
            />
          )}
        </form>
        <ResponsiveDialogFooter className="shrink-0">
          <Button
            disabled={publishMutation.isPending}
            onClick={() => onOpenChange(false)}
            variant="outline"
          >
            {tCommon("actions.cancel")}
          </Button>
          <Button
            disabled={!canPublish}
            form={`${id}-form`}
            loading={publishMutation.isPending}
            type="submit"
          >
            <HugeiconsIcon
              aria-hidden="true"
              data-icon="inline-start"
              icon={
                effectiveMode === "pull_request"
                  ? GitPullRequestIcon
                  : GitCommitIcon
              }
              strokeWidth={1.5}
            />
            {effectiveMode === "pull_request"
              ? t("openPullRequest")
              : t("commit")}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
