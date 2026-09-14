"use client";

import type {
  GeoCompetitor,
  GeoProject,
  GeoPromptSequence,
  GeoScopeInput,
  GeoTrackedPrompt,
} from "@notra/geo-core/types/geo";
import { mergePromptTags } from "@notra/geo-core/utils/geo-prompt-tags";
import type { Transaction } from "@tanstack/react-db";
import {
  and,
  eq,
  inArray,
  isNull,
  not,
  or,
  useDbClient,
  useLiveQuery,
} from "@tanstack/react-db";
import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";

import { useGeoProjectScope } from "@/components/providers/geo-project-provider";
import {
  GEO_PROJECT_CREATE_TIMEOUT_MS,
  GeoProjectCreateTimeoutError,
} from "@/constants/geo-projects";
import {
  geoCollectionId,
  geoCompetitorsCollection,
  geoProjectsCollection,
  geoPromptsCollection,
  geoSequencesCollection,
} from "@/lib/db/geo-collections";
import {
  abandonProjectCreateHandoff,
  waitForProjectCreateHandoff,
} from "@/lib/db/geo-project-create-handoff";
import {
  clearPendingDeleteSnapshot,
  getPendingDeleteSnapshots,
  rememberPendingDeleteSnapshot,
  subscribeToPendingDeleteSnapshots,
} from "@/lib/db/geo-project-pending-deletes";
import {
  clearRowPending,
  getPendingRows,
  markRowPending,
  subscribeToPendingRows,
} from "@/lib/db/pending-rows";
import type { GeoProjectCreateInput } from "@/types/geo";
import { toErrorMessage } from "@/utils/error-message";
import { sortGeoProjectsOldestFirst } from "@/utils/geo-projects";

/**
 * Dialogs that stay mounted while closed pass `enabled: false` so the collection
 * does not start a full-table sync before the user opens them. A disabled live
 * query returns no data but leaves the collection handle usable for mutations.
 */
interface GeoDbOptions {
  enabled?: boolean;
}

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

