"use client";

import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { ResponsiveDialogClose } from "@notra/ui/components/shared/responsive-dialog";
import { useTranslations } from "next-intl";
import Link from "next/link";

import { Button } from "@/components/button";
import type { GitHubPublishDialogFooterProps } from "@/types/content/detail";

export function GitHubPublishDialogFooter({
  hasSelectedRepository,
  isPublishing,
  organizationSlug,
  publishRecovery,
  pullRequest,
  selectedPublishingEnabled,
}: GitHubPublishDialogFooterProps) {
  const t = useTranslations("content.githubPublish");
  const tCommon = useTranslations("common.actions");
  const permissionsUrl =
    publishRecovery?.code === "github_app_permissions_required"
      ? publishRecovery.permissionsUrl
      : undefined;
  const showIntegrationRecovery = Boolean(
    publishRecovery &&
    (publishRecovery.publishingPaused ||
      publishRecovery.code !== "github_app_permissions_required" ||
      !publishRecovery.permissionsUrl)
  );
  const publishingPaused = Boolean(publishRecovery?.publishingPaused);
  let submitLabel = t("createDraftPr");
  if (isPublishing) {
    submitLabel = t("creatingDraftPr");
  } else if (publishRecovery) {
    submitLabel = tCommon("tryAgain");
  }

  return (
    <>
      <ResponsiveDialogClose
        disabled={isPublishing}
        render={<Button variant="outline" />}
      >
        {tCommon("close")}
      </ResponsiveDialogClose>
      {showIntegrationRecovery ? (
        <Button
          nativeButton={false}
          render={
            <Link href={`/${organizationSlug}/integrations/github`}>
              {t("openIntegration")}
            </Link>
          }
        />
      ) : null}
      {permissionsUrl ? (
        <Button
          nativeButton={false}
          render={
            <a href={permissionsUrl} rel="noopener noreferrer" target="_blank">
              {t("reviewOnGitHub")}
              <HugeiconsIcon className="size-4" icon={ArrowUpRight01Icon} />
            </a>
          }
        />
      ) : null}
      {!publishRecovery && pullRequest ? (
        <Button
          nativeButton={false}
          render={
            <a
              href={pullRequest.pullRequestUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              {t("openPullRequest")}
              <HugeiconsIcon className="size-4" icon={ArrowUpRight01Icon} />
            </a>
          }
        />
      ) : null}
      {pullRequest || publishingPaused ? null : (
        <Button
          disabled={
            isPublishing || !hasSelectedRepository || !selectedPublishingEnabled
          }
          type="submit"
        >
          {submitLabel}
        </Button>
      )}
    </>
  );
}
