import type { GeoSearchGapEvidenceProps } from "@/types/components/geo-gaps";
import { formatCount, formatPercent } from "@/utils/format";

export function SearchGapEvidence({ gap }: GeoSearchGapEvidenceProps) {
  if (gap.source === "scan") {
    return (
      <section className="bg-background min-w-0 overflow-hidden rounded-xl border">
        <div className="bg-muted/70 border-b px-4 py-3">
          <h3 className="text-sm font-medium">Observed research queries</h3>
          <p className="text-muted-foreground mt-1 text-xs">
            These queries came from AI research during your scans. They do not
            measure user demand.
          </p>
        </div>
        <ul className="divide-y">
          {gap.scanEvidence.map((item) => (
            <li
              className="space-y-2 p-4 text-sm wrap-anywhere"
              key={`${item.checkId}:${item.query}`}
            >
              <p className="font-medium">{item.query}</p>
              <p>
                <span className="text-muted-foreground">Origin prompt: </span>
                {item.prompt}
              </p>
              <p className="text-muted-foreground text-xs">
                {item.engine} · {item.language} ·{" "}
                <time dateTime={item.capturedAt}>
                  {item.capturedAt.slice(0, 16).replace("T", " ")} UTC
                </time>
              </p>
              <p className="text-muted-foreground text-xs">
                Scan {item.scanId}
              </p>
            </li>
          ))}
        </ul>
      </section>
    );
  }
  const ctr =
    gap.impressions !== null && gap.impressions > 0 && gap.clicks !== null
      ? (gap.clicks / gap.impressions) * 100
      : null;
  return (
    <section className="bg-background min-w-0 overflow-hidden rounded-xl border">
      <div className="bg-muted/70 border-b px-4 py-3">
        <h3 className="text-sm font-medium">Search performance</h3>
      </div>
      <dl className="grid grid-cols-2 gap-5 p-4 sm:grid-cols-4">
        <div className="space-y-1">
          <dt className="text-muted-foreground text-xs">Impressions</dt>
          <dd className="text-xl font-medium tabular-nums">
            {gap.impressions === null ? "—" : formatCount(gap.impressions)}
          </dd>
        </div>
        <div className="space-y-1">
          <dt className="text-muted-foreground text-xs">Clicks</dt>
          <dd className="text-xl font-medium tabular-nums">
            {gap.clicks === null ? "—" : formatCount(gap.clicks)}
          </dd>
        </div>
        <div className="space-y-1">
          <dt className="text-muted-foreground text-xs">Click-through rate</dt>
          <dd className="text-xl font-medium tabular-nums">
            {ctr === null ? "—" : `${formatPercent(ctr)}%`}
          </dd>
        </div>
        <div className="space-y-1">
          <dt className="text-muted-foreground text-xs">Avg. position</dt>
          <dd className="text-xl font-medium tabular-nums">
            {gap.position === null ? "—" : `#${gap.position.toFixed(1)}`}
          </dd>
        </div>
      </dl>
      <p className="text-muted-foreground px-4 pb-4 text-xs">
        Across this gap's Google Search queries.
      </p>
    </section>
  );
}
