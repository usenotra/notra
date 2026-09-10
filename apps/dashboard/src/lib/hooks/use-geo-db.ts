"use client";

import type {
  GeoCompetitor,
  GeoPromptSequence,
  GeoScopeInput,
  GeoTrackedPrompt,
} from "@notra/geo-core/types/geo";
import { mergePromptTags } from "@notra/geo-core/utils/geo-prompt-tags";
import type { Transaction } from "@tanstack/react-db";
import { useDbClient, useLiveQuery } from "@tanstack/react-db";
import { useCallback, useSyncExternalStore } from "react";
import { toast } from "sonner";

import { useGeoProjectScope } from "@/components/providers/geo-project-provider";
import {
  geoCollectionId,
  geoCompetitorsCollection,
  geoPromptsCollection,
  geoSequencesCollection,
  geoShelfCollection,
  getGeoShelfSampleData,
  subscribeToGeoShelfSampleData,
} from "@/lib/db/geo-collections";
import {
  clearRowPending,
  getPendingRows,
  markRowPending,
  subscribeToPendingRows,
} from "@/lib/db/pending-rows";
import type {
  GeoShelfDbApi,
  GeoShelfOpportunityWrite,
  GeoShelfPlacementStatus,
  GeoShelfSource,
} from "@/types/geo-shelf";
import { toErrorMessage } from "@/utils/error-message";
import { mergeShelfOpportunity } from "@/utils/geo-shelf";

function usePendingRows(name: string, scope: GeoScopeInput) {
  const collectionId = geoCollectionId(name, scope);

  const pendingIds = useSyncExternalStore(
    subscribeToPendingRows,
    () => getPendingRows(collectionId),
    () => getPendingRows(collectionId)
  );

  const track = useCallback(
    (rowId: string, transaction: Transaction, fallback: string) => {
      markRowPending(collectionId, rowId);
      transaction.isPersisted.promise
        .catch((error: unknown) => {
          toast.error(toErrorMessage(error, fallback));
        })
        .finally(() => {
          clearRowPending(collectionId, rowId);
        });
    },
    [collectionId]
  );

  return { pendingIds, track };
}

export function useGeoPromptsDb(organizationId: string) {
  const { projectId } = useGeoProjectScope();
  const dbClient = useDbClient();
  const definition = geoPromptsCollection({ organizationId, projectId });
  const collection = dbClient.collection(definition);
  const { pendingIds, track } = usePendingRows("prompts", {
    organizationId,
    projectId,
  });

  const { data } = useLiveQuery({
    query: (q) => q.from({ prompt: definition }),
  });

  const prompts: GeoTrackedPrompt[] = data ?? [];

  const togglePrompt = (promptId: string, enabled: boolean) => {
    track(
      promptId,
      collection.update(promptId, (draft) => {
        draft.enabled = enabled;
      }),
      "Failed to update prompt"
    );
  };

  const removePrompts = (promptIds: string[]) => {
    for (const promptId of promptIds) {
      track(promptId, collection.delete(promptId), "Failed to remove prompt");
    }
  };

  const setPromptTags = (promptId: string, tags: string[]) => {
    track(
      promptId,
      collection.update(promptId, (draft) => {
        draft.tags = tags;
      }),
      "Failed to update tags"
    );
  };

  const addTagsToPrompts = (promptIds: string[], tags: string[]) => {
    for (const promptId of promptIds) {
      track(
        promptId,
        collection.update(promptId, (draft) => {
          draft.tags = mergePromptTags(draft.tags, tags);
        }),
        "Failed to update tags"
      );
    }
  };

  const addPrompt = (prompt: string) => {
    const id = crypto.randomUUID();
    track(
      id,
      collection.insert({
        id,
        prompt,
        enabled: true,
        source: "custom",
        tags: [],
        createdAt: new Date().toISOString(),
      }),
      "Failed to add prompt"
    );
  };

  return {
    prompts,
    pendingPromptIds: pendingIds,
    togglePrompt,
    removePrompts,
    setPromptTags,
    addTagsToPrompts,
    addPrompt,
  };
}

