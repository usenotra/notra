"use client";

import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { ResponsiveDialogClose } from "@notra/ui/components/shared/responsive-dialog";
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
  let submitLabel = "Create draft PR";
  if (isPublishing) {
    submitLabel = "Creating draft PR…";
  } else if (publishRecovery) {
    submitLabel = "Try again";
  }

  return (
    <>
      <ResponsiveDialogClose
        disabled={isPublishing}
        render={<Button variant="outline" />}
      >
        Close
      </ResponsiveDialogClose>
      {showIntegrationRecovery ? (
        <Button
          nativeButton={false}
          render={
            <Link href={`/${organizationSlug}/integrations/github`}>
              Open GitHub integration
            </Link>
          }
        />
      ) : null}
      {permissionsUrl ? (
        <Button
          nativeButton={false}
          render={
            <a href={permissionsUrl} rel="noopener noreferrer" target="_blank">
              Review on GitHub
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
              Open pull request
              <HugeiconsIcon className="size-4" icon={ArrowUpRight01Icon} />
            </a>
          }
        />
      ) : null}
      {pullRequest ? null : (
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
