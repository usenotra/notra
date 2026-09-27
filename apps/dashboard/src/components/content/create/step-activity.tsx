"use client";

import {
  Add01Icon,
  ArrowReloadHorizontalIcon,
  Search01Icon,
  Tick01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Input } from "@notra/ui/components/ui/input";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { Github } from "@notra/ui/components/ui/svgs/github";
import { Linear } from "@notra/ui/components/ui/svgs/linear";
import { cn } from "@notra/ui/lib/utils";
import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";

import { Button } from "@/components/button";
import type { ActivityStepProps } from "@/types/content/create";
import type { RepositoryPreview } from "@/types/content/preview";
import { formatEventDate } from "@/utils/content-preview";

import { EventRow } from "./event-row";
import { RepoSection } from "./repo-section";

function filterRepo(repo: RepositoryPreview, query: string): RepositoryPreview {
  if (!query) {
    return repo;
  }
  const q = query.toLowerCase();
  return {
    ...repo,
    commits: repo.commits.filter(
      (c) =>
        c.message.toLowerCase().includes(q) ||
        c.authorName.toLowerCase().includes(q) ||
        (c.authorLogin ?? "").toLowerCase().includes(q) ||
        c.sha.toLowerCase().includes(q)
    ),
    pullRequests: repo.pullRequests.filter(
      (pr) =>
        pr.title.toLowerCase().includes(q) ||
        pr.authorLogin.toLowerCase().includes(q) ||
        String(pr.number).includes(q)
    ),
    releases: repo.releases.filter(
      (r) =>
        (r.name || "").toLowerCase().includes(q) ||
        r.tagName.toLowerCase().includes(q) ||
        r.authorLogin.toLowerCase().includes(q)
    ),
  };
}

