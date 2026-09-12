import { db } from "@notra/db/drizzle";
import { brandSettings, geoSettings, projects } from "@notra/db/schema";
import type { GeoCheckScope } from "@notra/db/types/geo-checks";
import { and, asc, count, desc, eq } from "drizzle-orm";
import { Effect } from "effect";

import { GEO_PROJECTS_OLDEST_ORDER } from "../constants/geo-projects";
import type {
  GeoProjectScope,
  GeoProjectsResponse,
  GeoProjectUpdateInput,
  GeoScopeInput,
} from "../types/geo";
import { geoDb } from "./effect";
import {
  GeoBrandIdentityMissingError,
  GeoBrandIdentityNotFoundError,
  GeoProjectCreateFailedError,
  GeoProjectDeleteBlockedError,
  GeoProjectNotFoundError,
  GeoSettingsMissingError,
} from "./errors";
import { invalidateGeoIngestHostsCache } from "./ingest-hosts-cache";
import { lockGeoOrganization, lockGeoProject } from "./lock";
import { toGeoProject } from "./mappers";

export const listGeoProjects = Effect.fn("geo.projectsList")(function* (
  organizationId: string
) {
  const rows = yield* geoDb("projects lookup failed", () =>
    db.query.projects.findMany({
      where: eq(projects.organizationId, organizationId),
      orderBy: GEO_PROJECTS_OLDEST_ORDER,
    })
  );

  const response: GeoProjectsResponse = {
    projects: rows.map(toGeoProject),
  };
  return response;
});

export const requireBrandIdentity = Effect.fn("geo.requireBrandIdentity")(
  function* (organizationId: string, brandSettingsId: string) {
    const identity = yield* geoDb("brand identity lookup failed", () =>
      db.query.brandSettings.findFirst({
        columns: { id: true, websiteUrl: true },
        where: and(
          eq(brandSettings.id, brandSettingsId),
          eq(brandSettings.organizationId, organizationId)
        ),
      })
    );

    if (!identity) {
      return yield* Effect.fail(
        new GeoBrandIdentityNotFoundError({ brandSettingsId })
      );
    }

    return identity;
  }
);

const resolveDefaultBrandIdentity = Effect.fn(
  "geo.resolveDefaultBrandIdentity"
)(function* (organizationId: string) {
  const identity = yield* geoDb("brand identity lookup failed", () =>
    db.query.brandSettings.findFirst({
      columns: { id: true },
      where: eq(brandSettings.organizationId, organizationId),
      orderBy: [desc(brandSettings.isDefault), asc(brandSettings.createdAt)],
    })
  );

  if (!identity) {
    return yield* Effect.fail(
      new GeoBrandIdentityMissingError({ organizationId })
    );
  }

  return identity.id;
});

const findOldestProjectId = Effect.fn("geo.oldestProject")(function* (
  organizationId: string
) {
  const row = yield* geoDb("projects lookup failed", () =>
    db.query.projects.findFirst({
      columns: { id: true },
      where: eq(projects.organizationId, organizationId),
      orderBy: GEO_PROJECTS_OLDEST_ORDER,
    })
  );

  return row?.id ?? null;
});

export const createGeoProject = Effect.fn("geo.projectCreate")(function* (
  organizationId: string,
  name: string,
  brandSettingsId?: string
) {
  const linkedBrandSettingsId = brandSettingsId
    ? (yield* requireBrandIdentity(organizationId, brandSettingsId)).id
    : yield* resolveDefaultBrandIdentity(organizationId);

  const rows = yield* geoDb("project create failed", () =>
    db
      .insert(projects)
      .values({
        id: crypto.randomUUID(),
        organizationId,
        name: name.trim(),
        brandSettingsId: linkedBrandSettingsId,
      })
      .returning()
  );

  const row = rows.at(0);
  if (!row) {
    return yield* Effect.fail(new GeoProjectCreateFailedError({}));
  }

  yield* Effect.promise(() =>
    invalidateGeoIngestHostsCache(organizationId, row.id)
  );

  return toGeoProject(row);
});

export const updateGeoProject = Effect.fn("geo.projectUpdate")(function* (
  organizationId: string,
  projectId: string,
  update: GeoProjectUpdateInput
) {
  const linkedBrandSettingsId = update.brandSettingsId
    ? (yield* requireBrandIdentity(organizationId, update.brandSettingsId)).id
    : undefined;

  const rows = yield* geoDb("project update failed", () =>
    db
      .update(projects)
      .set({
        ...(update.name === undefined ? {} : { name: update.name.trim() }),
        ...(linkedBrandSettingsId === undefined
          ? {}
          : { brandSettingsId: linkedBrandSettingsId }),
      })
      .where(
        and(
          eq(projects.id, projectId),
          eq(projects.organizationId, organizationId)
        )
      )
      .returning()
  );

  const row = rows.at(0);
  if (!row) {
    return yield* Effect.fail(new GeoProjectNotFoundError({ projectId }));
  }

  yield* Effect.promise(() =>
    invalidateGeoIngestHostsCache(organizationId, projectId)
  );

  return toGeoProject(row);
});

