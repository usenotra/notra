"use client";

import {
  ArrowUpRight01Icon,
  FileAddIcon,
  GitPullRequestIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
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
      <div
        aria-live="polite"
        className="animate-in fade-in space-y-0.5 rounded-xl border px-3.5 py-2.5 text-sm duration-300"
      >
        <p className="flex items-center gap-2">
          <HugeiconsIcon
            aria-hidden="true"
            className="text-success size-4 shrink-0"
            icon={GitPullRequestIcon}
            strokeWidth={1.75}
          />
          <span className="font-medium">{t("opened")}</span>
          <span aria-hidden="true" className="text-muted-foreground">
            ·
          </span>
          <a
            className="text-primary inline-flex items-center gap-0.5 underline-offset-4 hover:underline"
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
        </p>
        <p className="text-muted-foreground pl-6 text-xs text-pretty">
          {t("mergeFirst")}
        </p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-dashed px-3.5 py-2.5 text-sm duration-300">
      <HugeiconsIcon
        aria-hidden="true"
        className="text-muted-foreground size-4 shrink-0"
        icon={FileAddIcon}
        strokeWidth={1.75}
      />
      <p className="text-muted-foreground min-w-0 flex-1 text-pretty">
        {t("missing")}
      </p>
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
  );
}
