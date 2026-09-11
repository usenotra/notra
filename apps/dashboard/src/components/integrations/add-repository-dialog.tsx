"use client";

import {
  type AddRepositoryFormValues,
  addRepositoryFormSchema,
} from "@notra/schemas/dashboard/integrations";
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
import { isValidElement, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/button";
import { dashboardOrpc } from "@/lib/orpc/query";
import { parseGitHubUrl } from "@/lib/utils/github";
import type {
  AddRepositoryDialogProps,
  AvailableRepo,
} from "@/types/integrations";

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
                  className={`hover:bg-accent w-full px-3 py-2 text-left ${
                    field.state.value === repo.fullName ? "bg-accent" : ""
                  }`}
                  disabled={mutation.isPending}
                  key={virtualRow.key}
                  onClick={() => field.handleChange(repo.fullName)}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  type="button"
                >
                  {repo.fullName} {repo.private ? "(Private)" : ""}
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
                  ?.message ?? "Invalid value")}
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
        <option value="">Select a repository...</option>
        {availableRepos.map((repo) => (
          <option key={repo.fullName} value={repo.fullName}>
            {repo.fullName} {repo.private ? "(Private)" : ""}
          </option>
        ))}
      </select>
      {field.state.meta.errors.length > 0 ? (
        <p className="text-destructive mt-1 text-sm">
          {typeof field.state.meta.errors[0] === "string"
            ? field.state.meta.errors[0]
            : ((field.state.meta.errors[0] as { message?: string })?.message ??
              "Invalid value")}
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
        Add Repository
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
        throw new Error("Invalid repository format");
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
      toast.success("Repository added successfully");
      setOpen(false);
      form.reset();
      onSuccess?.();
    },
    onError: (error: Error) => {
      const message =
        error.message === "Repository already connected"
          ? "Repository already connected"
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
          <ResponsiveDialogTitle>Add Repository</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {availableRepos.length > 0
              ? "Select a repository from your GitHub account to enable integrations."
              : "Enter a repository in the format owner/repo (e.g., facebook/react) or paste a GitHub URL. For private repositories, ensure your integration has a valid access token."}
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
                      <FieldLabel>Repository</FieldLabel>
                      <Skeleton className="h-10 w-full" />
                    </Field>
                  );
                }

                if (availableRepos.length > 0) {
                  return (
                    <Field>
                      <FieldLabel>Repository</FieldLabel>
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
                    <FieldLabel>Repository</FieldLabel>
                    <Input
                      disabled={mutation.isPending}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="facebook/react or https://github.com/facebook/react"
                      value={field.state.value}
                    />
                    {field.state.meta.errors.length > 0 ? (
                      <p className="text-destructive mt-1 text-sm">
                        {typeof field.state.meta.errors[0] === "string"
                          ? field.state.meta.errors[0]
                          : ((
                              field.state.meta.errors[0] as { message?: string }
                            )?.message ?? "Invalid value")}
                      </p>
                    ) : null}
                    <p className="text-muted-foreground mt-1 text-xs">
                      No access token available. Enter the repository as
                      owner/repo or paste a GitHub URL.
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
              Cancel
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
                  {mutation.isPending ? "Adding..." : "Add Repository"}
                </Button>
              )}
            </form.Subscribe>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
