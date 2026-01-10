"use client";

import { useForm } from "@tanstack/react-form";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useMutation, useQuery } from "convex/react";
import type React from "react";
import { isValidElement, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { parseGitHubUrl } from "@/lib/utils/github";
import type {
  AddRepositoryDialogProps,
  AvailableRepo,
} from "@/types/integrations";
import {
  type AddRepositoryFormValues,
  addRepositoryFormSchema,
} from "@/utils/schemas/integrations";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

function RepositorySelector({
  field,
  availableRepos,
  isPending,
}: {
  field: {
    state: { value: string; meta: { errors: unknown[] } };
    handleBlur: () => void;
    handleChange: (value: string) => void;
  };
  availableRepos: AvailableRepo[];
  isPending: boolean;
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
                  disabled={isPending}
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
        disabled={isPending}
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
  const [isPending, setIsPending] = useState(false);

  const availableReposResult = useQuery(
    api.integrations.listAvailableRepos,
    open && integrationId
      ? { integrationId: integrationId as Id<"githubIntegrations"> }
      : "skip"
  );

  const availableRepos: AvailableRepo[] = availableReposResult ?? [];
  const loadingRepos = availableReposResult === undefined && open;

  const addRepository = useMutation(api.repositories.add);

  const handleSubmit = async (values: AddRepositoryFormValues) => {
    const parsed = parseGitHubUrl(values.repository);
    if (!parsed) {
      throw new Error("Invalid repository format");
    }

    setIsPending(true);
    try {
      await addRepository({
        integrationId: integrationId as Id<"githubIntegrations">,
        owner: parsed.owner,
        repo: parsed.repo,
        outputs: [
          { type: "changelog", enabled: true },
          { type: "blog_post", enabled: false },
          { type: "twitter_post", enabled: false },
          { type: "linkedin_post", enabled: false },
          { type: "investor_update", enabled: false },
        ],
      });

      toast.success("Repository added successfully");
      setOpen(false);
      form.reset();
      onSuccess?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add repository"
      );
    } finally {
      setIsPending(false);
    }
  };

  const form = useForm({
    defaultValues: {
      repository: "",
    },
    onSubmit: ({ value }) => {
      const validationResult = addRepositoryFormSchema.safeParse(value);
      if (!validationResult.success) {
        return;
      }
      handleSubmit(validationResult.data);
    },
  });

  return (
    <AlertDialog onOpenChange={setOpen} open={open}>
      {trigger !== undefined && isValidElement(trigger) ? (
        <AlertDialogTrigger render={trigger as React.ReactElement} />
      ) : (
        <AlertDialogTrigger>
          <Button size="sm" variant="outline">
            Add Repository
          </Button>
        </AlertDialogTrigger>
      )}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Add Repository</AlertDialogTitle>
          <AlertDialogDescription>
            {availableRepos.length > 0
              ? "Select a repository from your GitHub account to enable integrations."
              : "Enter a repository in the format owner/repo (e.g., facebook/react) or paste a GitHub URL. For private repositories, ensure your integration has a valid access token."}
          </AlertDialogDescription>
        </AlertDialogHeader>
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
                        isPending={isPending}
                      />
                    </Field>
                  );
                }

                return (
                  <Field>
                    <FieldLabel>Repository</FieldLabel>
                    <Input
                      disabled={isPending}
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
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <form.Subscribe selector={(state) => [state.canSubmit]}>
              {([canSubmit]) => (
                <AlertDialogAction
                  disabled={!canSubmit || isPending || loadingRepos}
                  onClick={(e) => {
                    e.preventDefault();
                    form.handleSubmit();
                  }}
                  type="button"
                >
                  {isPending ? "Adding..." : "Add Repository"}
                </AlertDialogAction>
              )}
            </form.Subscribe>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
