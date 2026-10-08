"use client";

import {
  ArrowUpRight01Icon,
  FileAddIcon,
  GithubIcon,
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
import { SITE_CONFIG_DOCS_URL } from "@/constants/site-create";
import {
  useCreateSiteStarter,
  useSiteStarterStatus,
} from "@/lib/hooks/use-site-starter";
import type { SiteCreateStarterProps } from "@/types/components/sites";
import { parseGithubPullRequestUrl } from "@/utils/site-links";

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
    const pullRequest = parseGithubPullRequestUrl(openUrl);
    return (
      <Alert role="status">
        <HugeiconsIcon
          aria-hidden="true"
          icon={GitPullRequestIcon}
          strokeWidth={1.75}
        />
        <AlertTitle>{t("opened")}</AlertTitle>
        <AlertDescription>{t("optional")}</AlertDescription>
        <div className="col-start-2 pt-2">
          <a
            aria-label={t("view")}
            className="border-border text-muted-foreground hover:bg-muted hover:text-foreground inline-flex max-w-full items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors"
            href={openUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            <HugeiconsIcon
              aria-hidden="true"
              className="size-3.5 shrink-0"
              icon={GithubIcon}
            />
            {pullRequest ? (
              <>
                <span className="text-foreground truncate">
                  {pullRequest.owner}/{pullRequest.repo}
                </span>
                <span className="shrink-0 tabular-nums">
                  #{pullRequest.number}
                </span>
              </>
            ) : (
              <span className="truncate">{t("view")}</span>
            )}
            <HugeiconsIcon
              aria-hidden="true"
              className="size-3.5 shrink-0"
              icon={ArrowUpRight01Icon}
            />
          </a>
        </div>
      </Alert>
    );
  }

  return (
    <Alert role="status">
      <HugeiconsIcon aria-hidden="true" icon={FileAddIcon} strokeWidth={1.75} />
      <AlertTitle>{t("missingTitle")}</AlertTitle>
      <AlertDescription>
        {t("missing")}{" "}
        <a
          className="inline-flex items-center gap-0.5"
          href={SITE_CONFIG_DOCS_URL}
          rel="noopener noreferrer"
          target="_blank"
        >
          {t("why")}
          <HugeiconsIcon
            aria-hidden="true"
            className="size-3.5"
            icon={ArrowUpRight01Icon}
          />
        </a>
      </AlertDescription>
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
