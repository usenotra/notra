"use client";

import { scheduleDestinationsForContentType } from "@notra/ai/utils/schedule-destinations";

import { useConnectedAccounts } from "@/lib/hooks/use-connected-accounts";
import { useGitHubPublishRepositorySelection } from "@/lib/hooks/use-github-publish-repository-selection";
import type {
  ScheduleDestinationOptions,
  ScheduleFormState,
} from "@/types/content/schedule";
import {
  buildScheduleDestinations,
  resolveScheduleSocialOption,
} from "@/utils/content-calendar";

/** What each destination of the schedule dialog offers, and what goes out. */
export function useScheduleDestinations({
  organizationId,
  contentType,
  form,
}: {
  organizationId: string;
  contentType: string;
  form: ScheduleFormState;
}): ScheduleDestinationOptions {
  const supported = scheduleDestinationsForContentType(contentType);
  const github = useGitHubPublishRepositorySelection({
    organizationId,
    contentType,
    repositoryId: form.repositoryId,
    enabled: supported.github,
  });
  const accountsQuery = useConnectedAccounts(organizationId);
  const social = supported.socialPlatform
    ? resolveScheduleSocialOption({
        platform: supported.socialPlatform,
        connectedAccounts: accountsQuery.data?.accounts ?? [],
        loaded: accountsQuery.data !== undefined,
        loadFailed: accountsQuery.isError && !accountsQuery.data,
        enabled: form.socialEnabled,
        accountId: form.accountId,
      })
    : null;

  const { destinations, blocked } = buildScheduleDestinations({
    form,
    githubOn: supported.github && form.githubEnabled,
    github,
    social,
  });

  return {
    github: supported.github ? github.fieldProps : null,
    social,
    destinations,
    blocked,
  };
}
