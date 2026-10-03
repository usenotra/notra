import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { fetchIntegration, fetchIntegrations } from "@/lib/integrations/fetch";

export const getIntegrations = createServerFn({ method: "GET" }).handler(() =>
  fetchIntegrations()
);

export const getIntegration = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data: { id } }) => {
    const integration = await fetchIntegration(id);
    if (!integration) {
      throw notFound();
    }
    return integration;
  });
