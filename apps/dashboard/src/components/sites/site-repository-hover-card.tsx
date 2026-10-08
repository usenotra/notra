"use client";

import {
  ArrowUpRight01Icon,
  GitBranchIcon,
  GitCommitIcon,
  Github01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  DetailCardContent,
  DetailCardRow,
} from "@notra/ui/components/ui/detail-card";
import {
  HoverCard,
  HoverCardTrigger,
} from "@notra/ui/components/ui/hover-card";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useState } from "react";
import { useLocale, useTranslations } from "use-intl";

import { SiteRelativeTime } from "@/components/sites/site-relative-time";
import { SITE_REPOSITORY_SKELETON_ROWS } from "@/constants/sites";
import { useSiteRepositoryOverview } from "@/lib/hooks/use-sites";
import type { SiteRepositoryHoverCardProps } from "@/types/components/sites";
import { shortSha } from "@/utils/site-deployments";

function RepositoryDetails({
  query,
}: {
  query: ReturnType<typeof useSiteRepositoryOverview>;
}) {
  const t = useTranslations("sites.repositoryCard");
  const locale = useLocale();
  const overview = query.data;
  const count = (value: number) => value.toLocaleString(locale);

  if (query.isPending) {
    return (
      <div className="flex flex-col gap-2 px-3 py-2">
        {Array.from({ length: SITE_REPOSITORY_SKELETON_ROWS }, (_, index) => (
          <Skeleton className="h-3.5 w-full" key={index} />
        ))}
      </div>
    );
  }
  if (!overview) {
    return (
      <p className="text-muted-foreground px-3 py-2 text-xs">
        {t("unavailable")}
      </p>
    );
  }
  const commit = overview.latestCommit;
  return (
    <div className="flex flex-col">
      {overview.description ? (
        <p className="text-muted-foreground border-border border-b px-3 pt-1.5 pb-2.5 text-xs text-pretty">
          {overview.description}
        </p>
      ) : null}
      <dl className="m-0 py-0.5">
        {overview.language ? (
          <DetailCardRow label={t("language")}>
            {overview.language}
          </DetailCardRow>
        ) : null}
        <DetailCardRow label={t("stars")}>
          {count(overview.stars)}
        </DetailCardRow>
        <DetailCardRow label={t("forks")}>
          {count(overview.forks)}
        </DetailCardRow>
        <DetailCardRow label={t("openIssues")}>
          {count(overview.openIssues)}
        </DetailCardRow>
        <DetailCardRow label={t("defaultBranch")}>
          <span className="font-mono">{overview.defaultBranch}</span>
        </DetailCardRow>
        {overview.pushedAt ? (
          <DetailCardRow label={t("lastPush")}>
            <SiteRelativeTime date={overview.pushedAt} />
          </DetailCardRow>
        ) : null}
      </dl>
      {commit ? (
        <div className="border-border flex min-w-0 flex-col gap-0.5 border-t px-3 py-2">
          <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <HugeiconsIcon
              aria-hidden="true"
              className="shrink-0"
              icon={GitCommitIcon}
              size={12}
            />
            <span className="font-mono">{shortSha(commit.sha)}</span>
            {commit.authorName ? <span>· {commit.authorName}</span> : null}
            {commit.committedAt ? (
              <>
                <span>·</span>
                <SiteRelativeTime date={commit.committedAt} inline />
              </>
            ) : null}
          </span>
          <span className="truncate text-xs font-medium">{commit.message}</span>
        </div>
      ) : null}
      <a
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring border-border flex items-center gap-1 rounded-b-[14px] border-t px-3 py-2 text-xs outline-none focus-visible:ring-2"
        href={overview.htmlUrl}
        onClick={(event) => event.stopPropagation()}
        rel="noopener noreferrer"
        target="_blank"
      >
        {t("openOnGithub")}
        <HugeiconsIcon aria-hidden="true" icon={ArrowUpRight01Icon} size={12} />
      </a>
    </div>
  );
}

/**
 * Repository cell of the sites table. Hovering shows the repository's GitHub
 * details, fetched only once the card opens.
 */
export function SiteRepositoryHoverCard({
  organizationId,
  siteId,
  owner,
  name,
  branch,
}: SiteRepositoryHoverCardProps) {
  const t = useTranslations("sites.repositoryCard");
  const [open, setOpen] = useState(false);
  const query = useSiteRepositoryOverview(organizationId, siteId, open);
  let visibility: string | undefined;
  if (query.data) {
    visibility = query.data.isPrivate ? t("private") : t("public");
  }
  return (
    <HoverCard onOpenChange={setOpen} open={open}>
      <HoverCardTrigger
        render={
          <span className="flex w-fit max-w-full min-w-0 cursor-default flex-col gap-0.5" />
        }
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <HugeiconsIcon
            aria-hidden="true"
            className="text-muted-foreground shrink-0"
            icon={Github01Icon}
            size={14}
          />
          <span className="truncate">
            {owner}/{name}
          </span>
        </span>
        <span className="text-muted-foreground flex min-w-0 items-center gap-1.5 text-xs">
          <HugeiconsIcon
            aria-hidden="true"
            className="shrink-0"
            icon={GitBranchIcon}
            size={12}
          />
          <span className="truncate font-mono">{branch}</span>
        </span>
      </HoverCardTrigger>
      <DetailCardContent
        aside={visibility}
        icon={
          <HugeiconsIcon aria-hidden="true" icon={Github01Icon} size={14} />
        }
        title={name}
      >
        <RepositoryDetails query={query} />
      </DetailCardContent>
    </HoverCard>
  );
}
