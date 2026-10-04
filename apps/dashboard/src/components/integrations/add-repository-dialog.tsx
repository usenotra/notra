"use client";

import type { AddRepositoryFormValues } from "@notra/schemas/dashboard/integrations";
import {
  ResponsiveDialog,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from "@notra/ui/components/shared/responsive-dialog";
import { Field, FieldLabel } from "@notra/ui/components/ui/field";
import { Input } from "@notra/ui/components/ui/input";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import type React from "react";
import { isValidElement, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import { REPOSITORY_ALREADY_CONNECTED_CODE } from "@/constants/github";
import { dashboardOrpc } from "@/lib/orpc/query";
import { parseGitHubUrl } from "@/lib/utils/github";
import { createAddRepositoryFormSchema } from "@/schemas/github-integration-forms";
import type {
  AddRepositoryDialogProps,
  AvailableRepo,
} from "@/types/integrations";
import { getOrpcErrorDataCode } from "@/utils/orpc-errors";

function RepositorySelector({
  field,
  availableRepos,
  mutation,
}: {
  field: {
    state: { value: string; meta: { errors: unknown[] } };
    handleBlur: () => void;
    handleChange: (value: string) => void;
  };
  availableRepos: AvailableRepo[];
  mutation: { isPending: boolean };
}) {
  const t = useTranslations("integrations.addRepository");
  const tCommon2 = useTranslations("common");
  const parentRef = useRef<HTMLDivElement>(null);
  const shouldVirtualize = availableRepos.length > 20;

  const rowVirtualizer = useVirtualizer({
    count: availableRepos.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
    overscan: 5,
    enabled: shouldVirtualize,
  });

  if (shouldVirtualize) {
    return (
      <>
        <div
          className="border-border bg-background w-full rounded-lg border"
          ref={parentRef}
          style={{
            height: "300px",
            overflow: "auto",
          }}
        >
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const repo = availableRepos[virtualRow.index];
              if (!repo) {
                return null;
              }
              return (
                <button
                  className={`hover:bg-accent flex w-full items-center gap-1 px-3 py-2 text-left ${
                    field.state.value === repo.fullName ? "bg-accent" : ""
                  }`}
                  disabled={mutation.isPending}
                  key={virtualRow.key}
                  onClick={() => field.handleChange(repo.fullName)}
                  title={repo.fullName}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  type="button"
                >
                  <span className="min-w-0 truncate">{repo.fullName}</span>
                  {repo.private ? (
                    <span className="shrink-0">{t("private")}</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
        {field.state.meta.errors.length > 0 ? (
          <p className="text-destructive mt-1 text-sm">
            {typeof field.state.meta.errors[0] === "string"
              ? field.state.meta.errors[0]
              : ((field.state.meta.errors[0] as { message?: string })
                  ?.message ?? tCommon2("labels.invalidValue"))}
          </p>
        ) : null}
      </>
    );
  }

  return (
    <>
      <select
        className="border-border bg-background w-full rounded-lg border px-3 py-2"
        disabled={mutation.isPending}
        onBlur={field.handleBlur}
        onChange={(e) => field.handleChange(e.target.value)}
        value={field.state.value}
      >
        <option value="">{t("selectPlaceholder")}</option>
        {availableRepos.map((repo) => (
          <option key={repo.fullName} value={repo.fullName}>
            {repo.fullName} {repo.private ? t("private") : ""}
          </option>
        ))}
      </select>
      {field.state.meta.errors.length > 0 ? (
        <p className="text-destructive mt-1 text-sm">
          {typeof field.state.meta.errors[0] === "string"
            ? field.state.meta.errors[0]
            : ((field.state.meta.errors[0] as { message?: string })?.message ??
              tCommon2("labels.invalidValue"))}
        </p>
      ) : null}
    </>
  );
}

export function AddRepositoryDialog({
  integrationId,
  organizationId,
  onSuccess,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  trigger,
}: AddRepositoryDialogProps) {
  const t = useTranslations("integrations.addRepository");
  const tIntegrationsShared = useTranslations("integrations.shared");
  const tForms = useTranslations("integrations.githubForms");
  const tCommon = useTranslations("common");
  const addRepositoryFormSchema = useMemo(
    () => createAddRepositoryFormSchema(tForms),
    [tForms]
  );
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;
  const queryClient = useQueryClient();

  let triggerElement = null;
  if (trigger && isValidElement(trigger)) {
    triggerElement = (
      <ResponsiveDialogTrigger render={trigger as React.ReactElement} />
    );
  } else if (controlledOpen === undefined) {
    triggerElement = (
      <ResponsiveDialogTrigger render={<Button size="sm" variant="outline" />}>
        {tIntegrationsShared("addRepository")}
      </ResponsiveDialogTrigger>
    );
  }

  const availableRepositoriesQuery = useQuery(
    dashboardOrpc.integrations.repositories.listAvailable.queryOptions({
      input: { organizationId, integrationId },
      enabled: open && !!organizationId,
      select: (repos) =>
        Array.from(
          new Map(
            (repos as AvailableRepo[]).map((repo) => [repo.fullName, repo])
          ).values()
        ),
    })
  );

  const availableRepos: AvailableRepo[] = availableRepositoriesQuery.data ?? [];
  const loadingRepos = availableRepositoriesQuery.isLoading;

  const mutation = useMutation({
    mutationFn: async (values: AddRepositoryFormValues) => {
      const parsed = parseGitHubUrl(values.repository);
      if (!parsed) {
        throw new Error(t("invalidFormat"));
      }

      const normalizedOwner = parsed.owner.trim();
      const normalizedRepo = parsed.repo.trim();

      return dashboardOrpc.integrations.repositories.add.call({
        organizationId,
        integrationId,
        owner: normalizedOwner,
        repo: normalizedRepo,
        outputs: [
          { type: "changelog", enabled: true },
          { type: "blog_post", enabled: false },
          { type: "twitter_post", enabled: false },
          { type: "linkedin_post", enabled: false },
          { type: "investor_update", enabled: false },
        ],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: dashboardOrpc.integrations.key(),
      });
      queryClient.invalidateQueries({
        queryKey: dashboardOrpc.integrations.get.queryKey({
          input: { organizationId, integrationId },
        }),
      });
      queryClient.invalidateQueries({
        queryKey:
          dashboardOrpc.integrations.repositories.listAvailable.queryKey({
            input: { organizationId, integrationId },
          }),
      });
      toast.success(t("added"));
      setOpen(false);
      form.reset();
      onSuccess?.();
    },
    onError: (error: Error) => {
      const message =
        getOrpcErrorDataCode(error) === REPOSITORY_ALREADY_CONNECTED_CODE
          ? tCommon("labels.repositoryAlreadyConnected")
          : error.message;
      toast.error(message);
    },
  });

  const form = useForm({
    defaultValues: {
      repository: "",
    },
    onSubmit: ({ value }) => {
      const validationResult = addRepositoryFormSchema.safeParse(value);
      if (!validationResult.success) {
        return;
      }
      mutation.mutate(validationResult.data);
    },
  });

  return (
    <ResponsiveDialog onOpenChange={setOpen} open={open}>
      {triggerElement}
      <ResponsiveDialogContent className="max-h-[85svh] overflow-y-auto [&>*]:min-w-0">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {tIntegrationsShared("addRepository")}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {availableRepos.length > 0
              ? t("descriptionSelect")
              : t("descriptionManual")}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <div className="space-y-4 py-4">
            <form.Field
              name="repository"
              validators={{
                onChange: addRepositoryFormSchema.shape.repository,
              }}
            >
              {(field) => {
                if (loadingRepos) {
                  return (
                    <Field>
                      <FieldLabel>{tCommon("labels.repository")}</FieldLabel>
                      <Skeleton className="h-10 w-full" />
                    </Field>
                  );
                }

                if (availableRepos.length > 0) {
                  return (
                    <Field>
                      <FieldLabel>{tCommon("labels.repository")}</FieldLabel>
                      <RepositorySelector
                        availableRepos={availableRepos}
                        field={field}
                        mutation={mutation}
                      />
                    </Field>
                  );
                }

                return (
                  <Field>
                    <FieldLabel>{tCommon("labels.repository")}</FieldLabel>
                    <Input
                      disabled={mutation.isPending}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder={t("manualPlaceholder")}
                      value={field.state.value}
                    />
                    {field.state.meta.errors.length > 0 ? (
                      <p className="text-destructive mt-1 text-sm">
                        {typeof field.state.meta.errors[0] === "string"
                          ? field.state.meta.errors[0]
                          : ((
                              field.state.meta.errors[0] as { message?: string }
                            )?.message ?? tCommon("labels.invalidValue"))}
                      </p>
                    ) : null}
                    <p className="text-muted-foreground mt-1 text-xs">
                      {t("noToken")}
                    </p>
                  </Field>
                );
              }}
            </form.Field>
          </div>
          <ResponsiveDialogFooter>
            <ResponsiveDialogClose
              disabled={mutation.isPending}
              render={<Button variant="outline" />}
            >
              {tCommon("actions.cancel")}
            </ResponsiveDialogClose>
            <form.Subscribe selector={(state) => [state.canSubmit]}>
              {([canSubmit]) => (
                <Button
                  disabled={!canSubmit || mutation.isPending || loadingRepos}
                  onClick={(e) => {
                    e.preventDefault();
                    form.handleSubmit();
                  }}
                  type="button"
                >
                  {mutation.isPending
                    ? tCommon("labels.adding")
                    : tIntegrationsShared("addRepository")}
                </Button>
              )}
            </form.Subscribe>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
