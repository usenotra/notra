import { cn } from "@notra/ui/lib/utils";
import type { CSSProperties } from "react";

import {
  Connector,
  Diagram,
  Legend,
  Panel,
  Row,
} from "@/components/blog-diagrams/primitives";

const SWAPS = [
  { name: "Login", prod: "WorkOS", demo: "signed cookie" },
  { name: "Models", prod: "AI providers", demo: "fake model" },
  { name: "Analytics", prod: "Tinybird", demo: "generated" },
  { name: "Repos", prod: "GitHub App", demo: "fictional repo" },
] as const;

export function DemoDeploymentsDiagram() {
  return (
    <Diagram
      caption="Both deployments run the same code, and the demo swaps the service behind each choke point."
      label="One codebase, two deployments"
    >
      <div className="flex flex-col items-center">
        <Panel
          aside="dashboard + api"
          className="w-full sm:w-80"
          title="main"
        />
        <div className="hidden w-full sm:block">
          <div className="bg-border mx-auto h-5 w-px" />
          <div className="bg-border mx-auto h-px w-1/2" />
          <div className="mx-auto flex w-1/2 justify-between">
            <span className="bg-border h-5 w-px" />
            <span className="bg-primary h-5 w-px" />
          </div>
        </div>
        <div className="mt-4 grid w-full gap-4 sm:mt-0 sm:grid-cols-2">
          <Panel aside="Vercel" title="app.usenotra.com">
            {SWAPS.map((swap) => (
              <Row k={swap.name} key={swap.name} v={swap.prod} />
            ))}
          </Panel>
          <Panel accent aside="NOTRA_DEMO_MODE=1" title="demo.usenotra.com">
            {SWAPS.map((swap) => (
              <Row accent k={swap.name} key={swap.name} v={swap.demo} />
            ))}
          </Panel>
        </div>
      </div>
    </Diagram>
  );
}

export function DemoCookieDiagram() {
  return (
    <Diagram
      caption="Anyone can read the payload, but only the server can produce a valid signature for it."
      label="The notra_demo cookie"
    >
      <div className="border-border flex overflow-hidden rounded-xl border text-base">
        <span className="bg-card text-foreground min-w-0 flex-[1.4] truncate px-4 py-4">
          eyJhbm9ueW1vdXNJZCI6…
        </span>
        <span className="bg-muted text-muted-foreground border-border border-x px-3 py-4">
          .
        </span>
        <span className="bg-primary/10 text-primary min-w-0 flex-1 truncate px-4 py-4">
          Qm9xT1h3c2Vk…
        </span>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-[1.4fr_1fr]">
        <Panel aside="public" title="payload">
          <Row k="anonymousId" v="anon_k3J9…" />
          <Row k="encoding" v="base64url JSON" />
          <Row k="visible in" v="UI, API key metadata" />
        </Panel>
        <Panel accent aside="grants access" title="signature">
          <Row accent k="algorithm" v="HMAC-SHA256" />
          <Row accent k="check" v="timingSafeEqual" />
        </Panel>
      </div>
    </Diagram>
  );
}

const POOL_ROWS = [
  { id: "anon_k3J9…", note: "was pool_7Hc… · yours", state: "claimed" },
  { id: "pool_Q2mA…", note: "ready", state: "ready" },
  { id: "pool_x81L…", note: "ready", state: "ready" },
  { id: "pool_n4Tb…", note: "seeding", state: "refill" },
] as const;

export function DemoPoolDiagram() {
  return (
    <Diagram
      caption="Your first request claims a sandbox that was seeded earlier, which takes about 0.4 seconds."
      label="A first visit"
    >
      <Panel aside="no cookie" title="GET /api/demo/enter" />
      <Connector label="claim · FOR UPDATE SKIP LOCKED" step={1} />
      <Panel accent aside="~0.4 s" title="demo_sandboxes">
        {POOL_ROWS.map((row) => (
          <div
            className={cn(
              "my-1 flex items-center justify-between gap-4 rounded-md border px-3 py-2",
              row.state === "claimed"
                ? "border-primary/50 bg-primary/10 text-primary"
                : "border-border text-foreground",
              row.state === "refill"
                ? "text-muted-foreground border-dashed"
                : null
            )}
            key={row.id}
          >
            <span>{row.id}</span>
            <span
              className={
                row.state === "claimed"
                  ? "text-primary"
                  : "text-muted-foreground"
              }
            >
              {row.note}
            </span>
          </div>
        ))}
      </Panel>
      <Connector label="307 + signed cookie" step={2} />
      <Panel aside="your workspace" title="/demo-xxxx/geo" />
      <Legend>
        <span className="flex items-center gap-2">
          <span className="border-muted-foreground/60 size-3 rounded-sm border border-dashed" />
          refilled after the response, one refill at a time
        </span>
      </Legend>
    </Diagram>
  );
}

