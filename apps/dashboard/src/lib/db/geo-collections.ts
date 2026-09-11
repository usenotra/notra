import { isGeoAutoPromptId } from "@notra/geo-core/geo/prompts";
import type {
  GeoCompetitor,
  GeoPromptSequence,
  GeoScopeInput,
  GeoTrackedPrompt,
} from "@notra/geo-core/types/geo";
import { ORPCError } from "@orpc/client";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { collectionOptions } from "@tanstack/react-db";
import type { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { dashboardOrpc } from "@/lib/orpc/query";
import type { GeoCollectionSpec } from "@/types/geo-db";
import type { GeoShelfSource } from "@/types/geo-shelf";
import {
  changedShelfOpportunityWrite,
  changedShelfPlacementWrites,
  toShelfOpportunityWrite,
  toShelfPlacementWrites,
} from "@/utils/geo-shelf";

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
      queryFn: async () => {
        try {
          return await spec.fetch(scope);
        } catch (error) {
          // The upgrade gate handles entitlement denials, not load-error toasts.
          if (
            !(error instanceof ORPCError && error.code === "PAYMENT_REQUIRED")
          ) {
            toast.error(spec.errorMessage, { id });
          }
          throw error;
        }
      },
      getKey: spec.getKey,
      onInsert: async ({ transaction }) => {
        for (const mutation of transaction.mutations) {
          await spec.insert?.(scope, mutation.modified);
        }
        await spec.invalidateLegacy(queryClient, scope);
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
        await spec.invalidateLegacy(queryClient, scope);
      },
      onDelete: async ({ transaction }) => {
        for (const mutation of transaction.mutations) {
          await spec.remove?.(scope, mutation.original);
        }
        await spec.invalidateLegacy(queryClient, scope);
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
  invalidateLegacy: (queryClient, scope) =>
    Promise.all([
      queryClient.invalidateQueries({
        queryKey: dashboardOrpc.geo.promptsList.queryKey({ input: scope }),
      }),
      queryClient.invalidateQueries({
        queryKey: dashboardOrpc.geo.settings.queryKey({ input: scope }),
      }),
    ]),
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
  invalidateLegacy: (queryClient, scope) =>
    Promise.all([
      queryClient.invalidateQueries({
        queryKey: dashboardOrpc.geo.competitors.queryKey({ input: scope }),
      }),
      queryClient.invalidateQueries({
        queryKey: dashboardOrpc.geo.competitorShare.queryKey({
          input: scope,
        }),
      }),
      queryClient.invalidateQueries({
        queryKey: dashboardOrpc.geo.settings.queryKey({ input: scope }),
      }),
    ]),
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
    invalidateLegacy: (queryClient, scope) =>
      queryClient.invalidateQueries({
        queryKey: dashboardOrpc.geo.sequencesList.queryKey({ input: scope }),
      }),
  });

const shelfSampleDataByScope = new Map<string, boolean>();
const shelfSampleDataListeners = new Set<() => void>();

function setShelfSampleData(scope: GeoScopeInput, isSampleData: boolean) {
  const key = scopeKey(scope);
  if (shelfSampleDataByScope.get(key) === isSampleData) {
    return;
  }
  shelfSampleDataByScope.set(key, isSampleData);
  for (const listener of shelfSampleDataListeners) {
    listener();
  }
}

export function subscribeToGeoShelfSampleData(callback: () => void) {
  shelfSampleDataListeners.add(callback);
  return () => {
    shelfSampleDataListeners.delete(callback);
  };
}

export function getGeoShelfSampleData(scope: GeoScopeInput): boolean {
  return shelfSampleDataByScope.get(scopeKey(scope)) ?? false;
}

export const geoShelfCollection = createCollectionFactory<GeoShelfSource>({
  name: "shelf",
  errorMessage: "Failed to load shelf space",
  fetch: async (scope) => {
    const response = await dashboardOrpc.geo.shelfList.call(scope);
    setShelfSampleData(scope, response.isSampleData);
    return response.sources;
  },
  getKey: (item) => item.id,
  // The id is generated by the server; the optimistic row keeps its temporary
  // id only until the collection refetches, same as the competitors collection.
  insert: (scope, item) =>
    dashboardOrpc.geo.shelfCreate.call({
      ...scope,
      url: item.url,
      title: item.title,
      kind: item.kind,
      placements: toShelfPlacementWrites(item),
      opportunity: toShelfOpportunityWrite(item),
    }),
  update: (scope, key, modified, original) =>
    dashboardOrpc.geo.shelfUpdate.call({
      ...scope,
      sourceId: key,
      title: modified.title === original.title ? undefined : modified.title,
      kind: modified.kind === original.kind ? undefined : modified.kind,
      placements: changedShelfPlacementWrites(modified, original),
      opportunity: changedShelfOpportunityWrite(modified, original),
    }),
  invalidateLegacy: (queryClient, scope) =>
    queryClient.invalidateQueries({
      queryKey: dashboardOrpc.geo.shelfList.queryKey({ input: scope }),
    }),
});
