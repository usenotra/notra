"use client";

import { useOrganizationsContext } from "@/components/providers/organization-provider";
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
} from "@notra/ui/components/ui/alert-dialog";
import { Badge } from "@notra/ui/components/ui/badge";
import { Button } from "@notra/ui/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@notra/ui/components/ui/field";
import { Input } from "@notra/ui/components/ui/input";
import { Skeleton } from "@notra/ui/components/ui/skeleton";

import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import type React from "react";
import { isValidElement, useState } from "react";
import { toast } from "sonner";
import { parseGitHubUrl } from "@/lib/utils/github";
import type {
  AddIntegrationDialogProps,
  GitHubIntegration,
  GitHubRepoInfo,
} from "@/types/integrations";
import { QUERY_KEYS } from "@/utils/query-keys";
import {
  type AddGitHubIntegrationFormValues,
  addGitHubIntegrationFormSchema,
} from "@/utils/schemas/integrations";
import { WebhookSetupDialog } from "./wehook-setup-dialog";

export function AddIntegrationDialog({
  organizationId: propOrganizationId,
  organizationSlug: propOrganizationSlug,
  onSuccess,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  trigger,
}: AddIntegrationDialogProps) {
  const router = useRouter();
  const { activeOrganization } = useOrganizationsContext();
  const organizationId = propOrganizationId ?? activeOrganization?.id;
  const organizationSlug = propOrganizationSlug ?? activeOrganization?.slug;
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;
  const queryClient = useQueryClient();
  const [createdIntegration, setCreatedIntegration] =
    useState<GitHubIntegration | null>(null);
  const [showWebhookDialog, setShowWebhookDialog] = useState(false);

  const mutation = useMutation({
    mutationFn: async (values: AddGitHubIntegrationFormValues) => {
      if (!organizationId) {
        throw new Error("Organization ID is required");
      }
      const parsed = parseGitHubUrl(values.repoUrl);
      if (!parsed) {
        throw new Error("Invalid GitHub repository URL");
      }

      const response = await fetch(
        `/api/organizations/${organizationId}/integrations`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            owner: parsed.owner,
            repo: parsed.repo,
            token: values.token?.trim() || null,
            type: "github" as const,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create integration");
      }

      return data;
    },
    onSuccess: (integration: GitHubIntegration) => {
      if (organizationId) {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.INTEGRATIONS.all(organizationId),
        });
      }
      toast.success("GitHub integration added successfully");
      setOpen(false);
      form.reset();
      onSuccess?.();

      // Show webhook setup dialog
      setCreatedIntegration(integration);
      setShowWebhookDialog(true);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const form = useForm({
    defaultValues: {
      repoUrl: "",
      token: "",
    },
    onSubmit: ({ value }) => {
      // Validate with Zod before submitting
      const validationResult = addGitHubIntegrationFormSchema.safeParse(value);
      if (!validationResult.success) {
        return;
      }
      mutation.mutate(validationResult.data);
    },
  });

  const [repoInfo, setRepoInfo] = useState<GitHubRepoInfo | null>(null);

  if (!organizationId) {
    return null;
  }

  const triggerElement =
    trigger && isValidElement(trigger) ? (
      <AlertDialogTrigger render={trigger as React.ReactElement} />
    ) : null;

  const handleWebhookDialogClose = (isOpen: boolean) => {
    if (!isOpen) {
      // Navigate to the integration page when webhook dialog is closed
      if (organizationSlug && createdIntegration?.id) {
        router.push(
          `/${organizationSlug}/integrations/github/${createdIntegration.id}`,
        );
      }
      setShowWebhookDialog(false);
      setCreatedIntegration(null);
    }
  };

  const firstRepository = createdIntegration?.repositories?.[0];

  return (
    <>
      <AlertDialog onOpenChange={setOpen} open={open}>
        {triggerElement}
        <AlertDialogContent className="sm:max-w-[600px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl">
              Add GitHub Integration
            </AlertDialogTitle>
            <AlertDialogDescription>
              Connect a GitHub repository to enable AI-powered outputs like
              changelogs, blog posts, and tweets.
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
                name="repoUrl"
                validators={{
                  onChange: addGitHubIntegrationFormSchema.shape.repoUrl,
                  onChangeAsyncDebounceMs: 300,
                  onChangeAsync: ({ value }) => {
                    if (!value.trim()) {
                      setRepoInfo(null);
                      return;
                    }
                    const parsed = parseGitHubUrl(value);
                    if (parsed) {
                      setRepoInfo(parsed);
                    } else {
                      setRepoInfo(null);
                    }
                  },
                }}
              >
                {(field) => (
                  <Field>
                    <FieldLabel>GitHub Repository</FieldLabel>
                    <Input
                      disabled={mutation.isPending}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="https://github.com/facebook/react or facebook/react"
                      value={field.state.value}
                    />
                    {field.state.meta.errors.length > 0 ? (
                      <p className="mt-1 text-destructive text-sm">
                        {typeof field.state.meta.errors[0] === "string"
                          ? field.state.meta.errors[0]
                          : ((
                              field.state.meta.errors[0] as { message?: string }
                            )?.message ?? "Invalid value")}
                      </p>
                    ) : null}
                    {repoInfo ? (
                      <div className="mt-2 flex items-center gap-2">
                        <Badge
                          className="font-mono text-xs"
                          variant="secondary"
                        >
                          {repoInfo.owner}/{repoInfo.repo}
                        </Badge>
                        <a
                          className="text-primary text-xs hover:underline"
                          href={repoInfo.fullUrl}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          View on GitHub
                        </a>
                      </div>
                    ) : null}
                  </Field>
                )}
              </form.Field>

              <form.Field name="token">
                {(field) => (
                  <Field>
                    <div className="flex items-baseline gap-2">
                      <FieldLabel>Personal Access Token</FieldLabel>
                      <span className="text-muted-foreground text-xs">
                        (optional)
                      </span>
                    </div>
                    <p className="mb-2 text-muted-foreground text-xs">
                      Only required for private repositories. Public repos work
                      without a token.
                    </p>
                    <Input
                      disabled={mutation.isPending}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="ghp_... (leave empty for public repos)"
                      value={field.state.value}
                    />
                    <p className="mt-1 text-muted-foreground text-xs">
                      <a
                        className="text-primary hover:underline"
                        href="https://github.com/settings/tokens/new?scopes=repo&description=Notra%20Integration"
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        Generate a token on GitHub
                      </a>{" "}
                      with <code className="text-xs">repo</code> scope
                    </p>
                  </Field>
                )}
              </form.Field>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={mutation.isPending}>
                Cancel
              </AlertDialogCancel>
              <form.Subscribe selector={(state) => [state.canSubmit]}>
                {([canSubmit]) => (
                  <AlertDialogAction
                    disabled={!canSubmit || mutation.isPending}
                    onClick={(e) => {
                      e.preventDefault();
                      form.handleSubmit();
                    }}
                    type="button"
                  >
                    {mutation.isPending ? "Adding..." : "Add Integration"}
                  </AlertDialogAction>
                )}
              </form.Subscribe>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
      {firstRepository && organizationId ? (
        <WebhookSetupDialog
          onOpenChange={handleWebhookDialogClose}
          open={showWebhookDialog}
          organizationId={organizationId}
          owner={firstRepository.owner}
          repo={firstRepository.repo}
          repositoryId={firstRepository.id}
        />
      ) : null}
    </>
  );
}
