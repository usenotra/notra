"use client";

import {
  LockKeyIcon,
  Search01Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Input } from "@notra/ui/components/ui/input";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { Github } from "@notra/ui/components/ui/svgs/github";
import { cn } from "@notra/ui/lib/utils";
import { useMemo, useRef, useState } from "react";

import { Button } from "@/components/button";
import type {
  GitHubAppRepository,
  RepositoryMultiSelectProps,
} from "@/types/integrations/github";

import { GitHubAccountSelect } from "./account-select";

const MAX_VISIBLE_REPOSITORIES = 50;

// Keeps large GitHub installations browsable without rendering every repository at once.
export function RepositoryMultiSelect({
  repositories,
  value,
  onChange,
  isLoading = false,
  disabled = false,
  placeholder = "Search repositories...",
  accounts,
  selectedAccountId,
  onSelectAccount,
  onAddAccount,
}: RepositoryMultiSelectProps) {
  const showAccountSelect = !!accounts && accounts.length > 0;
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(MAX_VISIBLE_REPOSITORIES);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedIds = useMemo(() => new Set(value), [value]);
  const visibleRepositories = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const matches = normalizedQuery
      ? repositories.filter((repo) =>
          repo.fullName.toLowerCase().includes(normalizedQuery)
        )
      : repositories;

    return [...matches].sort(
      (a: GitHubAppRepository, b: GitHubAppRepository) => {
        const aSelected = selectedIds.has(a.id);
        const bSelected = selectedIds.has(b.id);

        if (aSelected !== bSelected) {
          return aSelected ? -1 : 1;
        }

        return a.fullName.localeCompare(b.fullName);
      }
    );
  }, [query, repositories, selectedIds]);

  const toggleRepository = (repositoryId: string) => {
    if (disabled) {
      return;
    }

    if (selectedIds.has(repositoryId)) {
      onChange(value.filter((id) => id !== repositoryId));
      return;
    }

    onChange([...value, repositoryId]);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-9 w-full rounded-lg" />
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        {showAccountSelect ? (
          <div className="sm:w-52 sm:shrink-0">
            <GitHubAccountSelect
              accounts={accounts}
              disabled={disabled}
              onAddAccount={onAddAccount}
              onSelectAccount={(accountId) => {
                setQuery("");
                setVisibleCount(MAX_VISIBLE_REPOSITORIES);
                if (listRef.current) {
                  listRef.current.scrollTop = 0;
                }
                onSelectAccount?.(accountId);
              }}
              selectedAccountId={selectedAccountId}
            />
          </div>
        ) : null}
        <div className="relative flex-1">
          <HugeiconsIcon
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            icon={Search01Icon}
          />
          <Input
            aria-label="Search repositories"
            className="h-9 pl-9"
            disabled={disabled}
            onChange={(event) => {
              setQuery(event.currentTarget.value);
              setVisibleCount(MAX_VISIBLE_REPOSITORIES);
              if (listRef.current) {
                listRef.current.scrollTop = 0;
              }
            }}
            placeholder={placeholder}
            value={query}
          />
        </div>
      </div>

      <div className="bg-background overflow-hidden rounded-lg border">
        <div
          className="max-h-80 overflow-y-auto"
          onScroll={(event) => {
            const list = event.currentTarget;
            if (
              visibleRepositories.length > visibleCount &&
              list.scrollHeight - list.scrollTop - list.clientHeight < 80
            ) {
              setVisibleCount((count) =>
                Math.min(
                  count + MAX_VISIBLE_REPOSITORIES,
                  visibleRepositories.length
                )
              );
            }
          }}
          ref={listRef}
        >
          {visibleRepositories.length > 0 ? (
            visibleRepositories.slice(0, visibleCount).map((repo) => {
              const selected = selectedIds.has(repo.id);

              return (
                <div
                  className={cn(
                    "flex items-center gap-3 border-b px-3 py-2 last:border-b-0",
                    selected && "bg-muted/40"
                  )}
                  key={repo.id}
                >
                  <span className="bg-muted/30 text-foreground flex size-7 shrink-0 items-center justify-center rounded-full border">
                    <Github className="size-3.5" />
                  </span>

                  <div className="flex min-w-0 flex-1 items-center gap-1.5">
                    <span className="min-w-0 truncate text-sm font-medium">
                      {repo.fullName}
                    </span>
                    {repo.private ? (
                      <HugeiconsIcon
                        className="text-muted-foreground size-3.5 shrink-0"
                        icon={LockKeyIcon}
                      />
                    ) : null}
                  </div>

                  <Button
                    aria-label={`${selected ? "Selected" : "Select"}: ${repo.fullName}`}
                    aria-pressed={selected}
                    className="min-w-20 shrink-0 gap-1.5"
                    disabled={disabled}
                    onClick={() => toggleRepository(repo.id)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    {selected ? (
                      <HugeiconsIcon className="size-3.5" icon={Tick02Icon} />
                    ) : null}
                    {selected ? "Selected" : "Select"}
                  </Button>
                </div>
              );
            })
          ) : (
            <div className="text-muted-foreground px-3 py-8 text-center text-sm">
              No repositories found.
            </div>
          )}
        </div>
      </div>

      {visibleRepositories.length > visibleCount ? (
        <p className="text-muted-foreground text-xs">
          Showing {Math.min(visibleCount, visibleRepositories.length)} of{" "}
          {visibleRepositories.length} repositories. Scroll for more.
        </p>
      ) : null}
    </div>
  );
}
