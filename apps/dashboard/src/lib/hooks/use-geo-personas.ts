"use client";

import type {
  GeoPersona,
  GeoPersonaGenerateResponse,
  GeoPersonaResultsResponse,
  GeoPersonasResponse,
} from "@notra/geo-core/types/geo-personas";
import type { QueryClient } from "@tanstack/react-query";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useGeoProjectScope } from "@/components/providers/geo-project-provider";
import { dashboardOrpc } from "@/lib/orpc/query";
import type { GeoPersonaUpdateInput } from "@/types/geo-personas";
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

export function useGeoPersonasGenerate(organizationId: string) {
  const { projectId } = useGeoProjectScope();
  const queryClient = useQueryClient();
  return useMutation<GeoPersonaGenerateResponse, Error, void>({
    mutationFn: () =>
      dashboardOrpc.geo.personasGenerate.call({ organizationId, projectId }),
    onSuccess: async () => {
      await invalidatePersonaList(queryClient, organizationId, projectId);
      toast.success("Personas generated");
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, "Failed to generate personas"));
    },
  });
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
