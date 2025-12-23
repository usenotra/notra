"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import type React from "react";
import { isValidElement, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogAction,
  DialogCancel,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { parseGitHubUrl } from "@/lib/utils/github";
import type {
  AddRepositoryDialogProps,
  AvailableRepo,
} from "@/types/integrations";
import { QUERY_KEYS } from "@/utils/query-keys";
import {
  type AddRepositoryFormValues,
  addRepositoryFormSchema,
} from "@/utils/schemas/integrations";

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
          className="w-full rounded-lg border border-border bg-background"
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
              return (
                <button
                  className={`w-full px-3 py-2 text-left hover:bg-accent ${
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
          <p className="mt-1 text-destructive text-sm">
            {typeof field.state.meta.errors[0] === "string"
              ? field.state.meta.errors[0]
              : String(field.state.meta.errors[0])}
          </p>
        ) : null}
      </>
    );
  }

  return (
    <>
      <select
        className="w-full rounded-lg border border-border bg-background px-3 py-2"
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
        <p className="mt-1 text-destructive text-sm">
          {typeof field.state.meta.errors[0] === "string"
            ? field.state.meta.errors[0]
            : String(field.state.meta.errors[0])}
        </p>
      ) : null}
    </>
  );
}

export function AddRepositoryDialog({
  integrationId,
  onSuccess,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  trigger,
}: AddRepositoryDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;
  const queryClient = useQueryClient();

  const { data: availableRepos = [], isLoading: loadingRepos } = useQuery({
    queryKey: QUERY_KEYS.INTEGRATIONS.availableRepos(integrationId),
    queryFn: async () => {
      const response = await fetch(
        `/api/integrations/${integrationId}/repositories`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch repositories");
      }
      return response.json() as Promise<AvailableRepo[]>;
    },
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: async (values: AddRepositoryFormValues) => {
      const parsed = parseGitHubUrl(values.repository);
      if (!parsed) {
        throw new Error("Invalid repository format");
      }

      const response = await fetch(
        `/api/integrations/${integrationId}/repositories`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            owner: parsed.owner,
            repo: parsed.repo,
            outputs: [
              { type: "changelog", enabled: true },
              { type: "blog_post", enabled: false },
              { type: "twitter_post", enabled: false },
              { type: "linkedin_post", enabled: false },
              { type: "investor_update", enabled: false },
            ],
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to add repository");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.INTEGRATIONS.repositories(integrationId),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.INTEGRATIONS.detail(integrationId),
      });
      toast.success("Repository added successfully");
      setOpen(false);
      form.reset();
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(error.message);
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
    <Dialog onOpenChange={setOpen} open={open}>
      {trigger !== undefined && isValidElement(trigger) ? (
        <DialogTrigger render={trigger as React.ReactElement} />
      ) : (
        <DialogTrigger>
          <Button size="sm" variant="outline">
            Add Repository
          </Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Repository</DialogTitle>
          <DialogDescription>
            {availableRepos.length > 0
              ? "Select a repository from your GitHub account to enable integrations."
              : "Enter a repository in the format owner/repo (e.g., facebook/react) or paste a GitHub URL. For private repositories, ensure your integration has a valid access token."}
          </DialogDescription>
        </DialogHeader>
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
                      <p className="mt-1 text-destructive text-sm">
                        {typeof field.state.meta.errors[0] === "string"
                          ? field.state.meta.errors[0]
                          : String(field.state.meta.errors[0])}
                      </p>
                    ) : null}
                    <p className="mt-1 text-muted-foreground text-xs">
                      No access token available. Enter the repository as
                      owner/repo or paste a GitHub URL.
                    </p>
                  </Field>
                );
              }}
            </form.Field>
          </div>
          <DialogFooter>
            <DialogCancel disabled={mutation.isPending}>Cancel</DialogCancel>
            <form.Subscribe selector={(state) => [state.canSubmit]}>
              {([canSubmit]) => (
                <DialogAction
                  disabled={!canSubmit || mutation.isPending || loadingRepos}
                  onClick={(e) => {
                    e.preventDefault();
                    form.handleSubmit();
                  }}
                  type="button"
                >
                  {mutation.isPending ? "Adding..." : "Add Repository"}
                </DialogAction>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