export function useGeoCompetitorsDb(organizationId: string) {
  const { projectId } = useGeoProjectScope();
  const dbClient = useDbClient();
  const definition = geoCompetitorsCollection({ organizationId, projectId });
  const collection = dbClient.collection(definition);
  const { pendingIds, track } = usePendingRows("competitors", {
    organizationId,
    projectId,
  });

  const { data } = useLiveQuery({
    query: (q) => q.from({ competitor: definition }),
  });

  const competitors: GeoCompetitor[] = data ?? [];

  const saveCompetitor = (competitor: GeoCompetitor) => {
    const existing = collection.get(competitor.id);
    const transaction = existing
      ? collection.update(competitor.id, (draft) => {
          Object.assign(draft, competitor);
        })
      : collection.insert(competitor);
    track(competitor.id, transaction, "Failed to save competitor");
  };

  const removeCompetitor = (competitorId: string) => {
    track(
      competitorId,
      collection.delete(competitorId),
      "Failed to remove competitor"
    );
  };

  return {
    competitors,
    pendingCompetitorIds: pendingIds,
    saveCompetitor,
    removeCompetitor,
  };
}

export function useGeoSequencesDb(organizationId: string) {
  const { projectId } = useGeoProjectScope();
  const dbClient = useDbClient();
  const definition = geoSequencesCollection({ organizationId, projectId });
  const collection = dbClient.collection(definition);
  const { pendingIds, track } = usePendingRows("sequences", {
    organizationId,
    projectId,
  });

  const { data, isLoading } = useLiveQuery({
    query: (q) => q.from({ sequence: definition }),
  });

  const sequences: GeoPromptSequence[] = data ?? [];

  const addSequence = (name: string, steps: string[]) => {
    const id = crypto.randomUUID();
    track(
      id,
      collection.insert({
        id,
        name,
        steps,
        enabled: true,
        createdAt: new Date().toISOString(),
      }),
      "Failed to add conversation"
    );
  };

  const updateSequence = (
    sequenceId: string,
    changes: Partial<Pick<GeoPromptSequence, "name" | "steps" | "enabled">>
  ) => {
    track(
      sequenceId,
      collection.update(sequenceId, (draft) => {
        Object.assign(draft, changes);
      }),
      "Failed to update conversation"
    );
  };

  const removeSequence = (sequenceId: string) => {
    track(
      sequenceId,
      collection.delete(sequenceId),
      "Failed to remove conversation"
    );
  };

  return {
    sequences,
    isLoading,
    pendingSequenceIds: pendingIds,
    addSequence,
    updateSequence,
    removeSequence,
  };
}

export function useGeoShelfDb(organizationId: string): GeoShelfDbApi {
  const { projectId } = useGeoProjectScope();
  const dbClient = useDbClient();
  const definition = geoShelfCollection({ organizationId, projectId });
  const collection = dbClient.collection(definition);
  const { pendingIds, track } = usePendingRows("shelf", {
    organizationId,
    projectId,
  });

  const { data, isLoading } = useLiveQuery({
    query: (q) => q.from({ shelf: definition }),
  });

  const readSampleData = () =>
    getGeoShelfSampleData({ organizationId, projectId });
  const isSampleData = useSyncExternalStore(
    subscribeToGeoShelfSampleData,
    readSampleData,
    readSampleData
  );

  const sources: GeoShelfSource[] = data ?? [];

  const addSource = (source: GeoShelfSource) => {
    track(source.id, collection.insert(source), "Failed to add shelf");
  };

  const updateOpportunity = (
    sourceId: string,
    changes: Partial<GeoShelfOpportunityWrite>
  ) => {
    const nowIso = new Date().toISOString();
    track(
      sourceId,
      collection.update(sourceId, (draft) => {
        draft.opportunity = mergeShelfOpportunity(
          draft.opportunity,
          changes,
          nowIso
        );
        draft.updatedAt = nowIso;
      }),
      "Failed to update ticket"
    );
  };

  const setPlacementStatus = (
    sourceId: string,
    competitorId: string | null,
    status: GeoShelfPlacementStatus
  ) => {
    const nowIso = new Date().toISOString();
    track(
      sourceId,
      collection.update(sourceId, (draft) => {
        for (const placement of draft.placements) {
          if (placement.competitorId === competitorId) {
            placement.status = status;
            placement.evidence = "manual";
            placement.checkedAt = nowIso;
            if (status !== "present") {
              placement.position = null;
              placement.hasLink = false;
            }
          }
        }
        draft.updatedAt = nowIso;
      }),
      "Failed to update placement"
    );
  };

  return {
    sources,
    isLoading,
    isSampleData,
    pendingSourceIds: pendingIds,
    addSource,
    updateOpportunity,
    setPlacementStatus,
  };
}
