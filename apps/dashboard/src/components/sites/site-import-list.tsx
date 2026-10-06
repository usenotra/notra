"use client";

import {
  ArrowUpRight01Icon,
  Github01Icon,
  Search01Icon,
  SquareLock02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@notra/ui/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@notra/ui/components/ui/select";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import { SITE_IMPORT_SKELETON_KEYS } from "@/constants/site-create";
import { startGitHubInstall } from "@/lib/integrations/github/install";
import type { SiteImportListProps } from "@/types/components/sites";

export function SiteImportList({
  organizationId,
  organizationSlug,
  repositories,
  installed,
  isLoading,
  importingId,
  onImport,
}: SiteImportListProps) {
  const t = useTranslations("sites.new");
  const owners = [
    ...new Set(repositories.map((repository) => repository.owner)),
  ];
  const [owner, setOwner] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [installing, setInstalling] = useState(false);
  const activeOwner = owner ?? owners[0] ?? null;
  const query = search.trim().toLowerCase();
  const visible = repositories
    .toSorted(
      (a, b) =>
        Number(b.integrationId !== null) - Number(a.integrationId !== null) ||
        a.repo.localeCompare(b.repo)
    )
    .filter(
      (repository) =>
        (!activeOwner || repository.owner === activeOwner) &&
        repository.repo.toLowerCase().includes(query)
    );

  const install = async () => {
    setInstalling(true);
    const result = await startGitHubInstall({
      organizationId,
      callbackPath: `/${organizationSlug}/sites/new`,
    });
    if (!result.started) {
      setInstalling(false);
      toast.error(
        result.reason === "install-start-failed" && result.message
          ? result.message
          : t("installFailed")
      );
    }
  };

  if (!(isLoading || installed)) {
    return (
      <EmptyState
        action={
          <Button loading={installing} onClick={install}>
            <HugeiconsIcon data-icon="inline-start" icon={Github01Icon} />
            {t("installGitHub")}
          </Button>
        }
        className="min-h-0 py-12"
        description={t("installDescription")}
        title={t("installTitle")}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {owners.length > 1 ? (
          <Select
            onValueChange={(value: string | null) => setOwner(value)}
            value={activeOwner}
          >
            <SelectTrigger aria-label={t("account")} className="w-44 shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {owners.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
        <InputGroup className="flex-1">
          <InputGroupAddon>
            <HugeiconsIcon
              aria-hidden="true"
              icon={Search01Icon}
              size={14}
              strokeWidth={1.5}
            />
          </InputGroupAddon>
          <InputGroupInput
            aria-label={t("searchRepositories")}
            autoCapitalize="none"
            autoComplete="off"
            disabled={isLoading}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("searchRepositories")}
            spellCheck={false}
            type="search"
            value={search}
          />
        </InputGroup>
      </div>
      <ul className="max-h-[22.5rem] divide-y overflow-y-auto overscroll-contain rounded-xl border">
        {isLoading
          ? SITE_IMPORT_SKELETON_KEYS.map((key) => (
              <li className="flex h-14 items-center gap-3 px-3" key={key}>
                <Skeleton className="size-8 rounded-lg" />
                <Skeleton className="h-3.5 w-48 rounded-sm" />
              </li>
            ))
          : visible.map((repository) => {
              const isImporting = repository.githubRepositoryId === importingId;
              return (
                <li
                  className="flex h-14 items-center gap-3 px-3"
                  key={repository.githubRepositoryId}
                >
                  <span className="bg-background flex size-8 shrink-0 items-center justify-center rounded-lg border">
                    <HugeiconsIcon
                      aria-hidden="true"
                      icon={Github01Icon}
                      size={15}
                    />
                  </span>
                  <span className="flex min-w-0 flex-1 items-center gap-1.5">
                    <span className="truncate text-sm font-medium">
                      {repository.repo}
                    </span>
                    {repository.private ? (
                      <HugeiconsIcon
                        aria-label={t("private")}
                        className="text-muted-foreground shrink-0"
                        icon={SquareLock02Icon}
                        role="img"
                        size={12}
                      />
                    ) : null}
                  </span>
                  <Button
                    aria-label={t("importRepository", {
                      repository: repository.repo,
                    })}
                    disabled={importingId !== null && !isImporting}
                    loading={isImporting}
                    onClick={() => onImport(repository)}
                    size="sm"
                  >
                    {t("import")}
                  </Button>
                </li>
              );
            })}
        {!isLoading && visible.length === 0 ? (
          <li className="text-muted-foreground px-3 py-8 text-center text-sm">
            {t("noRepositoryMatch")}
          </li>
        ) : null}
      </ul>
      <button
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 inline-flex items-center gap-1 rounded-sm text-sm transition-colors outline-none focus-visible:ring-[3px]"
        disabled={installing}
        onClick={install}
        type="button"
      >
        {t("adjustAccess")}
        <HugeiconsIcon aria-hidden="true" icon={ArrowUpRight01Icon} size={13} />
      </button>
    </div>
  );
}
