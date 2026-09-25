import type {
  GeoPersona,
  GeoPersonaActivityPoint,
  GeoPersonaActivityResponse,
} from "@notra/geo-core/types/geo-personas";
import { todayIsoDate } from "@notra/geo-core/utils/day-label";

import {
  GEO_PERSONA_FORECAST_DAYS,
  GEO_PERSONA_FORECAST_SAMPLE_DAYS,
} from "@/constants/geo-personas";
import type { PersonaActivitySeries } from "@/types/geo-personas";
import { chartKey } from "@/utils/chart-keys";

function activityPointKey(
  day: string,
  personaId: string,
  snapshotVersion: string
) {
  return `${day}:${personaId}:${snapshotVersion}`;
}

export function personaActivityKey(personaId: string, snapshotVersion: string) {
  return chartKey(`${personaId}:${snapshotVersion}`);
}

export function personaForecastKey(personaId: string, snapshotVersion: string) {
  return chartKey(`${personaId}:${snapshotVersion}:forecast`);
}

export function buildPersonaActivitySeries(
  activity: GeoPersonaActivityResponse,
  personas: readonly GeoPersona[]
): PersonaActivitySeries[] {
  const latestChecks = new Map<string, Map<string, string>>();
  for (const point of activity.points) {
    const versions = latestChecks.get(point.personaId) ?? new Map();
    const current = versions.get(point.snapshotVersion);
    if (!current || point.lastCheckedAt > current) {
      versions.set(point.snapshotVersion, point.lastCheckedAt);
    }
    latestChecks.set(point.personaId, versions);
  }

  return personas.flatMap((persona) => {
    const versions = [...(latestChecks.get(persona.id)?.entries() ?? [])].sort(
      ([leftVersion, leftCheckedAt], [rightVersion, rightCheckedAt]) =>
        rightCheckedAt.localeCompare(leftCheckedAt) ||
        leftVersion.localeCompare(rightVersion)
    );
    return versions.map(([snapshotVersion], index) => ({
      personaId: persona.id,
      snapshotVersion,
      dataKey: personaActivityKey(persona.id, snapshotVersion),
      label:
        index === 0
          ? persona.name
          : `${persona.name} (previous · ${snapshotVersion.slice(0, 7)})`,
      isCurrent: index === 0,
    }));
  });
}

function mentionRate(point: GeoPersonaActivityPoint | undefined) {
  return point && point.checks > 0
    ? (point.mentions / point.checks) * 100
    : null;
}

function firstScanDayByKey(points: readonly GeoPersonaActivityPoint[]) {
  const firstDay = new Map<string, string>();
  for (const point of points) {
    if (point.checks <= 0) {
      continue;
    }
    const key = personaActivityKey(point.personaId, point.snapshotVersion);
    const current = firstDay.get(key);
    if (!current || point.day < current) {
      firstDay.set(key, point.day);
    }
  }
  return firstDay;
}

export function buildPersonaActivityRows(
  activity: GeoPersonaActivityResponse,
  series: readonly PersonaActivitySeries[],
  today = todayIsoDate()
) {
  const points = new Map(
    activity.points.map((point) => [
      activityPointKey(point.day, point.personaId, point.snapshotVersion),
      point,
    ])
  );
  const firstScanDay = firstScanDayByKey(activity.points);
  const rows: Record<string, string | number | null>[] = [];
  const date = new Date(`${activity.from}T00:00:00Z`);
  while (date.toISOString().slice(0, 10) < activity.to) {
    const day = date.toISOString().slice(0, 10);
    const row: Record<string, string | number | null> = { day };
    for (const item of series) {
      const rate = mentionRate(
        points.get(activityPointKey(day, item.personaId, item.snapshotVersion))
      );
      const first = firstScanDay.get(item.dataKey);
      row[item.dataKey] =
        rate ?? (first !== undefined && day < first ? 0 : null);
    }
    rows.push(row);
    date.setUTCDate(date.getUTCDate() + 1);
  }

  const last = rows.at(-1);
  if (last?.day !== today) {
    return rows;
  }

  const forecasts = new Map<string, number>();
  for (const item of series) {
    if (!item.isCurrent) {
      continue;
    }
    const samples = activity.points
      .filter(
        (point) =>
          point.personaId === item.personaId &&
          point.snapshotVersion === item.snapshotVersion &&
          point.checks > 0 &&
          point.day >= activity.from &&
          point.day <= today
      )
      .toSorted((left, right) => right.day.localeCompare(left.day))
      .slice(0, GEO_PERSONA_FORECAST_SAMPLE_DAYS);
    let checks = 0;
    let mentions = 0;
    for (const sample of samples) {
      checks += sample.checks;
      mentions += sample.mentions;
    }
    if (!checks) {
      continue;
    }
    const key = personaForecastKey(item.personaId, item.snapshotVersion);
    forecasts.set(key, Math.max(0, Math.min(100, (mentions / checks) * 100)));
    last[key] = last[item.dataKey] ?? null;
  }
  if (!forecasts.size) {
    return rows;
  }

  for (let offset = 0; offset < GEO_PERSONA_FORECAST_DAYS; offset++) {
    const row: Record<string, string | number | null> = {
      day: date.toISOString().slice(0, 10),
    };
    for (const item of series) {
      row[item.dataKey] = null;
      if (item.isCurrent) {
        const forecastKey = personaForecastKey(
          item.personaId,
          item.snapshotVersion
        );
        row[forecastKey] = forecasts.get(forecastKey) ?? null;
      }
    }
    rows.push(row);
    date.setUTCDate(date.getUTCDate() + 1);
  }
  return rows;
}

export function personaMentionRate(
  activity: GeoPersonaActivityResponse,
  personaId: string,
  snapshotVersion: string | undefined
) {
  if (!snapshotVersion) {
    return null;
  }
  let mentions = 0;
  let checks = 0;
  for (const point of activity.points) {
    if (
      point.personaId !== personaId ||
      point.snapshotVersion !== snapshotVersion
    ) {
      continue;
    }
    mentions += point.mentions;
    checks += point.checks;
  }
  return checks ? (mentions / checks) * 100 : null;
}
