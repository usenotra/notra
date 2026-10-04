"use client";

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from "@notra/ui/components/shared/responsive-dialog";
import { useStore } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslations } from "use-intl";

import { useEventTriggerForm } from "@/lib/hooks/use-event-trigger-form";
import { dashboardOrpc } from "@/lib/orpc/query";
import type { CreateEventTriggerDialogProps } from "@/types/automation/event-trigger";

import { EventTriggerDialogFooter } from "./event-trigger-dialog-footer";
import { EventTriggerEventSection } from "./event-trigger-event-section";
import { EventTriggerFormatSection } from "./event-trigger-format-section";
import { EventTriggerRepositoriesSection } from "./event-trigger-repositories-section";
import { EventTriggerRulesSection } from "./event-trigger-rules-section";
import { RepositoryConnectionDialogs } from "./repository-connection-dialogs";

export function CreateEventTriggerDialog({
  organizationId,
  onSuccess,
  trigger,
  editTrigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: CreateEventTriggerDialogProps) {
  const t = useTranslations("automation.events.dialog");
  const isEditMode = !!editTrigger;
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (next: boolean) => {
    if (isControlled) {
      controlledOnOpenChange?.(next);
    } else {
      setInternalOpen(next);
    }
  };
  const [addRepoOpen, setAddRepoOpen] = useState(false);
  const dialogOpen = open && !addRepoOpen;

  const { form, isPending } = useEventTriggerForm({
    organizationId,
    editTrigger,
    open,
    onSuccess,
    onClose: () => setOpen(false),
  });

  const repositoryCount = useStore(
    form.store,
    (s) => s.values.repositoryIds.length
  );

  const { data: integrationsResponse, isLoading: isLoadingRepos } = useQuery(
    dashboardOrpc.integrations.list.queryOptions({
      input: { organizationId },
      enabled: !!organizationId && open,
    })
  );

  const { data: brandResponse } = useQuery(
    dashboardOrpc.brand.voices.list.queryOptions({
      input: { organizationId },
      enabled: !!organizationId && open,
    })
  );

  const brandVoices = brandResponse?.voices ?? [];

  const githubIntegrations =
    integrationsResponse?.integrations.filter(
      (integration) => integration.type === "github" && integration.enabled
    ) ?? [];
  const repos = githubIntegrations.flatMap((integration) =>
    integration.repositories.filter((repository) => repository.enabled)
  );
  const integrationOptions = repos.map((repository) => ({
    value: repository.id,
    label: repository.defaultBranch
      ? `${repository.owner}/${repository.repo} · ${repository.defaultBranch}`
      : `${repository.owner}/${repository.repo}`,
  }));
  const githubIntegrationId = githubIntegrations[0]?.id;

  const formError = useStore(form.store, (state) => {
    if (state.submissionAttempts === 0) {
      return null;
    }
    for (const meta of Object.values(state.fieldMeta)) {
      const errors = meta?.errors;
      if (errors && errors.length > 0) {
        const first = errors[0];
        if (typeof first === "string") {
          return first;
        }
        if (first && typeof first === "object" && "message" in first) {
          const message = (first as { message: unknown }).message;
          if (typeof message === "string") {
            return message;
          }
        }
      }
    }
    return null;
  });

  const handleOpenAddRepoFlow = () => {
    setAddRepoOpen(true);
  };

  return (
    <>
      <ResponsiveDialog onOpenChange={setOpen} open={dialogOpen}>
        {trigger && <ResponsiveDialogTrigger render={trigger} />}
        <ResponsiveDialogContent className="flex h-[85vh] max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
          <ResponsiveDialogHeader className="shrink-0 border-b p-4 pr-14">
            <ResponsiveDialogTitle className="text-base">
              {isEditMode ? t("editTitle") : t("newTitle")}
            </ResponsiveDialogTitle>
            <p className="text-muted-foreground text-sm">{t("description")}</p>
          </ResponsiveDialogHeader>

          <form
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
            onSubmit={(event) => {
              event.preventDefault();
              event.stopPropagation();
              form.handleSubmit();
            }}
          >
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="space-y-8 p-6">
                <EventTriggerFormatSection form={form} />
                <EventTriggerEventSection form={form} />
                <EventTriggerRepositoriesSection
                  form={form}
                  isLoading={isLoadingRepos}
                  onAddRepository={handleOpenAddRepoFlow}
                  options={integrationOptions}
                />
                <EventTriggerRulesSection
                  brandVoices={brandVoices}
                  form={form}
                />
              </div>
            </div>

            <EventTriggerDialogFooter
              errorMessage={formError}
              isEditMode={isEditMode}
              isPending={isPending}
              onCancel={() => setOpen(false)}
              repositoryCount={repositoryCount}
            />
          </form>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
      <RepositoryConnectionDialogs
        githubIntegrationId={githubIntegrationId}
        isEditMode={isEditMode}
        onOpenChange={(isOpen) => {
          setAddRepoOpen(isOpen);
        }}
        open={addRepoOpen}
        organizationId={organizationId}
      />
    </>
  );
}
