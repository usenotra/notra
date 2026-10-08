"use client";

import {
  ArrowUpRight01Icon,
  FileAddIcon,
  GitPullRequestIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@notra/ui/components/ui/alert";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import {
  useCreateSiteStarter,
  useSiteStarterStatus,
} from "@/lib/hooks/use-site-starter";
import type { SiteCreateStarterProps } from "@/types/components/sites";

export function SiteCreateStarter({
  organizationId,
  repositoryId,
  branch,
  rootDirectory,
  pullRequestUrl,
  onPullRequestOpened,
}: SiteCreateStarterProps) {
  const t = useTranslations("sites.new.starter");
  const scope = { organizationId, repositoryId, branch, rootDirectory };
  const status = useSiteStarterStatus(scope);
  const createStarter = useCreateSiteStarter();
  const openUrl = pullRequestUrl ?? status.data?.pullRequestUrl ?? null;

  if (!status.data || status.data.hasConfig) {
    return null;
  }

  if (openUrl) {
    return (
      <Alert role="status">
        <HugeiconsIcon
          aria-hidden="true"
          icon={GitPullRequestIcon}
          strokeWidth={1.75}
        />
        <AlertTitle>{t("opened")}</AlertTitle>
        <AlertDescription>
          {t("optional")}{" "}
          <a
            className="inline-flex items-center gap-0.5"
            href={openUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            {t("view")}
            <HugeiconsIcon
              aria-hidden="true"
              className="size-3.5"
              icon={ArrowUpRight01Icon}
            />
          </a>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert role="status">
      <HugeiconsIcon aria-hidden="true" icon={FileAddIcon} strokeWidth={1.75} />
      <AlertDescription>{t("missing")}</AlertDescription>
      <div className="col-start-2 pt-2">
        <Button
          loading={createStarter.isPending}
          onClick={() =>
            createStarter.mutate(scope, {
              onSuccess: (result) => onPullRequestOpened(result.pullRequestUrl),
            })
          }
          size="sm"
          type="button"
          variant="outline"
        >
          {t("create")}
        </Button>
      </div>
    </Alert>
  );
}
