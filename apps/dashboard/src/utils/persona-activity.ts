import type {
  GeoPersona,
  GeoPersonaActivityResponse,
} from "@notra/geo-core/types/geo-personas";

import {
  GEO_PERSONA_FORECAST_DAYS,
  GEO_PERSONA_FORECAST_SAMPLE_DAYS,
} from "@/constants/geo-personas";
import { chartKey } from "@/utils/chart-keys";

export function personaForecastKey(personaId: string) {
  return chartKey(`${personaId}:forecast`);
}

export function buildPersonaActivityRows(
  activity: GeoPersonaActivityResponse,
  personas: readonly GeoPersona[],
  today = new Date().toISOString().slice(0, 10)
) {
  const points = new Map(
    activity.points.map((point) => [`${point.day}:${point.personaId}`, point])
  );
  const rows: Record<string, string | number | null>[] = [];
  const date = new Date(`${activity.from}T00:00:00Z`);
  while (date.toISOString().slice(0, 10) < activity.to) {
    const day = date.toISOString().slice(0, 10);
    const row: Record<string, string | number | null> = { day };
    for (const persona of personas) {
      const point = points.get(`${day}:${persona.id}`);
      row[chartKey(persona.id)] =
        point && point.checks > 0 ? (point.mentions / point.checks) * 100 : 0;
    }
    rows.push(row);
    date.setUTCDate(date.getUTCDate() + 1);
  }
  const last = rows.at(-1);
  if (last?.day !== today) {return rows;}
  const forecasts = new Map<string, number>();
  for (const persona of personas) {
    const samples = activity.points
      .filter(
        (point) =>
          point.personaId === persona.id &&
          point.checks > 0 &&
          point.day >= activity.from &&
          point.day <= today
      )
      .sort((a, b) => b.day.localeCompare(a.day))
      .slice(0, GEO_PERSONA_FORECAST_SAMPLE_DAYS);
    let checks = 0;
    let mentions = 0;
    for (const sample of samples) {
      checks += sample.checks;
      mentions += sample.mentions;
    }
    if (!checks) {continue;}
    const key = personaForecastKey(persona.id);
    forecasts.set(key, Math.max(0, Math.min(100, (mentions / checks) * 100)));
    last[key] = last[chartKey(persona.id)] ?? 0;
  }
  if (!forecasts.size) {return rows;}
  for (let offset = 0; offset < GEO_PERSONA_FORECAST_DAYS; offset++) {
    const row: Record<string, string | number | null> = {
      day: date.toISOString().slice(0, 10),
    };
    for (const persona of personas) {
      row[chartKey(persona.id)] = null;
      row[personaForecastKey(persona.id)] =
        forecasts.get(personaForecastKey(persona.id)) ?? null;
    }
    rows.push(row);
    date.setUTCDate(date.getUTCDate() + 1);
  }
  return rows;
}

export function personaMentionRate(
  activity: GeoPersonaActivityResponse,
  personaId: string
) {
  let mentions = 0;
  let checks = 0;
  for (const point of activity.points) {
    if (point.personaId !== personaId) {
      continue;
    }
    mentions += point.mentions;
    checks += point.checks;
  }
  return { checks, rate: checks ? (mentions / checks) * 100 : null };
}