export function useGeoPromptsDb(
  organizationId: string,
  options?: GeoDbOptions
) {
  const isEnabled = options?.enabled ?? true;
  const { projectId } = useGeoProjectScope();
  const dbClient = useDbClient();
  const definition = geoPromptsCollection({ organizationId, projectId });
  const collection = dbClient.collection(definition);
  const { pendingIds, track } = usePendingRows("prompts", {
    organizationId,
    projectId,
  });

  const { data, isLoading } = useLiveQuery({
    queryKey: [definition.id, isEnabled],
    query: (q) => q.from({ prompt: definition }),
    startSync: isEnabled,
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
    isLoading,
    pendingPromptIds: pendingIds,
    togglePrompt,
    removePrompts,
    setPromptTags,
    addTagsToPrompts,
    addPrompt,
  };
}

export function useGeoProjectsDb(
  organizationId: string,
  options?: GeoDbOptions
) {
  const isEnabled = options?.enabled ?? true;
  const scope = { organizationId };
  const collectionId = geoCollectionId("projects", scope);
  const dbClient = useDbClient();
  const definition = geoProjectsCollection(scope);
  const collection = dbClient.collection(definition);
  const { pendingIds, track } = usePendingRows("projects", scope);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const pendingDeleteSnapshots = useSyncExternalStore(
    subscribeToPendingDeleteSnapshots,
    () => getPendingDeleteSnapshots(collectionId),
    () => getPendingDeleteSnapshots(collectionId)
  );

  const { data, isLoading, isError, isReady } = useLiveQuery({
    queryKey: [definition.id, isEnabled],
    query: (q) =>
      q
        .from({ project: definition })
        .orderBy(({ project }) => project.createdAt, "asc")
        .orderBy(({ project }) => project.id, "asc"),
    startSync: isEnabled && Boolean(organizationId),
  });

  const projects = useMemo(() => {
    const merged = new Map<string, GeoProject>();
    for (const project of data ?? []) {
      merged.set(project.id, project);
    }
    for (const [projectId, snapshot] of pendingDeleteSnapshots) {
      if (!merged.has(projectId)) {
        merged.set(projectId, snapshot);
      }
    }
    return sortGeoProjectsOldestFirst([...merged.values()]);
  }, [data, pendingDeleteSnapshots]);

  const createProject = async (
    input: GeoProjectCreateInput
  ): Promise<GeoProject> => {
    const trimmedName = input.name.trim();
    const tempId = crypto.randomUUID();
    setIsCreating(true);
    const transaction = collection.insert({
      id: tempId,
      name: trimmedName,
      brandSettingsId: input.brandSettingsId,
      createdAt: new Date().toISOString(),
    });
    const createdPromise = waitForProjectCreateHandoff(transaction.id);
    void createdPromise.catch(() => undefined);
    track(tempId, transaction, "Failed to create project");

    let persistError: unknown;
    await Promise.race([
      transaction.isPersisted.promise,
      new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new GeoProjectCreateTimeoutError()),
          GEO_PROJECT_CREATE_TIMEOUT_MS
        );
      }),
    ])
      .catch((error: unknown) => {
        persistError = error;
      })
      .finally(() => {
        abandonProjectCreateHandoff(transaction.id);
        setIsCreating(false);
      });

    if (persistError) {
      if (persistError instanceof GeoProjectCreateTimeoutError) {
        toast.error(toErrorMessage(persistError, "Failed to create project"));
      }
      throw persistError;
    }

    const created = await createdPromise.catch(() => null);
    if (!created) {
      const error = new Error("Failed to resolve created project");
      toast.error(toErrorMessage(error, "Failed to create project"));
      throw error;
    }

    toast.success("Project created");
    return created;
  };

  const deleteProject = async (projectId: string) => {
    const snapshot = projects.find((project) => project.id === projectId);
    if (snapshot) {
      rememberPendingDeleteSnapshot(collectionId, snapshot);
    }

    setIsDeleting(true);
    const transaction = collection.delete(projectId);
    track(projectId, transaction, "Failed to delete project");
    await transaction.isPersisted.promise
      .then(() => {
        toast.success("Project deleted");
      })
      .finally(() => {
        clearPendingDeleteSnapshot(collectionId, projectId);
        setIsDeleting(false);
      });
  };

  return {
    projects,
    isLoading,
    isError,
    isReady,
    pendingProjectIds: pendingIds,
    isCreating,
    isDeleting,
    createProject,
    deleteProject,
  };
}

export function useGeoCompetitorsDb(
  organizationId: string,
  options?: GeoDbOptions
) {
  const isEnabled = options?.enabled ?? true;
  const { projectId } = useGeoProjectScope();
  const dbClient = useDbClient();
  const definition = geoCompetitorsCollection({ organizationId, projectId });
  const collection = dbClient.collection(definition);
  const { pendingIds, track } = usePendingRows("competitors", {
    organizationId,
    projectId,
  });

  const { data } = useLiveQuery({
    queryKey: [definition.id, isEnabled],
    query: (q) =>
      q
        .from({ competitor: definition })
        .orderBy(({ competitor }) => competitor.name, "asc"),
    startSync: isEnabled,
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

export function useGeoSequencesDb(
  organizationId: string,
  options?: GeoDbOptions
) {
  const isEnabled = options?.enabled ?? true;
  const { projectId } = useGeoProjectScope();
  const dbClient = useDbClient();
  const definition = geoSequencesCollection({ organizationId, projectId });
  const collection = dbClient.collection(definition);
  const { pendingIds, track } = usePendingRows("sequences", {
    organizationId,
    projectId,
  });

  const { data, isLoading } = useLiveQuery({
    queryKey: [definition.id, isEnabled],
    query: (q) => q.from({ sequence: definition }),
    startSync: isEnabled,
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
