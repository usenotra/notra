"use client";

import { InstrumentGrid } from "@notra/ui/components/instrument/instrument-grid";
import {
  InstrumentEmpty,
  InstrumentModule,
  InstrumentSection,
} from "@notra/ui/components/instrument/instrument-module";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@notra/ui/components/ui/card";
import type { CSSProperties } from "react";

import { Button } from "@/components/button";
import { DesignSystemSectionHeader } from "@/components/design-system/design-system-section-header";

const SAMPLE_ENGINES = [
  { name: "ChatGPT", rate: 64 },
  { name: "Perplexity", rate: 48 },
  { name: "Gemini", rate: 31 },
  { name: "Claude", rate: 22 },
] as const;

const SAMPLE_STATS = [
  { label: "Mention rate", value: "41%", readout: "+6 pts" },
  { label: "Average position", value: "2.4", readout: "−0.3" },
  { label: "Cited pages", value: "128", readout: "+12" },
] as const;

function EngineRows() {
  return (
    <ul className="divide-border divide-y text-sm">
      {SAMPLE_ENGINES.map((engine) => (
        <li
          className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0"
          key={engine.name}
        >
          <span className="text-foreground">{engine.name}</span>
          <span className="text-muted-foreground tabular-nums">
            {engine.rate}%
          </span>
        </li>
      ))}
    </ul>
  );
}

function EngineBars() {
  return (
    <div className="space-y-3">
      {SAMPLE_ENGINES.map((engine) => (
        <div className="space-y-1.5" key={engine.name}>
          <div className="flex items-center justify-between text-xs">
            <span className="text-foreground">{engine.name}</span>
            <span className="text-muted-foreground tabular-nums">
              {engine.rate}%
            </span>
          </div>
          <div className="bg-muted h-1.5 overflow-hidden rounded-full">
            <div
              className="bg-primary h-full w-(--bar-width) rounded-full"
              style={{ "--bar-width": `${engine.rate}%` } as CSSProperties}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function InstrumentModuleSection() {
  return (
    <section className="scroll-mt-10 space-y-6" id="instrument-module">
      <DesignSystemSectionHeader
        description="Shared metric module from @notra/ui used across GEO and analytics. Flat is a plain card, panel and table sit inside the dualtone shell. The hint tooltip's accessible name comes from the UI labels."
        id="instrument-module"
        title="Instrument Module"
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Flat</CardTitle>
            <CardDescription>
              The default. Eyebrow, readout and action share one header row.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InstrumentModule
              action={
                <Button size="xs" variant="outline">
                  View all
                </Button>
              }
              eyebrow="Mention rate by engine"
              hint="Share of answers that name your brand, per engine."
              readout="Last 30 days"
            >
              <EngineBars />
            </InstrumentModule>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Panel</CardTitle>
            <CardDescription>
              Dualtone shell with a tall header and a lifted body. Supports a
              description line.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InstrumentModule
              description="Brands named across 312 answers"
              eyebrow="Share of voice"
              hint="Your mentions divided by all brand mentions."
              readout="312 answers"
              variant="panel"
            >
              <EngineBars />
            </InstrumentModule>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Table</CardTitle>
            <CardDescription>
              Compact dualtone header for lists and tables.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InstrumentModule
              eyebrow="Engines"
              hint="Mention rate per engine over the selected range."
              readout="4 engines"
              variant="table"
            >
              <EngineRows />
            </InstrumentModule>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Busy and empty</CardTitle>
            <CardDescription>
              InstrumentEmpty shows a spinner with shimmer text while busy, and
              an optional action once idle.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <InstrumentModule eyebrow="Sentiment" variant="table">
                <InstrumentEmpty
                  busy
                  className="min-h-40"
                  message="Scanning answers"
                />
              </InstrumentModule>
              <InstrumentModule eyebrow="Content gaps" variant="table">
                <InstrumentEmpty
                  action={
                    <Button size="xs" variant="outline">
                      Run a scan
                    </Button>
                  }
                  className="min-h-40"
                  message="No gaps yet"
                />
              </InstrumentModule>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Grid and section</CardTitle>
            <CardDescription>
              InstrumentSection is the unframed heading row; InstrumentGrid lays
              modules out with the shared gap.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InstrumentSection
              description="Compared with the previous 30 days"
              eyebrow="Overview"
              hint="Totals across every tracked prompt."
              readout="Updated 2 hours ago"
            >
              <InstrumentGrid className="grid-cols-1 sm:grid-cols-3">
                {SAMPLE_STATS.map((stat) => (
                  <InstrumentModule
                    eyebrow={stat.label}
                    key={stat.label}
                    readout={stat.readout}
                  >
                    <p className="text-foreground text-2xl font-medium tabular-nums">
                      {stat.value}
                    </p>
                  </InstrumentModule>
                ))}
              </InstrumentGrid>
            </InstrumentSection>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
