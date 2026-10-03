"use client";

import { Github01Icon, SquareLock02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  isValidSiteSlug,
  slugifySiteName,
} from "@notra/sites-core/utils/hosts";
import {
  FieldDescription,
  FieldSeparator,
} from "@notra/ui/components/ui/field";
import { Input } from "@notra/ui/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@notra/ui/components/ui/input-group";
import { Label } from "@notra/ui/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@notra/ui/components/ui/select";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import {
  SiteChoiceGroup,
  SiteSectionsFields,
} from "@/components/sites/site-form-fields";
import {
  SITE_DEFAULT_BLOG_PATH,
  SITE_DEFAULT_CHANGELOG_PATH,
} from "@/constants/sites";
import {
  useSitePreviewVisibilityOptions,
  useSitePublishModeOptions,
} from "@/lib/hooks/use-site-choice-options";
import { useInvalidateSites } from "@/lib/hooks/use-sites";
import { dashboardOrpc } from "@/lib/orpc/query";
import type {
  SitePreviewVisibility,
  SitePublishMode,
  SiteRepository,
} from "@/types/sites";
import { toErrorMessage } from "@/utils/error-message";

function repositoryLabel(repository: SiteRepository): string {
  return `${repository.owner ?? ""}/${repository.repo ?? ""}`;
}

