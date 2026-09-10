import {
  CHART_MENTION_RATE_PERCENT_PRECISION,
  CHART_MENTION_RATE_PERCENT_SCALE,
  GEO_CHART_EMPTY_COMPETITORS,
  GEO_CHART_EMPTY_OVERVIEW,
  GEO_CHART_EMPTY_TIMESERIES,
  GEO_CHART_MENTION_COUNT_SUBTITLE,
  GEO_CHART_MENTION_RATE_SUBTITLE,
  GEO_COMPETITOR_SHARE_CHART_TITLE,
  GEO_OVERVIEW_CHART_TITLE,
  GEO_TIMESERIES_CHART_TITLE,
} from "@notra/ai/constants/chart-artifact";
import type {
  ChartArtifact,
  ChartSeries,
  GeoCompetitorShareChartInput,
  GeoOverviewChartInput,
  GeoTimeseriesChartInput,
} from "@notra/ai/types/chart-artifact";

const GROUNDED_ENGINE_SUFFIX_PATTERN = /(-direct)?-grounded$/u;

function chartEngineLabel(engine: string): string {
  return engine.replace(GROUNDED_ENGINE_SUFFIX_PATTERN, "");
}

function toMentionRatePercent(rate: number): number {
  return (
    Math.round(
      rate *
        CHART_MENTION_RATE_PERCENT_SCALE *
        CHART_MENTION_RATE_PERCENT_PRECISION
    ) / CHART_MENTION_RATE_PERCENT_PRECISION
  );
}

function geoChartWindowSubtitle(days: number, metric: string): string {
  return `${metric} · last ${days} days`;
}

function emptyChart(
  title: string,
  subtitle: string,
  emptyMessage: string
): ChartArtifact {
  return { kind: "empty", title, subtitle, emptyMessage };
}

export function buildGeoOverviewChart(
  input: GeoOverviewChartInput
): ChartArtifact {
  const subtitle = geoChartWindowSubtitle(
    input.days,
    GEO_CHART_MENTION_RATE_SUBTITLE
  );
  const segments = input.engines
    .map((engine) => ({
      label: chartEngineLabel(engine.engine),
      value: toMentionRatePercent(engine.mention_rate),
    }))
    .filter((segment) => segment.value > 0);

  if (segments.length === 0) {
    return emptyChart(
      GEO_OVERVIEW_CHART_TITLE,
      subtitle,
      GEO_CHART_EMPTY_OVERVIEW
    );
  }

  return {
    kind: "bar",
    title: GEO_OVERVIEW_CHART_TITLE,
    subtitle,
    segments,
  };
}

export function buildGeoTimeseriesChart(
  input: GeoTimeseriesChartInput
): ChartArtifact {
  const subtitle = geoChartWindowSubtitle(
    input.days,
    GEO_CHART_MENTION_RATE_SUBTITLE
  );
  const seriesByEngine = new Map<string, ChartSeries>();

  for (const point of input.points) {
    const name = chartEngineLabel(point.engine);
    const series = seriesByEngine.get(name) ?? { name, points: [] };
    series.points.push({
      x: point.day,
      y: toMentionRatePercent(point.mention_rate),
    });
    seriesByEngine.set(name, series);
  }

  const series = [...seriesByEngine.values()].filter((entry) =>
    entry.points.some((point) => point.y > 0)
  );

  if (series.length === 0) {
    return emptyChart(
      GEO_TIMESERIES_CHART_TITLE,
      subtitle,
      GEO_CHART_EMPTY_TIMESERIES
    );
  }

  return {
    kind: "area",
    title: GEO_TIMESERIES_CHART_TITLE,
    subtitle,
    series,
  };
}

export function buildGeoCompetitorShareChart(
  input: GeoCompetitorShareChartInput
): ChartArtifact {
  const subtitle = geoChartWindowSubtitle(
    input.days,
    GEO_CHART_MENTION_COUNT_SUBTITLE
  );
  const segments = input.competitors
    .map((competitor) => ({
      label: competitor.brand,
      value: competitor.mentions,
    }))
    .filter((segment) => segment.value > 0);

  if (segments.length === 0) {
    return emptyChart(
      GEO_COMPETITOR_SHARE_CHART_TITLE,
      subtitle,
      GEO_CHART_EMPTY_COMPETITORS
    );
  }

  return {
    kind: "pie",
    title: GEO_COMPETITOR_SHARE_CHART_TITLE,
    subtitle,
    segments,
  };
}
