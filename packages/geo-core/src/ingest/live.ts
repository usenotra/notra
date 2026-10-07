import type { GeoTrafficEventRow } from "@notra/analytics/tinybird/datasources";

import {
  GEO_TRAFFIC_LIVE_MIN_INTERVAL_MS,
  GEO_TRAFFIC_LIVE_SETTLE_MS,
} from "../constants/geo";
import { hasGeoLiveViewers, publishGeoTrafficChange } from "../geo/live";
import type { GeoTrafficSettleBatch } from "../types/geo-live";
import type { GeoIngestBuffer } from "../types/ingest";

const batches = new Map<string, GeoTrafficSettleBatch>();
const lastPublishedAt = new Map<string, number>();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function windowDelay(organizationId: string, minDelayMs: number): number {
  const now = Date.now();
  // Forget organizations whose throttle window is over, so a long-running
  // ingest process only remembers the ones that published recently.
  for (const [id, publishedAt] of lastPublishedAt) {
    if (publishedAt + GEO_TRAFFIC_LIVE_MIN_INTERVAL_MS <= now) {
      lastPublishedAt.delete(id);
    }
  }
  const previous = lastPublishedAt.get(organizationId);
  const throttleMs =
    previous === undefined
      ? 0
      : previous + GEO_TRAFFIC_LIVE_MIN_INTERVAL_MS - now;
  return Math.max(minDelayMs, throttleMs);
}

async function publish(
  organizationId: string,
  batch: GeoTrafficSettleBatch
): Promise<void> {
  batches.delete(organizationId);
  lastPublishedAt.set(organizationId, Date.now());
  await publishGeoTrafficChange(organizationId, [...batch.projectIds]);
}

/**
 * Rows that joined late in the window may still sit in Tinybird's buffer.
 * They are covered by the next window's announcement: the one newer traffic
 * already opened, or a trailing one timed to their flush. Waiting only for
 * that window's own announcement (not its follow-up) keeps the chain one hop
 * long under steady traffic.
 */
function announceLateEvents(
  organizationId: string,
  batch: GeoTrafficSettleBatch
): Promise<void> {
  const remainingMs =
    batch.lastEventAt + GEO_TRAFFIC_LIVE_SETTLE_MS - Date.now();
  if (remainingMs <= 0) {
    return Promise.resolve();
  }
  return scheduleWindow(
    organizationId,
    batch.projectIds,
    batch.lastEventAt,
    remainingMs
  ).published;
}

function scheduleWindow(
  organizationId: string,
  projectIds: Iterable<string>,
  eventAt: number,
  minDelayMs: number
): GeoTrafficSettleBatch {
  const open = batches.get(organizationId);
  if (open) {
    for (const projectId of projectIds) {
      open.projectIds.add(projectId);
    }
    open.lastEventAt = Math.max(open.lastEventAt, eventAt);
    return open;
  }
  const batch: GeoTrafficSettleBatch = {
    projectIds: new Set(projectIds),
    lastEventAt: eventAt,
    published: Promise.resolve(),
    done: Promise.resolve(),
  };
  batch.published = sleep(windowDelay(organizationId, minDelayMs)).then(() =>
    publish(organizationId, batch)
  );
  batch.done = batch.published.then(() =>
    announceLateEvents(organizationId, batch)
  );
  batches.set(organizationId, batch);
  return batch;
}

/**
 * Announces an ingested event once Tinybird can serve it. Events of one
 * organization share a window, so a busy site costs one purge and one publish
 * per window instead of one per request, and at most one per
 * `GEO_TRAFFIC_LIVE_MIN_INTERVAL_MS`. Resolves once the event was announced
 * after its flush; never rejects.
 */
export function announceGeoTrafficEvent(
  organizationId: string,
  projectId: string
): Promise<void> {
  return scheduleWindow(
    organizationId,
    [projectId],
    Date.now(),
    GEO_TRAFFIC_LIVE_SETTLE_MS
  ).done;
}

/**
 * Announces rows the write buffer just stored, one window per organization.
 * Organizations nobody watches are skipped inside the publish.
 */
export function announceGeoTrafficRows(rows: GeoTrafficEventRow[]): void {
  const projectsByOrganization = new Map<string, Set<string>>();
  for (const row of rows) {
    const projects =
      projectsByOrganization.get(row.organization_id) ?? new Set<string>();
    projects.add(row.project_id);
    projectsByOrganization.set(row.organization_id, projects);
  }
  for (const [organizationId, projectIds] of projectsByOrganization) {
    scheduleWindow(
      organizationId,
      projectIds,
      Date.now(),
      GEO_TRAFFIC_LIVE_SETTLE_MS
    );
  }
}

/**
 * Buffered events reach Tinybird at the next window, too late for an open
 * live view. While someone watches, the organization's events are written
 * right away; the buffer announces them once stored. Never rejects.
 */
export async function expediteForLiveViewers(
  buffer: GeoIngestBuffer,
  organizationId: string
): Promise<void> {
  if (await hasGeoLiveViewers(organizationId)) {
    buffer.expedite(organizationId);
  }
}