/**
 * Deletes a project and everything hanging off it.
 *
 * Safety notes:
 * - Every `geo_*` table declares `project_id ... ON DELETE CASCADE`, so the
 *   child rows go with the project in the same statement. `agent_feedback`
 *   declares `ON DELETE SET NULL`, so feedback survives unattached — that is
 *   deliberate, feedback is org-owned evidence, not project data.
 * - `post_collections` and `chat_sessions` declare `project_id ... ON DELETE
 *   SET NULL`: Studio content and chats survive and become organization-wide,
 *   which makes them visible from every remaining project.
 * - `brand_settings` is NOT deleted: `projects.brand_settings_id` points *at*
 *   it, several projects can share one identity, and it is reachable from the
 *   organization independently of any project.
 * - The scan schedule needs no teardown: the cron sweep reads `geo_settings`
 *   live, and the settings row cascades away with the project.
 * - The organization's last project cannot be deleted: `resolveGeoScope` falls
 *   back to the oldest project, so removing the final one leaves every GEO
 *   read unresolvable. The count is re-taken inside the deleting transaction
 *   under an organization advisory lock, because two concurrent deletes each
 *   counting `2` would otherwise both proceed. `isSample` is deliberately NOT
 *   special-cased — a sample project is an ordinary project and is deletable
 *   as long as it is not the last one.
 */
export const deleteGeoProject = Effect.fn("geo.projectDelete")(function* (
  organizationId: string,
  projectId: string
) {
  const [existing, projectCount] = yield* Effect.all([
    geoDb("project lookup failed", () =>
      db.query.projects.findFirst({
        columns: { id: true },
        where: and(
          eq(projects.id, projectId),
          eq(projects.organizationId, organizationId)
        ),
      })
    ),
    geoDb("projects count failed", () =>
      db
        .select({ count: count() })
        .from(projects)
        .where(eq(projects.organizationId, organizationId))
    ),
  ]);

  if (!existing) {
    return yield* Effect.fail(new GeoProjectNotFoundError({ projectId }));
  }

  if ((projectCount.at(0)?.count ?? 0) <= 1) {
    return yield* Effect.fail(
      new GeoProjectDeleteBlockedError({ projectId, reason: "last_project" })
    );
  }

  const outcome = yield* geoDb("project delete failed", () =>
    db.transaction(async (tx) => {
      await Effect.runPromise(lockGeoOrganization(tx, organizationId));
      await Effect.runPromise(lockGeoProject(tx, projectId));

      const target = await tx
        .select({ id: projects.id })
        .from(projects)
        .where(
          and(
            eq(projects.id, projectId),
            eq(projects.organizationId, organizationId)
          )
        )
        .limit(1)
        .for("update");
      if (!target.length) {
        return "not_found" as const;
      }

      const remaining = await tx
        .select({ count: count() })
        .from(projects)
        .where(eq(projects.organizationId, organizationId));
      if ((remaining.at(0)?.count ?? 0) <= 1) {
        return "last_project" as const;
      }

      const deleted = await tx
        .delete(projects)
        .where(
          and(
            eq(projects.id, projectId),
            eq(projects.organizationId, organizationId)
          )
        )
        .returning({ id: projects.id });
      return deleted.length ? ("deleted" as const) : ("not_found" as const);
    })
  );

  if (outcome === "last_project") {
    return yield* Effect.fail(
      new GeoProjectDeleteBlockedError({ projectId, reason: "last_project" })
    );
  }

  if (outcome === "deleted") {
    yield* Effect.promise(() =>
      invalidateGeoIngestHostsCache(organizationId, projectId)
    );
  }

  return { id: projectId, success: true as const };
});

export const resolveGeoScope = Effect.fn("geo.resolveScope")(function* (
  input: GeoScopeInput
) {
  if (input.projectId) {
    const [oldestProject, row] = yield* Effect.all([
      findOldestProjectId(input.organizationId),
      geoDb("project lookup failed", () =>
        db.query.projects.findFirst({
          columns: { id: true, brandSettingsId: true },
          where: and(
            eq(projects.id, input.projectId ?? ""),
            eq(projects.organizationId, input.organizationId)
          ),
        })
      ),
    ]);

    if (!row) {
      return yield* Effect.fail(
        new GeoProjectNotFoundError({ projectId: input.projectId })
      );
    }

    const scope: GeoProjectScope = {
      organizationId: input.organizationId,
      projectId: row.id,
      brandSettingsId: row.brandSettingsId,
      includeUnassigned: row.id === oldestProject,
    };
    return scope;
  }

  const oldest = yield* geoDb("projects lookup failed", () =>
    db.query.projects.findFirst({
      columns: { id: true, brandSettingsId: true },
      where: eq(projects.organizationId, input.organizationId),
      orderBy: GEO_PROJECTS_OLDEST_ORDER,
    })
  );

  const scope: GeoProjectScope = {
    organizationId: input.organizationId,
    projectId: oldest?.id ?? null,
    brandSettingsId: oldest?.brandSettingsId ?? null,
    includeUnassigned: true,
  };
  return scope;
});

export function geoCheckScope(scope: GeoProjectScope): GeoCheckScope {
  return {
    organizationId: scope.organizationId,
    projectId: scope.projectId ?? null,
  };
}

export function geoScopeParams(scope: GeoProjectScope): {
  organization_id: string;
  project_id: string;
  include_unassigned: number;
} {
  return {
    organization_id: scope.organizationId,
    project_id: scope.projectId ?? "",
    include_unassigned: scope.includeUnassigned ? 1 : 0,
  };
}

export const requireGeoProject = Effect.fn("geo.requireProject")(function* (
  input: GeoScopeInput
) {
  const scope = yield* resolveGeoScope(input);
  if (!scope.projectId || !scope.brandSettingsId) {
    return yield* Effect.fail(
      new GeoSettingsMissingError({ organizationId: scope.organizationId })
    );
  }
  return {
    ...scope,
    projectId: scope.projectId,
    brandSettingsId: scope.brandSettingsId,
  };
});

export const ensureGeoProject = Effect.fn("geo.ensureProject")(function* (
  input: GeoScopeInput,
  fallbackName: string
) {
  const scope = yield* resolveGeoScope(input);
  if (scope.projectId) {
    return scope.projectId;
  }

  const created = yield* createGeoProject(input.organizationId, fallbackName);
  return created.id;
});