export function StepActivity(props: ActivityStepProps) {
  const {
    integrationOptions,
    selectedIntegrationIds,
    onToggleIntegration,
    onToggleAllIntegrations,
    isLoadingIntegrations,
    onConnect,
    repositories,
    preview,
    isLoadingPreview,
    isPreviewError,
    onRetryPreview,
    dataPoints,
    selectedCommitKeys,
    selectedPrKeys,
    selectedReleaseKeys,
    selectedLinearKeys,
    onToggleCommit,
    onTogglePr,
    onToggleRelease,
    onToggleLinear,
    searchQuery,
    onSearchQueryChange,
  } = props;
  const t = useTranslations("content.create.stepActivity");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  const visibleRepos = useMemo(() => {
    return (repositories ?? []).map((r) => filterRepo(r, searchQuery));
  }, [repositories, searchQuery]);

  const visibleLinear = useMemo(() => {
    const list = preview?.linearIntegrations ?? [];
    if (!searchQuery) {
      return list;
    }
    const q = searchQuery.toLowerCase();
    return list.map((li) => ({
      ...li,
      issues: li.issues.filter(
        (issue) =>
          issue.title.toLowerCase().includes(q) ||
          issue.identifier.toLowerCase().includes(q) ||
          (issue.assignee ?? "").toLowerCase().includes(q)
      ),
    }));
  }, [preview?.linearIntegrations, searchQuery]);

  const hasAnyVisible =
    visibleRepos.some(
      (r) =>
        (dataPoints.includeCommits && r.commits.length > 0) ||
        (dataPoints.includePullRequests && r.pullRequests.length > 0) ||
        (dataPoints.includeReleases && r.releases.length > 0)
    ) || visibleLinear.some((li) => li.issues.length > 0);

  const hasSelectedIntegrations = selectedIntegrationIds.length > 0;

  const allSourcesSelected =
    integrationOptions.length > 0 &&
    integrationOptions.every((opt) =>
      selectedIntegrationIds.includes(opt.value)
    );

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">{t("title")}</h2>
        <p className="text-muted-foreground text-sm">{t("description")}</p>
      </div>

      <div className="relative">
        <HugeiconsIcon
          className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
          icon={Search01Icon}
        />
        <Input
          className="pl-9"
          onChange={(e) => onSearchQueryChange(e.target.value)}
          placeholder={t("searchPlaceholder")}
          value={searchQuery}
        />
      </div>

      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1 overflow-x-auto">
          <div className="flex items-center gap-2 pr-1">
            {isLoadingIntegrations && (
              <>
                <Skeleton className="h-8 w-32 shrink-0" />
                <Skeleton className="h-8 w-32 shrink-0" />
              </>
            )}

            {!isLoadingIntegrations && integrationOptions.length === 0 && (
              <span className="text-muted-foreground text-xs">
                {tCommon("labels.noIntegrationsConnectedYet")}
              </span>
            )}

            {!isLoadingIntegrations && integrationOptions.length > 1 && (
              <button
                aria-pressed={allSourcesSelected}
                className={cn(
                  "bg-card hover:border-foreground/20 flex h-8 shrink-0 items-center gap-2 rounded-md border px-2.5 text-xs font-medium transition-colors",
                  allSourcesSelected
                    ? "border-foreground/40 bg-foreground/5"
                    : "border-border"
                )}
                onClick={onToggleAllIntegrations}
                type="button"
              >
                <div
                  className={cn(
                    "flex size-3.5 shrink-0 items-center justify-center rounded-sm border transition-colors",
                    allSourcesSelected
                      ? "border-foreground bg-foreground text-background"
                      : "border-muted-foreground/40"
                  )}
                >
                  {allSourcesSelected && (
                    <HugeiconsIcon
                      className="size-2.5"
                      icon={Tick01Icon}
                      strokeWidth={3}
                    />
                  )}
                </div>
                <span>{tCommon("labels.allSources")}</span>
              </button>
            )}

            {!isLoadingIntegrations &&
              integrationOptions.map((opt) => {
                const isSelected = selectedIntegrationIds.includes(opt.value);
                return (
                  <button
                    aria-pressed={isSelected}
                    className={cn(
                      "bg-card hover:border-foreground/20 flex h-8 shrink-0 items-center gap-2 rounded-md border px-2.5 text-xs transition-colors",
                      isSelected
                        ? "border-foreground/40 bg-foreground/5"
                        : "border-border"
                    )}
                    key={opt.value}
                    onClick={() => onToggleIntegration(opt.value)}
                    type="button"
                  >
                    <div
                      className={cn(
                        "flex size-3.5 shrink-0 items-center justify-center rounded-sm border transition-colors",
                        isSelected
                          ? "border-foreground bg-foreground text-background"
                          : "border-muted-foreground/40"
                      )}
                    >
                      {isSelected && (
                        <HugeiconsIcon
                          className="size-2.5"
                          icon={Tick01Icon}
                          strokeWidth={3}
                        />
                      )}
                    </div>
                    {opt.type === "github" ? (
                      <Github className="size-3.5 shrink-0" />
                    ) : (
                      <Linear className="size-3.5 shrink-0" />
                    )}
                    <span className="truncate">{opt.label}</span>
                  </button>
                );
              })}
          </div>
        </div>
        <Button
          className="shrink-0"
          onClick={onConnect}
          size="icon-sm"
          type="button"
          variant="outline"
        >
          <HugeiconsIcon className="size-3.5" icon={Add01Icon} />
          <span className="sr-only">{t("addIntegration")}</span>
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {!hasSelectedIntegrations && (
          <div className="text-muted-foreground flex h-full items-center justify-center p-8 text-center text-sm">
            {t("pickSource")}
          </div>
        )}

        {hasSelectedIntegrations && isLoadingPreview && (
          <div className="space-y-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        )}

        {hasSelectedIntegrations && !isLoadingPreview && isPreviewError && (
          <div className="border-destructive/50 bg-destructive/10 flex flex-col items-center gap-3 rounded-xl border p-6 text-center text-sm">
            <p>{t("loadFailed")}</p>
            <Button
              onClick={onRetryPreview}
              size="sm"
              type="button"
              variant="outline"
            >
              <HugeiconsIcon
                className="size-3.5"
                icon={ArrowReloadHorizontalIcon}
              />
              {tCommon("actions.retry")}
            </Button>
          </div>
        )}

        {hasSelectedIntegrations &&
          !(isLoadingPreview || isPreviewError) &&
          (hasAnyVisible ? (
            <div className="space-y-3">
              {visibleRepos.map((repo) => (
                <RepoSection
                  dataPoints={dataPoints}
                  key={repo.repositoryId}
                  onToggleCommit={onToggleCommit}
                  onTogglePr={onTogglePr}
                  onToggleRelease={onToggleRelease}
                  repo={repo}
                  selectedCommitKeys={selectedCommitKeys}
                  selectedPrKeys={selectedPrKeys}
                  selectedReleaseKeys={selectedReleaseKeys}
                />
              ))}
              {visibleLinear.map(
                (li) =>
                  li.issues.length > 0 && (
                    <div
                      className="overflow-hidden rounded-lg border"
                      key={li.integrationId}
                    >
                      <div className="bg-muted/30 flex items-center gap-2 px-3 py-2">
                        <Linear className="size-4 shrink-0" />
                        <span className="min-w-0 truncate text-sm font-medium">
                          {li.displayName}
                        </span>
                      </div>
                      <div className="divide-y">
                        {li.issues.map((issue) => {
                          const key = `${li.integrationId}:${issue.id}`;
                          const metaParts = [
                            issue.assignee ?? tCommon("labels.unassigned"),
                          ];
                          if (issue.completedAt) {
                            metaParts.push(
                              formatEventDate(issue.completedAt, locale)
                            );
                          }
                          return (
                            <EventRow
                              key={issue.id}
                              label={`${issue.identifier} ${issue.title}`}
                              meta={metaParts.join(" · ")}
                              onToggle={() => onToggleLinear(key)}
                              selected={selectedLinearKeys.has(key)}
                              type="LinearIssue"
                            />
                          );
                        })}
                      </div>
                    </div>
                  )
              )}
            </div>
          ) : (
            <div className="text-muted-foreground flex h-full items-center justify-center p-8 text-center text-sm">
              {searchQuery ? t("noSearchResults") : t("noEvents")}
            </div>
          ))}
      </div>
    </div>
  );
}
