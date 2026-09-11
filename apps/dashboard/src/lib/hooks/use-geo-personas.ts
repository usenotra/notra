"use client";

import type { GeoWindowInput } from "@notra/geo-core/types/geo";
import type {
  GeoPersona,
  GeoPersonaResultsResponse,
  GeoPersonasResponse,
} from "@notra/geo-core/types/geo-personas";
import type { QueryClient } from "@tanstack/react-query";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { useGeoProjectScope } from "@/components/providers/geo-project-provider";
import { PERSONA_GENERATION_POLL_MS } from "@/constants/persona-generation";
import { dashboardOrpc } from "@/lib/orpc/query";
import type { GeoPersonaUpdateInput } from "@/types/geo-personas";
import type { PersonaGenerationJob } from "@/types/persona-generation";
import { toErrorMessage } from "@/utils/error-message";

export function geoPersonaUpdateMutationKey(
  organizationId: string,
  projectId: string | undefined
) {
  return ["geo", "personaUpdate", organizationId, projectId ?? null] as const;
}

function invalidatePersonaList(
  queryClient: QueryClient,
  organizationId: string,
  projectId: string | undefined
) {
  return queryClient.invalidateQueries({
    queryKey: dashboardOrpc.geo.personasList.queryKey({
      input: { organizationId, projectId },
    }),
  });
}

export function useGeoPersonas(organizationId: string) {
  const { projectId } = useGeoProjectScope();
  return useQuery<GeoPersonasResponse>({
    ...dashboardOrpc.geo.personasList.queryOptions({
      input: { organizationId, projectId },
    }),
    enabled: !!organizationId,
    meta: { errorMessage: "Failed to load personas" },
  });
}

export function useGeoPersonaActivity(
  organizationId: string,
  window: GeoWindowInput = {}
) {
  const { projectId } = useGeoProjectScope();
  return useQuery({
    ...dashboardOrpc.geo.personasActivity.queryOptions({
      input: { organizationId, projectId, ...window },
    }),
    enabled: Boolean(organizationId),
    refetchInterval: 15_000,
    meta: { errorMessage: "Failed to load persona activity" },
  });
}

export function useGeoPersonasGenerate(organizationId: string) {
  const { projectId } = useGeoProjectScope();
  const queryClient = useQueryClient();
  const observedJob = useRef<string | null>(null);
  const statusOptions = dashboardOrpc.geo.personasGenerationStatus.queryOptions(
    {
      input: { organizationId, projectId },
    }
  );
  const status = useQuery({
    ...statusOptions,
    enabled: Boolean(organizationId),
    refetchInterval: (query) => {
      const jobStatus = query.state.data?.status;
      return jobStatus === "queued" || jobStatus === "running"
        ? PERSONA_GENERATION_POLL_MS
        : false;
    },
    meta: { errorMessage: "Failed to check persona generation" },
  });
  const job = status.data;
  useEffect(() => {
    if (!job || (job.status !== "completed" && job.status !== "failed")) {
      return;
    }
    if (observedJob.current === job.id) {
      return;
    }
    observedJob.current = job.id;
    if (job.status === "completed") {
      void invalidatePersonaList(queryClient, organizationId, projectId);
    }
  }, [job, queryClient, organizationId, projectId]);

  const mutation = useMutation<PersonaGenerationJob, Error, string | void>({
    mutationFn: (personaId) =>
      dashboardOrpc.geo.personasGenerate.call({
        organizationId,
        projectId,
        personaId: personaId || undefined,
      }),
    onSuccess: (started) => {
      queryClient.setQueryData(statusOptions.queryKey, started);
    },
    onError: (error) => {
      void queryClient.invalidateQueries({ queryKey: statusOptions.queryKey });
      toast.error(toErrorMessage(error, "Failed to generate personas"));
    },
  });
  return {
    ...mutation,
    isPending:
      mutation.isPending ||
      job?.status === "queued" ||
      job?.status === "running",
    startedAt:
      job?.status === "queued" || job?.status === "running"
        ? job.startedAt
        : undefined,
    generationError: job?.status === "failed" ? job.error : null,
    generatingPersonaId: job?.personaId,
  };
}

export function useGeoPersonaUpdate(organizationId: string) {
  const { projectId } = useGeoProjectScope();
  const queryClient = useQueryClient();
  return useMutation<GeoPersona, Error, GeoPersonaUpdateInput>({
    mutationKey: geoPersonaUpdateMutationKey(organizationId, projectId),
    mutationFn: (variables) =>
      dashboardOrpc.geo.personaUpdate.call({
        organizationId,
        projectId,
        personaId: variables.personaId,
        enabled: variables.enabled,
        details: variables.details,
      }),
    onSuccess: async () => {
      await invalidatePersonaList(queryClient, organizationId, projectId);
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, "Failed to update the persona"));
    },
  });
}

export function useGeoPersonaDelete(organizationId: string) {
  const { projectId } = useGeoProjectScope();
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, string>({
    mutationFn: (personaId: string) =>
      dashboardOrpc.geo.personaDelete.call({
        organizationId,
        projectId,
        personaId,
      }),
    onSuccess: async () => {
      await invalidatePersonaList(queryClient, organizationId, projectId);
      toast.success("Persona deleted");
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, "Failed to delete the persona"));
    },
  });
}

export function useGeoPersonaResults(
  organizationId: string,
  personaId?: string
) {
  const { projectId } = useGeoProjectScope();
  return useQuery<GeoPersonaResultsResponse>({
    ...dashboardOrpc.geo.personaResults.queryOptions({
      input: { organizationId, projectId, personaId },
    }),
    enabled: Boolean(organizationId && personaId),
    meta: { errorMessage: "Failed to load persona results" },
  });
}
