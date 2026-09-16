"use client";

import type { GeoWindowInput } from "@notra/geo-core/types/geo";
import type {
  GeoPersona,
  GeoPersonaResultsResponse,
  GeoPersonaUpdateInput,
  GeoPersonasResponse,
} from "@notra/geo-core/types/geo-personas";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { useGeoProjectScope } from "@/components/providers/geo-project-provider";
import { GEO_PERSONA_RESULTS_POLL_MS } from "@/constants/geo-personas";
import {
  PERSONA_GENERATION_FAILED_MESSAGE,
  PERSONA_GENERATION_POLL_MS,
} from "@/constants/persona-generation";
import { dashboardOrpc } from "@/lib/orpc/query";
import type {
  PersonaGenerationJob,
  PersonaGenerationRequest,
} from "@/types/persona-generation";
import { toErrorMessage } from "@/utils/error-message";
import {
  geoPersonaUpdateMutationKey,
  invalidatePersonaList,
} from "@/utils/geo-persona-queries";

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
  const activeJob = useRef<string | null>(null);
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
    if (!job) {
      return;
    }
    if (job.status === "queued" || job.status === "running") {
      activeJob.current = job.id;
      return;
    }
    if (activeJob.current !== job.id) {
      return;
    }
    activeJob.current = null;
    if (job.status === "completed") {
      void invalidatePersonaList(queryClient, organizationId, projectId);
    } else {
      toast.error(job.error || PERSONA_GENERATION_FAILED_MESSAGE);
    }
  }, [job, queryClient, organizationId, projectId]);

  const mutation = useMutation<
    PersonaGenerationJob,
    Error,
    PersonaGenerationRequest
  >({
    mutationFn: (request) =>
      dashboardOrpc.geo.personasGenerate.call({
        organizationId,
        projectId,
        ...request,
      }),
    onSuccess: (started) => {
      queryClient.setQueryData(statusOptions.queryKey, started);
    },
    onError: (error) => {
      void queryClient.invalidateQueries({ queryKey: statusOptions.queryKey });
      toast.error(toErrorMessage(error, "Failed to generate personas"));
    },
  });
  let startedAt = "";
  if (job?.status === "queued" || job?.status === "running") {
    startedAt = job.startedAt;
  } else if (mutation.isPending && mutation.submittedAt > 0) {
    startedAt = new Date(mutation.submittedAt).toISOString();
  }
  return {
    ...mutation,
    isPending:
      mutation.isPending ||
      job?.status === "queued" ||
      job?.status === "running",
    startedAt,
    generationStatus: job?.status,
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
    onSuccess: () => {
      void invalidatePersonaList(queryClient, organizationId, projectId);
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
      toast.success("Persona archived");
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, "Failed to archive the persona"));
    },
  });
}

export function useGeoPersonaRestore(organizationId: string) {
  const { projectId } = useGeoProjectScope();
  const queryClient = useQueryClient();
  return useMutation<GeoPersona, Error, string>({
    mutationFn: (personaId: string) =>
      dashboardOrpc.geo.personaRestore.call({
        organizationId,
        projectId,
        personaId,
      }),
    onSuccess: async () => {
      await invalidatePersonaList(queryClient, organizationId, projectId);
      toast.success("Persona reactivated. Include it in scans when ready.");
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, "Failed to reactivate the persona"));
    },
  });
}

export function useGeoPersonaRun(organizationId: string) {
  const { projectId } = useGeoProjectScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (personaId: string) =>
      dashboardOrpc.geo.personaRun.call({
        organizationId,
        projectId,
        personaId,
      }),
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: dashboardOrpc.geo.personaResults.key(),
        }),
        queryClient.invalidateQueries({
          queryKey: dashboardOrpc.geo.personasActivity.key(),
        }),
      ]);
      const engineCount = result.engines.length;
      toast.success(
        `Persona scanned across ${engineCount} engine${engineCount === 1 ? "" : "s"}`
      );
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, "Failed to run the persona scan"));
    },
  });
}

export function useGeoPersonaResults(
  organizationId: string,
  personaId?: string,
  scanId?: string,
  poll = false
) {
  const { projectId } = useGeoProjectScope();
  return useQuery<GeoPersonaResultsResponse>({
    ...dashboardOrpc.geo.personaResults.queryOptions({
      input: { organizationId, projectId, personaId, scanId },
    }),
    enabled: Boolean(organizationId && personaId),
    refetchInterval:
      poll && personaId && !scanId ? GEO_PERSONA_RESULTS_POLL_MS : false,
    meta: { errorMessage: "Failed to load persona results" },
  });
}
