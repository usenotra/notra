import type { createDb } from "@notra/db/drizzle";
import { isProjectInOrganization } from "@notra/db/utils/projects";
import type { Context } from "hono";

import type { GeoFailure } from "../types/geo";
import type { GeoRequestContext } from "../types/geo-context";

type DbClient = ReturnType<typeof createDb>;

/**
 * Turns a normalized GEO failure into a typed JSON response.
 *
 * The switch is what makes the status literal again — `c.json(body, status)`
 * with a union status does not narrow, and every GEO route declares each of
 * these responses.
 */
export function geoErrorResponse(c: Context, failure: GeoFailure) {
  switch (failure.status) {
    case 400:
      return c.json({ error: failure.error }, 400);
    case 402:
      return c.json({ error: failure.error }, 402);
    case 404:
      return c.json({ error: failure.error }, 404);
    case 409:
      return c.json({ error: failure.error }, 409);
    case 503:
      return c.json({ error: failure.error }, 503);
    default:
      return c.json({ error: failure.error }, 500);
  }
}

/** Attaches the organization envelope every GEO route returns. */
export function attachGeoOrganization<T>(
  organization: GeoRequestContext["organization"],
  body: T
): T & { organization: GeoRequestContext["organization"] } {
  return { ...body, organization };
}

/** Maps a remote GEO operation's missing dashboard URL to 503. */
export function geoRemoteUnavailableResponse(c: Context, message: string) {
  return c.json({ error: message }, 503);
}

/** Confirms the project exists inside the caller's organization. */
export async function projectBelongsToOrganization(
  db: DbClient,
  organizationId: string,
  projectId: string
): Promise<boolean> {
  return isProjectInOrganization(organizationId, projectId, db);
}
