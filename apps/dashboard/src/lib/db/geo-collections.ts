import { isGeoAutoPromptId } from "@notra/geo-core/geo/prompts";
import type {
  GeoCompetitor,
  GeoProject,
  GeoPromptSequence,
  GeoScopeInput,
  GeoTrackedPrompt,
} from "@notra/geo-core/types/geo";
import { ORPCError } from "@orpc/client";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { collectionOptions } from "@tanstack/react-db";
import type { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  rejectProjectCreateHandoff,
  resolveProjectCreateHandoff,
} from "@/lib/db/geo-project-create-handoff";
import { dashboardOrpc } from "@/lib/orpc/query";
import type { GeoCollectionSpec } from "@/types/geo-db";

// Bounded retries instead of an unbounded error poll on every dashboard page.
const GEO_PROJECTS_RETRY_COUNT = 3;

function scopeKey(scope: GeoScopeInput): string {
  return `${scope.organizationId}:${scope.projectId ?? "all"}`;
}

export function geoCollectionId(name: string, scope: GeoScopeInput) {
  return `geo-${name}:${scopeKey(scope)}`;
}

export function geoDbOrgQueryKey(name: string, organizationId: string) {
  return ["geo-db", name, organizationId] as const;
}

export function geoDbQueryKey(name: string, scope: GeoScopeInput) {
  return [
    ...geoDbOrgQueryKey(name, scope.organizationId),
    scope.projectId ?? null,
  ] as const;
}

function buildScopedCollection<T extends object>(
  spec: GeoCollectionSpec<T>,
  scope: GeoScopeInput
) {
  const id = geoCollectionId(spec.name, scope);

  return collectionOptions(id, (client) => {
    const queryClient = client.requireDependency<QueryClient>("queryClient");

    return queryCollectionOptions({
      id,
      queryKey: geoDbQueryKey(spec.name, scope),
      queryClient,
      ...(spec.retry !== undefined ? { retry: spec.retry } : {}),
      ...(spec.showRetryAction
        ? {
            meta: {
              errorMessage: spec.errorMessage,
              showRetryAction: true,
            },
          }
        : {}),
      queryFn: async () => {
        try {
          return await spec.fetch(scope);
        } catch (error) {
          // The upgrade gate handles entitlement denials, not load-error toasts.
          if (
            !(
              error instanceof ORPCError && error.code === "PAYMENT_REQUIRED"
            ) &&
            !spec.showRetryAction
          ) {
            toast.error(spec.errorMessage, { id });
          }
          throw error;
        }
      },
      getKey: spec.getKey,
      onInsert: async ({ transaction }) => {
        try {
          for (const mutation of transaction.mutations) {
            const result = await spec.insert?.(scope, mutation.modified);
            if (spec.name === "projects" && result) {
              resolveProjectCreateHandoff(transaction.id, result as GeoProject);
            }
          }
        } catch (error) {
          if (spec.name === "projects") {
            rejectProjectCreateHandoff(transaction.id, error);
          }
          throw error;
        }
      },
      onUpdate: async ({ transaction }) => {
        for (const mutation of transaction.mutations) {
          await spec.update?.(
            scope,
            String(mutation.key),
            mutation.modified,
            mutation.original
          );
        }
      },
      onDelete: async ({ transaction }) => {
        for (const mutation of transaction.mutations) {
          await spec.remove?.(scope, mutation.original);
        }
      },
    });
  });
}

function createCollectionFactory<T extends object>(spec: GeoCollectionSpec<T>) {
  const definitions = new Map<
    string,
    ReturnType<typeof buildScopedCollection<T>>
  >();

  return (scope: GeoScopeInput) => {
    const key = scopeKey(scope);
    const existing = definitions.get(key);
    if (existing) {
      return existing;
    }
    const definition = buildScopedCollection(spec, scope);
    definitions.set(key, definition);
    return definition;
  };
}

export const geoPromptsCollection = createCollectionFactory<GeoTrackedPrompt>({
  name: "prompts",
  errorMessage: "Failed to load tracked prompts",
  fetch: async (scope) => {
    const response = await dashboardOrpc.geo.promptsList.call(scope);
    return response.prompts;
  },
  getKey: (item) => item.id,
  insert: (scope, item) =>
    dashboardOrpc.geo.promptsCreate.call({
      ...scope,
      id: item.id,
      prompt: item.prompt,
      tags: item.tags,
    }),
  update: (scope, key, modified) =>
    modified.source === "auto" || isGeoAutoPromptId(key)
      ? dashboardOrpc.geo.promptsToggleAuto.call({
          ...scope,
          promptId: key,
          enabled: modified.enabled,
        })
      : dashboardOrpc.geo.promptsUpdate.call({
          ...scope,
          promptId: key,
          enabled: modified.enabled,
          tags: modified.tags,
        }),
  remove: (scope, original) =>
    dashboardOrpc.geo.promptsDelete.call({ ...scope, promptId: original.id }),
});

export const geoProjectsCollection = createCollectionFactory<GeoProject>({
  name: "projects",
  errorMessage: "Failed to load projects",
  showRetryAction: true,
  retry: GEO_PROJECTS_RETRY_COUNT,
  fetch: async (scope) => {
    const response = await dashboardOrpc.geo.projectsList.call({
      organizationId: scope.organizationId,
    });
    return response.projects;
  },
  getKey: (item) => item.id,
  insert: (scope, item) =>
    dashboardOrpc.geo.projectsCreate.call({
      organizationId: scope.organizationId,
      name: item.name,
      brandSettingsId: item.brandSettingsId,
    }),
  remove: (scope, original) =>
    dashboardOrpc.geo.projectsDelete.call({
      organizationId: scope.organizationId,
      projectId: original.id,
    }),
});

export const geoCompetitorsCollection = createCollectionFactory<GeoCompetitor>({
  name: "competitors",
  errorMessage: "Failed to load competitors",
  fetch: async (scope) => {
    const response = await dashboardOrpc.geo.competitors.call(scope);
    return response.competitors;
  },
  getKey: (item) => item.id,
  insert: (scope, item) =>
    dashboardOrpc.geo.competitorUpsert.call({
      ...scope,
      name: item.name,
      domain: item.domain,
      synonyms: item.synonyms,
      kind: item.kind,
      color: item.color,
    }),
  update: (scope, _key, modified, original) =>
    dashboardOrpc.geo.competitorUpsert.call({
      ...scope,
      previousName: original.name,
      name: modified.name,
      domain: modified.domain,
      synonyms: modified.synonyms,
      kind: modified.kind,
      color: modified.color,
    }),
  remove: (scope, original) =>
    dashboardOrpc.geo.competitorDelete.call({
      ...scope,
      name: original.name,
    }),
});

export const geoSequencesCollection =
  createCollectionFactory<GeoPromptSequence>({
    name: "sequences",
    errorMessage: "Failed to load conversations",
    fetch: async (scope) => {
      const response = await dashboardOrpc.geo.sequencesList.call(scope);
      return response.sequences;
    },
    getKey: (item) => item.id,
    insert: (scope, item) =>
      dashboardOrpc.geo.sequencesCreate.call({
        ...scope,
        id: item.id,
        name: item.name,
        steps: item.steps,
      }),
    update: (scope, key, modified) =>
      dashboardOrpc.geo.sequencesUpdate.call({
        ...scope,
        sequenceId: key,
        name: modified.name,
        steps: modified.steps,
        enabled: modified.enabled,
      }),
    remove: (scope, original) =>
      dashboardOrpc.geo.sequencesDelete.call({
        ...scope,
        sequenceId: original.id,
      }),
  });
