import type { QueryClient } from "@tanstack/react-query";

import { dashboardOrpc } from "@/lib/orpc/query";

export function geoPersonaUpdateMutationKey(
  organizationId: string,
  projectId: string | undefined
) {
  return ["geo", "personaUpdate", organizationId, projectId ?? null] as const;
}

export function invalidatePersonaList(
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