const TIMELINE_DAYS = 14;

interface TimelineRow {
  label: string;
  seeded: readonly number[];
  yours: number;
  scheduled: number;
  now: number;
}

const TIMELINE_ROWS: readonly TimelineRow[] = [
  {
    label: "Monday",
    seeded: [1, 2, 4, 6, 8],
    yours: 10,
    scheduled: 12,
    now: 10,
  },
  {
    label: "Tuesday",
    seeded: [2, 3, 5, 7, 9],
    yours: 10,
    scheduled: 13,
    now: 11,
  },
];

function TimelineCell({ row, day }: { row: TimelineRow; day: number }) {
  const isSeeded = row.seeded.includes(day);
  const isYours = row.yours === day;
  const isScheduled = row.scheduled === day;

  return (
    <span
      className={cn(
        "h-10 rounded-xs sm:h-12",
        isSeeded ? "bg-primary" : null,
        isYours ? "bg-foreground" : null,
        isScheduled ? "border-primary border-2" : null,
        isSeeded || isYours || isScheduled
          ? null
          : "border-border border border-dashed"
      )}
    />
  );
}

export function DemoRebaseDiagram() {
  return (
    <Diagram
      caption="On a new day, seeded events and scheduled posts move forward by the time since the anchor, and your own post keeps its timestamp."
      label="Rebase on a new local day"
    >
      <div className="space-y-8">
        {TIMELINE_ROWS.map((row) => (
          <div
            className="grid gap-3 sm:grid-cols-[7rem_1fr] sm:items-end"
            key={row.label}
          >
            <span className="text-foreground sm:pb-3">{row.label}</span>
            <div
              className="relative"
              style={
                {
                  "--now": `${(row.now / TIMELINE_DAYS) * 100}%`,
                } as CSSProperties
              }
            >
              <div className="text-foreground absolute -top-6 left-(--now) pl-2 text-xs whitespace-nowrap">
                now
              </div>
              <div className="bg-foreground absolute -top-1 -bottom-1 left-[calc(var(--now)+1px)] w-px" />
              <div className="grid grid-cols-14 gap-1">
                {Array.from({ length: TIMELINE_DAYS }, (_, index) => (
                  <TimelineCell day={index + 1} key={index} row={row} />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
      <Legend>
        <span className="flex items-center gap-2">
          <span className="bg-primary size-3 rounded-sm" />
          seeded event
        </span>
        <span className="flex items-center gap-2">
          <span className="bg-foreground size-3 rounded-sm" />
          your post
        </span>
        <span className="flex items-center gap-2">
          <span className="border-primary size-3 rounded-sm border-2" />
          scheduled post
        </span>
        <span className="opacity-60">1 cell = 1 day</span>
      </Legend>
    </Diagram>
  );
}

const SOURCES = ["curl", "notra CLI", "dashboard console"] as const;

const FEED = [
  {
    method: "POST",
    path: "/v1/posts",
    status: 201,
    source: "curl",
    when: "now",
  },
  { method: "GET", path: "/v1/posts", status: 200, source: "cli", when: "2m" },
  {
    method: "PATCH",
    path: "/v1/posts/…",
    status: 200,
    source: "ui",
    when: "5m",
  },
] as const;

export function DemoApiFlowDiagram() {
  return (
    <Diagram
      caption="A post created with curl appears in the open dashboard, together with the request that created it."
      label="One request, live in the dashboard"
    >
      <div className="grid gap-3 sm:grid-cols-3">
        {SOURCES.map((source) => (
          <Panel key={source} title={source} />
        ))}
      </div>
      <Connector label="POST /v1/posts · Bearer notra_demo_…" step={1} />
      <Panel aside="apps/api" title="demo-api.usenotra.com">
        <Row k="key" v="Unkey, separate workspace" />
        <Row k="limit" v="60 req/min" />
        <Row k="writes" v="post + demo_request_log" />
      </Panel>
      <Connector label="Upstash Realtime · demo:<orgId>" step={2} />
      <Panel accent aside="live" title="Dashboard · API feed">
        {FEED.map((entry, index) => (
          <div
            className={cn(
              "grid grid-cols-[3.5rem_1fr_auto] items-baseline gap-3 py-1.5",
              index === 0 ? "text-primary" : "text-muted-foreground"
            )}
            key={`${entry.method}-${entry.path}-${entry.when}`}
          >
            <span>{entry.method}</span>
            <span className={index === 0 ? "text-primary" : "text-foreground"}>
              {entry.path}
            </span>
            <span>
              {entry.status} · {entry.source} · {entry.when}
            </span>
          </div>
        ))}
      </Panel>
    </Diagram>
  );
}