export function SiteCreateForm({
  organizationId,
  organizationSlug,
  hostingDomain,
}: {
  organizationId: string;
  organizationSlug: string;
  hostingDomain: string | null;
}) {
  const t = useTranslations("sites.new");
  const tCommon = useTranslations("common");
  const id = useId();
  const router = useRouter();
  const invalidateSites = useInvalidateSites();
  const visibilityOptions = useSitePreviewVisibilityOptions();
  const publishModeOptions = useSitePublishModeOptions();

  const repositoriesQuery = useQuery(
    dashboardOrpc.sites.repositories.queryOptions({
      input: { organizationId },
      enabled: organizationId.length > 0,
    })
  );
  const repositories = repositoriesQuery.data ?? [];

  const [repositoryId, setRepositoryId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [branch, setBranch] = useState("");
  const [rootDirectory, setRootDirectory] = useState("");
  const [blogEnabled, setBlogEnabled] = useState(true);
  const [changelogEnabled, setChangelogEnabled] = useState(true);
  const [blogPath, setBlogPath] = useState(SITE_DEFAULT_BLOG_PATH);
  const [changelogPath, setChangelogPath] = useState(
    SITE_DEFAULT_CHANGELOG_PATH
  );
  const [previewVisibility, setPreviewVisibility] =
    useState<SitePreviewVisibility>("protected");
  const [publishMode, setPublishMode] =
    useState<SitePublishMode>("pull_request");

  const repository =
    repositories.find((candidate) => candidate.id === repositoryId) ?? null;
  const trimmedSlug = slug.trim().toLowerCase();
  const slugInvalid = trimmedSlug.length > 0 && !isValidSiteSlug(trimmedSlug);
  const derivedSlug = slugifySiteName(name);
  const sectionsValid = blogEnabled || changelogEnabled;
  const canSubmit =
    repository !== null &&
    name.trim().length > 0 &&
    !slugInvalid &&
    sectionsValid;

  const createMutation = useMutation({
    mutationFn: () => {
      if (!repository) {
        throw new Error(t("repositoryRequired"));
      }
      return dashboardOrpc.sites.create.call({
        organizationId,
        name: name.trim(),
        slug: trimmedSlug || undefined,
        repositoryId: repository.id,
        productionBranch: branch.trim() || undefined,
        rootDirectory: rootDirectory.trim() || undefined,
        mounts: {
          blog: blogEnabled ? blogPath : undefined,
          changelog: changelogEnabled ? changelogPath : undefined,
        },
        previewVisibility,
        publishMode,
      });
    },
    onSuccess: async (result) => {
      toast.success(
        result.deploymentQueued ? t("createdDeploying") : t("created")
      );
      await invalidateSites();
      router.push(`/${organizationSlug}/sites/${result.site.id}`);
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, t("createFailed")));
    },
  });

  if (repositoriesQuery.isSuccess && repositories.length === 0) {
    return (
      <EmptyState
        action={
          <Link
            className={buttonVariants()}
            href={`/${organizationSlug}/integrations/github`}
          >
            <HugeiconsIcon className="size-4" icon={Github01Icon} />
            {t("noRepositories.action")}
          </Link>
        }
        description={t("noRepositories.description")}
        title={t("noRepositories.title")}
      />
    );
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        if (canSubmit && !createMutation.isPending) {
          createMutation.mutate();
        }
      }}
    >
      <section className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={`${id}-repository`}>
            {tCommon("labels.repository")}
          </Label>
          <Select
            disabled={repositoriesQuery.isPending}
            items={repositories.map((candidate) => ({
              value: candidate.id,
              label: repositoryLabel(candidate),
            }))}
            onValueChange={(value) => {
              const next = repositories.find((item) => item.id === value);
              if (!next) {
                return;
              }
              setRepositoryId(next.id);
              setBranch(next.defaultBranch ?? "");
              if (!name.trim()) {
                setName(next.repo ?? "");
              }
            }}
            value={repositoryId}
          >
            <SelectTrigger className="w-full" id={`${id}-repository`}>
              <SelectValue
                placeholder={
                  repositoriesQuery.isPending
                    ? tCommon("labels.loading")
                    : t("repositoryPlaceholder")
                }
              />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              {repositories.map((candidate) => (
                <SelectItem key={candidate.id} value={candidate.id}>
                  <HugeiconsIcon
                    aria-hidden="true"
                    className="text-muted-foreground"
                    icon={Github01Icon}
                    size={14}
                  />
                  <span className="truncate">{repositoryLabel(candidate)}</span>
                  {candidate.private ? (
                    <HugeiconsIcon
                      aria-label={t("private")}
                      className="text-muted-foreground"
                      icon={SquareLock02Icon}
                      size={12}
                    />
                  ) : null}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldDescription>
            {t("repositoryHint")}{" "}
            <Link href={`/${organizationSlug}/integrations/github`}>
              {t("manageRepositories")}
            </Link>
          </FieldDescription>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={`${id}-name`}>{t("name")}</Label>
            <Input
              autoComplete="off"
              id={`${id}-name`}
              maxLength={80}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("namePlaceholder")}
              required
              value={name}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${id}-slug`}>
              {t("address")}{" "}
              <span className="text-muted-foreground font-normal">
                {tCommon("labels.optional")}
              </span>
            </Label>
            <InputGroup>
              <InputGroupInput
                aria-describedby={`${id}-slug-hint`}
                aria-invalid={slugInvalid || undefined}
                autoCapitalize="none"
                autoComplete="off"
                id={`${id}-slug`}
                maxLength={40}
                onChange={(event) => setSlug(event.target.value)}
                placeholder={derivedSlug || "acme"}
                spellCheck={false}
                value={slug}
              />
              {hostingDomain ? (
                <InputGroupAddon align="inline-end">
                  <InputGroupText>.{hostingDomain}</InputGroupText>
                </InputGroupAddon>
              ) : null}
            </InputGroup>
            <p
              className={
                slugInvalid
                  ? "text-destructive text-xs"
                  : "text-muted-foreground text-xs"
              }
              id={`${id}-slug-hint`}
            >
              {slugInvalid ? t("addressInvalid") : t("addressHint")}
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={`${id}-branch`}>{t("branch")}</Label>
            <Input
              aria-describedby={`${id}-branch-hint`}
              autoComplete="off"
              id={`${id}-branch`}
              onChange={(event) => setBranch(event.target.value)}
              placeholder={repository?.defaultBranch ?? "main"}
              spellCheck={false}
              value={branch}
            />
            <p
              className="text-muted-foreground text-xs"
              id={`${id}-branch-hint`}
            >
              {t("branchHint")}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${id}-root`}>
              {t("rootDirectory")}{" "}
              <span className="text-muted-foreground font-normal">
                {tCommon("labels.optional")}
              </span>
            </Label>
            <Input
              aria-describedby={`${id}-root-hint`}
              autoComplete="off"
              id={`${id}-root`}
              onChange={(event) => setRootDirectory(event.target.value)}
              placeholder={t("rootDirectoryPlaceholder")}
              spellCheck={false}
              value={rootDirectory}
            />
            <p className="text-muted-foreground text-xs" id={`${id}-root-hint`}>
              {t("rootDirectoryHint")}
            </p>
          </div>
        </div>
      </section>

      <FieldSeparator />

      <SiteSectionsFields
        blogEnabled={blogEnabled}
        blogPath={blogPath}
        changelogEnabled={changelogEnabled}
        changelogPath={changelogPath}
        idPrefix={id}
        onBlogEnabledChange={setBlogEnabled}
        onBlogPathChange={setBlogPath}
        onChangelogEnabledChange={setChangelogEnabled}
        onChangelogPathChange={setChangelogPath}
      />

      <FieldSeparator />

      <SiteChoiceGroup
        label={t("previewVisibility")}
        onValueChange={setPreviewVisibility}
        options={visibilityOptions}
        value={previewVisibility}
      />

      <SiteChoiceGroup
        label={t("publishMode")}
        onValueChange={setPublishMode}
        options={publishModeOptions}
        value={publishMode}
      />

      <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
        <Link
          className={buttonVariants({ variant: "outline" })}
          href={`/${organizationSlug}/sites`}
        >
          {tCommon("actions.cancel")}
        </Link>
        <Button
          disabled={!canSubmit}
          loading={createMutation.isPending}
          type="submit"
        >
          {t("create")}
        </Button>
      </div>
    </form>
  );
}
