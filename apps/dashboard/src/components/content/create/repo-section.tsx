"use client";

import { Tick01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ContentDataPointSettings } from "@notra/schemas/dashboard/content";
import { Github } from "@notra/ui/components/ui/svgs/github";
import { cn } from "@notra/ui/lib/utils";
import { useMemo } from "react";

import type { RepositoryPreview } from "@/types/content/preview";
import {
  formatEventDate,
  prSelectionToKey,
  releaseSelectionToKey,
} from "@/utils/content-preview";

import { EventRow } from "./event-row";

interface RepoSectionProps {
  repo: RepositoryPreview;
  dataPoints: ContentDataPointSettings;
  selectedCommitKeys: Set<string>;
  selectedPrKeys: Set<string>;
  selectedReleaseKeys: Set<string>;
  onToggleCommit: (sha: string) => void;
  onTogglePr: (key: string) => void;
  onToggleRelease: (key: string) => void;
}

export function RepoSection({
  repo,
  dataPoints,
  selectedCommitKeys,
  selectedPrKeys,
  selectedReleaseKeys,
  onToggleCommit,
  onTogglePr,
  onToggleRelease,
}: RepoSectionProps) {
  const showCommits = dataPoints.includeCommits && repo.commits.length > 0;
  const showPrs =
    dataPoints.includePullRequests && repo.pullRequests.length > 0;
  const showReleases = dataPoints.includeReleases && repo.releases.length > 0;

  const selectables = useMemo(
    () => [
      ...repo.commits.map((c) => ({
        selected: selectedCommitKeys.has(c.sha),
        toggle: () => onToggleCommit(c.sha),
      })),
      ...repo.pullRequests.map((pr) => {
        const key = prSelectionToKey({
          repositoryId: repo.repositoryId,
          number: pr.number,
        });
        return {
          selected: selectedPrKeys.has(key),
          toggle: () => onTogglePr(key),
        };
      }),
      ...repo.releases.map((r) => {
        const key = releaseSelectionToKey({
          repositoryId: repo.repositoryId,
          tagName: r.tagName,
        });
        return {
          selected: selectedReleaseKeys.has(key),
          toggle: () => onToggleRelease(key),
        };
      }),
    ],
    [
      repo,
      selectedCommitKeys,
      selectedPrKeys,
      selectedReleaseKeys,
      onToggleCommit,
      onTogglePr,
      onToggleRelease,
    ]
  );

  const allSelected =
    selectables.length > 0 && selectables.every((s) => s.selected);

  const handleToggleAllRepo = () => {
    for (const item of selectables) {
      if (allSelected || !item.selected) {
        item.toggle();
      }
    }
  };

  if (!(showCommits || showPrs || showReleases)) {
    return null;
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <button
        className="bg-muted/30 hover:bg-muted/50 flex w-full items-center gap-2 px-3 py-2 text-left transition-colors"
        onClick={handleToggleAllRepo}
        type="button"
      >
        <div
          className={cn(
            "flex size-4 shrink-0 items-center justify-center rounded-sm border transition-colors",
            allSelected
              ? "border-primary bg-primary text-primary-foreground"
              : "border-muted-foreground/30"
          )}
        >
          {allSelected && (
            <HugeiconsIcon className="size-3" icon={Tick01Icon} />
          )}
        </div>
        <Github className="size-4 shrink-0" />
        <span className="flex-1 text-sm font-medium">
          {repo.owner}/{repo.repo}
        </span>
      </button>
      <div className="divide-y">
        {showReleases &&
          repo.releases.map((release) => {
            const releaseKey = releaseSelectionToKey({
              repositoryId: repo.repositoryId,
              tagName: release.tagName,
            });
            return (
              <EventRow
                key={releaseKey}
                label={release.name || release.tagName}
                meta={`${release.authorLogin} · ${formatEventDate(release.publishedAt)}${release.prerelease ? " · pre-release" : ""}`}
                onToggle={() => onToggleRelease(releaseKey)}
                selected={selectedReleaseKeys.has(releaseKey)}
                type="Release"
              />
            );
          })}
        {showPrs &&
          repo.pullRequests.map((pr) => {
            const prKey = prSelectionToKey({
              repositoryId: repo.repositoryId,
              number: pr.number,
            });
            return (
              <EventRow
                key={prKey}
                label={`#${pr.number} ${pr.title}`}
                meta={`${pr.authorLogin} · ${pr.mergedAt ? formatEventDate(pr.mergedAt) : ""}`}
                onToggle={() => onTogglePr(prKey)}
                selected={selectedPrKeys.has(prKey)}
                type="PR"
              />
            );
          })}
        {showCommits &&
          repo.commits.map((commit) => (
            <EventRow
              key={commit.sha}
              label={commit.message}
              meta={`${commit.authorLogin ?? commit.authorName} · ${commit.authoredAt ? formatEventDate(commit.authoredAt) : ""} · ${commit.sha.slice(0, 7)}`}
              onToggle={() => onToggleCommit(commit.sha)}
              selected={selectedCommitKeys.has(commit.sha)}
              type="Commit"
            />
          ))}
      </div>
    </div>
  );
}
