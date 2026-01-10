"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import type React from "react";
import { isValidElement, useState } from "react";
import { toast } from "sonner";
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
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { parseGitHubUrl } from "@/lib/utils/github";
import type {
  AddIntegrationDialogProps,
  GitHubRepoInfo,
} from "@/types/integrations";
import {
  type AddGitHubIntegrationFormValues,
  addGitHubIntegrationFormSchema,
} from "@/utils/schemas/integrations";
import { api } from "../../../convex/_generated/api";

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
  const [isPending, setIsPending] = useState(false);

  const createIntegration = useMutation(api.integrations.create);

  const handleSubmit = async (values: AddGitHubIntegrationFormValues) => {
    if (!organizationId) {
      throw new Error("Organization ID is required");
    }
    const parsed = parseGitHubUrl(values.repoUrl);
    if (!parsed) {
      throw new Error("Invalid GitHub repository URL");
    }

    setIsPending(true);
    try {
      const integrationId = await createIntegration({
        organizationId,
        owner: parsed.owner,
        repo: parsed.repo,
        token: values.token?.trim() || undefined,
      });

      toast.success("GitHub integration added successfully");
      setOpen(false);
      form.reset();
      onSuccess?.();

      if (organizationSlug && integrationId) {
        router.push(
          `/${organizationSlug}/integrations/github/${integrationId}`
        );
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create integration"
      );
    } finally {
      setIsPending(false);
    }
  };

  const form = useForm({
    defaultValues: {
      repoUrl: "",
      token: "",
    },
    onSubmit: ({ value }) => {
      const validationResult = addGitHubIntegrationFormSchema.safeParse(value);
      if (!validationResult.success) {
        return;
      }
      handleSubmit(validationResult.data);
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

  return (
    <>
      {triggerElement}
      <AlertDialog onOpenChange={setOpen} open={open}>
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
                      disabled={isPending}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="https://github.com/facebook/react or facebook/react"
                      value={field.state.value}
                    />
                    {field.state.meta.errors.length > 0 ? (
                      <p className="mt-1 text-destructive text-sm">
                        {typeof field.state.meta.errors[0] === "string"
                          ? field.state.meta.errors[0]
                          : String(field.state.meta.errors[0])}
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
                    <Textarea
                      disabled={isPending}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="ghp_... (leave empty for public repos)"
                      rows={3}
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
              <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
              <form.Subscribe selector={(state) => [state.canSubmit]}>
                {([canSubmit]) => (
                  <AlertDialogAction
                    disabled={!canSubmit || isPending}
                    onClick={(e) => {
                      e.preventDefault();
                      form.handleSubmit();
                    }}
                    type="button"
                  >
                    {isPending ? "Adding..." : "Add Integration"}
                  </AlertDialogAction>
                )}
              </form.Subscribe>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
